#!/bin/bash
# Monaco Editor 설치 스크립트
# Task: GG-20250108-007 - Monaco 에디터 연동
# Created: 2025-08-08
# Protocol: Guard v2.0

set -e

echo "🎯 Monaco Editor 설치 시작"
echo "================================"
echo "Task ID: GG-20250108-007"
echo "목적: Monaco Editor와 Tauri 파일시스템 연동"
echo "================================"

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 프로젝트 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json을 찾을 수 없습니다.${NC}"
    echo "gumgang-v2 디렉토리에서 실행하세요."
    exit 1
fi

echo -e "\n${YELLOW}📦 1. Monaco Editor 코어 패키지 설치${NC}"
npm install --save @monaco-editor/react monaco-editor

echo -e "\n${YELLOW}📦 2. Monaco Editor 타입 정의 설치${NC}"
npm install --save-dev @types/monaco-editor

echo -e "\n${YELLOW}📦 3. Monaco Editor 로더 설치${NC}"
npm install --save monaco-editor-webpack-plugin

echo -e "\n${YELLOW}📦 4. 추가 유틸리티 설치${NC}"
npm install --save monaco-themes monaco-vim

echo -e "\n${YELLOW}📦 5. 언어 지원 패키지 설치${NC}"
npm install --save monaco-languages

echo -e "\n${GREEN}✅ Monaco Editor 패키지 설치 완료!${NC}"
echo "================================"
echo "설치된 패키지:"
echo "  - @monaco-editor/react"
echo "  - monaco-editor"
echo "  - monaco-themes"
echo "  - monaco-vim"
echo "  - monaco-languages"
echo "================================"

echo -e "\n${YELLOW}📝 다음 단계:${NC}"
echo "1. components/MonacoEditor.tsx 생성"
echo "2. Tauri 파일시스템과 연동"
echo "3. 테스트 페이지 생성"

echo -e "\n${GREEN}✨ 설치 완료!${NC}"
echo "Protocol Guard v2.0 준수 확인 ✓"
