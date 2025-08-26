🧠 금강 0.7 프로젝트 폴더 구조 안내
───────────────────────────────

본 문서는 금강 0.7 버전의 백엔드 프로젝트 구조를 설명하며, 각 폴더가 어떤 역할을 맡고 있는지를 명확하게 이해하기 위한 메타 문서입니다.

📁 backend/
├── app/               → [중추 뼈대]
│   ├── nodes/         → LangGraph 상태 노드 모음
│   ├── routes/        → FastAPI 라우터 정의
│   ├── ingest.py      → 기억 주입(인게스트) 기능
│   ├── graph.py       → 전체 LangGraph 실행 흐름
│   └── 기타 .py       → edit, memory 등 기능별 API

📁 memory/
├── gumgang_memory/    → [벡터 DB 저장소]
│   ├── chroma.sqlite3
│   ├── *.bin / *.pickle → LangChain+Chroma 자동 생성 파일
└── 역할: 금강의 장기 기억 (RAG 기반 검색용)

📁 data/
├── roadmap_gold.json      → 금강의 발전 로드맵 (단계별 목표)
├── core_identity.json     → 금강의 정체성과 철학
├── folder_structure.json  → 폴더 구조 인식용
├── file_summaries.json    → 주요 파일 요약 정보
└── 역할: 금강의 자기인식 및 설계도

📁 scripts/
├── *.sh, *.py → 테스트 및 서버 시작, 수동 실행 파일

📄 기타 주요 파일
├── main.py           → FastAPI 진입점
├── requirements.txt  → 의존성 목록
├── .env              → OpenAI 키 등 환경변수
├── backend_file_tree.txt → 폴더 구조 기록용
├── refactor_log_*.txt     → 리팩토링 이력 로그
└── .gitignore        → Git 관리 제외 파일 목록

───────────────────────────────
금강 0.7은 다음을 기준으로 작동합니다:

- FastAPI + LangGraph 기반 상태 흐름
- Chroma 기반 장기 기억 DB (벡터 임베딩)
- 덕산님의 철학을 반영한 자기인식 JSON 구조
- 정체성 기반 분기/응답 시스템 구축 완료

✳️ 다음 버전(0.8)부터는 프론트엔드와 완전 통합 및 시각화 강화 예정입니다.

📌 이 문서는 금강이 자기 자신의 구조를 설명하거나,
   외부 개발자/협력자가 전체 흐름을 파악할 수 있도록 안내합니다.
