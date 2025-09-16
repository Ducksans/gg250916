#!/usr/bin/env node
/**
 * gg-memory-server.js — MCP custom server
 * Provides: checkpoint.append, memory.search(FTS5), ckpt.tail
 * Deps: npm i @modelcontextprotocol/sdk better-sqlite3
 */
/* eslint-disable no-console */
async function main() {
  // Lazy import to avoid runtime error before deps installed
  let sdk;
  try {
    sdk = await import('@modelcontextprotocol/sdk');
  } catch (e) {
    console.error('[gg-memory] Missing deps. Install: npm i @modelcontextprotocol/sdk better-sqlite3');
    process.exit(1);
  }

  const { Server } = sdk;
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/transport/node.js');
  const path = await import('path');
  const fs = await import('fs');

  // CLI args
  const argv = require('minimist')(process.argv.slice(2));
  const cwd = process.cwd();
  const dbPath = path.resolve(cwd, argv.db || 'status/data/gumgang.sqlite3');
  const ckptPath = path.resolve(cwd, argv.ckpt || 'status/checkpoints/CKPT_72H_RUN.jsonl');

  // DB open (optional). If it fails, memory.search returns empty gracefully.
  let Database, db = null;
  try {
    Database = (await import('better-sqlite3')).default;
    db = new Database(dbPath, { fileMustExist: true, readonly: true });
    db.pragma('journal_mode=WAL');
  } catch (e) {
    console.warn(`[gg-memory] SQLite not available at ${dbPath} (search will be best-effort): ${e.message}`);
  }

  const server = new Server({ name: 'gg-memory', version: '0.2.0' });

  // checkpoint.append — append-only write to JSONL
  server.tool('checkpoint.append', {
    description: 'Append a checkpoint record to CKPT jsonl (append-only)',
    inputSchema: {
      type: 'object',
      required: ['run_id', 'scope', 'decision', 'next_step', 'evidence'],
      properties: {
        run_id: { type: 'string' },
        scope: { type: 'string' },
        decision: { type: 'string' },
        next_step: { type: 'string' },
        evidence: { type: 'string' }
      }
    }
  }, async (input) => {
    const rec = JSON.stringify(input) + '\n';
    fs.writeFileSync(ckptPath, rec, { flag: 'a', encoding: 'utf-8' });
    return { ok: true, path: ckptPath };
  });

  // ckpt.tail — read last N lines from CKPT jsonl (safe)
  server.tool('ckpt.tail', {
    description: 'Return last N lines from checkpoint jsonl',
    inputSchema: { type: 'object', properties: { n: { type: 'integer' } } }
  }, async ({ n = 10 }) => {
    try {
      const data = fs.readFileSync(ckptPath, 'utf-8');
      const lines = data.split(/\r?\n/).filter(Boolean);
      return { ok: true, lines: lines.slice(-Math.max(1, Math.min(n, 200))) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });

  // memory.search — FTS over messages/threads (best-effort when DB missing)
  server.tool('memory.search', {
    description: 'Search messages/threads via FTS5 (best-effort if DB missing)',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        limit: { type: 'integer' },
        tier:  { type: 'integer' }
      }
    }
  }, async ({ query, limit = 5 }) => {
    if (!db) return { results: [] };
    try {
      // messages FTS
      const q1 = db.prepare(
        `SELECT m.id as id, m.thread_id as thread_id,
                substr(m.content, 1, 240) AS snippet,
                1.0/(bm25(messages_fts)+1e-6) AS score
           FROM messages_fts
           JOIN messages m ON m.id = messages_fts.rowid
          WHERE messages_fts MATCH ?
          LIMIT ?`
      );
      const r1 = q1.all(query, limit).map(x => ({
        type: 'message', id: String(x.id), thread_id: String(x.thread_id || ''), snippet: x.snippet || '', score: Number(x.score || 0)
      }));

      // threads FTS
      const q2 = db.prepare(
        `SELECT t.id as id, t.title as title,
                1.0/(bm25(threads_fts)+1e-6) AS score
           FROM threads_fts
           JOIN threads t ON t.id = threads_fts.rowid
          WHERE threads_fts MATCH ?
          LIMIT ?`
      );
      const r2 = q2.all(query, limit).map(x => ({
        type: 'thread', id: String(x.id), title: x.title || '', score: Number(x.score || 0)
      }));

      // merge and take top-k by score
      const merged = [...r1, ...r2]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, Math.max(1, Math.min(limit, 50)));
      return { results: merged };
    } catch (e) {
      console.warn('[gg-memory] search error:', e.message);
      return { results: [] };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => { console.error(e); process.exit(1); });
