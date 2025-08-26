#!/bin/bash

echo "🔧 금강 .py 파일 최신 LangChain/LangGraph 문법 리팩토링 시작..."

TARGET_DIR=~/바탕화면/gumgang_0_5/backend
LOG_FILE="$TARGET_DIR/refactor_log_$(date +%Y%m%d_%H%M%S).txt"

# 1. Embedding 모듈 경로 수정
find $TARGET_DIR -name "*.py" -exec sed -i 's/from langchain import OpenAIEmbeddings/from langchain_openai import OpenAIEmbeddings/g' {} \;

# 2. Chroma 모듈 경로 수정
find $TARGET_DIR -name "*.py" -exec sed -i 's/from langchain.vectorstores import Chroma/from langchain_community.vectorstores import Chroma/g' {} \;

# 3. ChatOpenAI 모듈 경로 수정
find $TARGET_DIR -name "*.py" -exec sed -i 's/from langchain.chat_models import ChatOpenAI/from langchain_openai import ChatOpenAI/g' {} \;

# 4. 기타 비슷한 경로 수정 (예: from langchain.llms)
find $TARGET_DIR -name "*.py" -exec sed -i 's/from langchain.llms import OpenAI/from langchain_openai import OpenAI/g' {} \;

# 5. 로그 출력
echo "✅ 리팩토링 완료. 변경된 .py 파일 경로:" > $LOG_FILE
grep -rl "langchain_openai" $TARGET_DIR >> $LOG_FILE
grep -rl "langchain_community" $TARGET_DIR >> $LOG_FILE

echo "📝 로그 저장 위치: $LOG_FILE"
echo "🎯 금강 리팩토링 적용 완료! 필요 시 LangGraph 구조 확인 후 추가 수정 가능."
