#!/usr/bin/env node
/**
 * web-fetch-server.js — MCP custom server (skeleton)
 * NOTE: Install deps before use:
 *   npm install @modelcontextprotocol/sdk node-fetch cheerio
 */
/* eslint-disable no-console */
async function main() {
  let sdk;
  try {
    sdk = await import('@modelcontextprotocol/sdk');
  } catch (e) {
    console.error('[web-fetch] Missing deps. Install: npm i @modelcontextprotocol/sdk node-fetch cheerio');
    process.exit(1);
  }
  const fetch = (await import('node-fetch')).default;
  const cheerio = (await import('cheerio')).default;
  const { Server } = sdk;
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/transport/node.js');
  const argv = require('minimist')(process.argv.slice(2));

  const allow = String(argv.allow || '').split(',').map(s => s.trim()).filter(Boolean);
  const maxBytes = Number(argv['max-bytes'] || 1_048_576);
  const timeoutMs = Number(argv['timeout-ms'] || 8000);

  function allowed(url) {
    try { const u = new URL(url); return allow.some(d => u.hostname.endsWith(d)); } catch { return false; }
  }

  const server = new Server({ name: 'web-fetch', version: '0.1.0' });

  server.tool('web.fetch', {
    description: 'Fetch a web page (text only, size/timeout/domain guarded) — skeleton',
    inputSchema: { type: 'object', required: ['url'], properties: { url: { type: 'string' } } }
  }, async ({ url }) => {
    if (!allowed(url)) return { ok: false, error: 'domain not allowed' };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > maxBytes) return { ok: false, error: 'size limit exceeded' };
    const html = buf.toString('utf-8');
    const $ = cheerio.load(html);
    $('script,style,noscript').remove();
    const text = $('body').text().replace(/\s+/g,' ').trim();
    return { ok: true, bytes: buf.length, text: text.slice(0, 20000) };
  });

  server.tool('web.scrape', {
    description: 'Scrape by CSS selector (attr optional) — skeleton',
    inputSchema: { type: 'object', required: ['url','selector'], properties: { url:{type:'string'}, selector:{type:'string'}, attr:{type:'string'} } }
  }, async ({ url, selector, attr }) => {
    if (!allowed(url)) return { ok: false, error: 'domain not allowed' };
    const res = await fetch(url); const html = await res.text();
    const $ = cheerio.load(html);
    const out = [];
    $(selector).each((_, el) => {
      out.push(attr ? ($(el).attr(attr) || '') : $(el).text().trim());
    });
    return { ok: true, count: out.length, results: out.slice(0, 100) };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
main().catch((e)=>{ console.error(e); process.exit(1); });

