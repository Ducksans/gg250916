#!/usr/bin/env python3
"""Sample PySpark job for Gumgang — verifies Spark session and simple compute.

Outputs a couple of lines to stdout:
  - Spark version
  - Count of a small DataFrame
"""
from __future__ import annotations

import sys


def main() -> int:
    try:
        from pyspark.sql import SparkSession
    except Exception as e:
        print(f"PySpark import failed: {e}", file=sys.stderr)
        return 2

    spark = (
        SparkSession.builder.master("local[*]").appName("gg-verify").getOrCreate()
    )
    try:
        print("Spark version:", spark.version)
        df = spark.createDataFrame([(1,), (2,), (3,), (4,)], ["x"]).cache()
        print("Row count:", df.count())
        print("Sum:", df.groupBy().sum("x").collect()[0][0])
        return 0
    finally:
        try:
            spark.stop()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())

