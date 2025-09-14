#!/usr/bin/env python3
"""
Migrate threads from migrated_chat_store.json to conversations/threads directory
"""
import json
import os
from pathlib import Path
from datetime import datetime

# Paths
PROJECT_ROOT = Path("/home/duksan/바탕화면/gumgang_meeting")
MIGRATED_FILE = PROJECT_ROOT / "migrated_chat_store.json"
THREADS_ROOT = PROJECT_ROOT / "conversations" / "threads"

def migrate_threads():
    """Convert migrated_chat_store.json to individual thread files"""
    
    # Read the migrated data
    print(f"Reading {MIGRATED_FILE}...")
    with open(MIGRATED_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    threads = data.get("threads", [])
    print(f"Found {len(threads)} threads to migrate")
    
    # Create threads directory structure
    THREADS_ROOT.mkdir(parents=True, exist_ok=True)
    
    # Use today's date for all migrated threads
    today = datetime.now().strftime("%Y%m%d")
    day_dir = THREADS_ROOT / today
    day_dir.mkdir(exist_ok=True)
    
    migrated_count = 0
    
    for thread in threads:
        thread_id = thread.get("id", "")
        if not thread_id:
            continue
            
        # Create JSONL file for this thread
        thread_file = day_dir / f"{thread_id}.jsonl"
        
        title = thread.get("title", "Untitled")
        messages = thread.get("messages", [])
        
        # Write each message as a JSON line
        with open(thread_file, "w", encoding="utf-8") as f:
            # Write metadata line
            meta = {
                "type": "meta",
                "title": title,
                "thread_id": thread_id,
                "created_at": thread.get("createdAt", ""),
                "updated_at": thread.get("updatedAt", "")
            }
            f.write(json.dumps(meta, ensure_ascii=False) + "\n")
            
            # Write each message as a turn
            for i, msg in enumerate(messages):
                turn = {
                    "type": "turn",
                    "turn": i + 1,
                    "role": msg.get("role", "user"),
                    "text": msg.get("content", ""),
                    "ts": msg.get("ts", msg.get("timestamp", "")),
                    "meta": msg.get("meta", {})
                }
                f.write(json.dumps(turn, ensure_ascii=False) + "\n")
        
        migrated_count += 1
        
        if migrated_count % 50 == 0:
            print(f"Migrated {migrated_count}/{len(threads)} threads...")
    
    print(f"✅ Migration complete! {migrated_count} threads migrated to {THREADS_ROOT}")
    return migrated_count

if __name__ == "__main__":
    migrate_threads()