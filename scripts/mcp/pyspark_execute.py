#!/usr/bin/env python3
"""MCP wrapper to run a PySpark script and capture output.

Usage:
  python scripts/mcp/pyspark_execute.py path/to/job.py
"""
from __future__ import annotations
import os
import subprocess
import sys
from pathlib import Path

# Repo root: .../gumgang_meeting
PROJECT_ROOT = Path(__file__).resolve().parents[2]


def main(argv: list[str]) -> int:
    if not argv:
        print("Usage: pyspark_execute.py <script.py>", file=sys.stderr)
        return 2
    job = Path(argv[0])
    if not job.exists():
        print(f"Job script not found: {job}", file=sys.stderr)
        return 1

    env = os.environ.copy()
    env.setdefault('JAVA_HOME', str(PROJECT_ROOT / 'tools' / 'java' / 'jdk-17.0.11+9'))
    env.setdefault('PYSPARK_PYTHON', sys.executable)
    env['PATH'] = f"{env['JAVA_HOME']}/bin:" + env.get('PATH', '')

    cmd = [sys.executable, str(job)]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)
        sys.stdout.write(result.stdout)
        sys.stderr.write(result.stderr)
        return 0
    except subprocess.CalledProcessError as exc:
        sys.stdout.write(exc.stdout or '')
        sys.stderr.write(exc.stderr or '')
        return exc.returncode


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
