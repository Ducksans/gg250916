---
timestamp:
  utc: 2025-09-18T10:55Z
  kst: 2025-09-18 19:55
author: Codex (AI Agent)
summary: 금강 PySpark 실행 환경 구축 및 재사용 절차
document_type: plan
stage: stage2
DOCS_TIME_SPEC: GG_TIME_SPEC_V1
---

# PySpark Environment Setup

## 구성 요소
- Python venv (`venv/`)
- PySpark 4.0.1 (`pip install pyspark`)
- Embedded JDK (`tools/java/jdk-17.0.11+9`)

## 실행 절차
```bash
source venv/bin/activate
export JAVA_HOME=$PWD/tools/java/jdk-17.0.11+9
export PATH="$JAVA_HOME/bin:$PATH"
python - <<'PY'
from pyspark.sql import SparkSession
spark = SparkSession.builder.master('local[*]').appName('verify').getOrCreate()
print('Spark version:', spark.version)
spark.stop()
PY
```

## TODO
- [ ] 위 스크립트를 `scripts/dev_pyspark_env.sh` 형태로 래핑
- [ ] Stage 2 Planner/Executor에서 PySpark 세션 호출 실험
- [ ] README 및 Control Tower 문서에 PySpark 사용 시나리오 추가 (완료)

## 참고
- JAVA_HOME/ PATH 환경 변수는 세션 단위로 설정하거나, VS Code 터미널 프로파일에 추가할 수 있습니다.
