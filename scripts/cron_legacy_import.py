#!/usr/bin/env python3
"""Nightly legacy thread import via /api/v2/threads/import."""
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / 'status/evidence/memory/legacy_threads_inventory_20250918T090532Z.txt'
PAYLOAD = ROOT / 'status/plans/legacy_threads_import_payload.json'
API_URL = 'http://127.0.0.1:8000/api/v2/threads/import'

def main():
    if not INVENTORY.exists():
        print('Inventory file missing:', INVENTORY)
        return
    if not PAYLOAD.exists():
        print('Payload file missing:', PAYLOAD)
        return
    body = PAYLOAD.read_text(encoding='utf-8')
    req = urllib.request.Request(API_URL, data=body.encode('utf-8'), method='POST')
    req.add_header('Content-Type', 'application/json')
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read().decode('utf-8', errors='replace')
        print(data)

if __name__ == '__main__':
    main()
