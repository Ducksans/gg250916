{
  "content": [
    {
      "type": "text",
      "project_structure": "[DIR] #! [FILE] .ai_context [FILE] .backend.pid [FILE] .checkpoints.log [FILE] .cursorrules [FILE] ...",
      "rules": {
        "include": [
          "**/*.py",                // 모든 Python 코드
          "**/*.md",                // 문서, 규칙, 개발 로그
          "**/*.json",              // 설정 및 데이터
          "**/*.yml",               // YAML 설정 파일
          "**/*.yaml",              // YAML 설정 파일
          "**/*.sh",                // 쉘 스크립트 (빌드/배포/테스트)
          "requirements.txt",       // Python 의존성 목록
          "package.json",           // Node 프로젝트 메타데이터
          "project_structure.json", // MCP 구조 저장 파일
          ".rules",                 // 금강 규칙 파일
          ".rules.meta.json"        // 규칙 메타데이터
        ],
        "exclude": [
          "**/*.log",                // 로그 파일
          "**/*.pid",                // 프로세스 ID
          "**/__pycache__/**",       // Python 캐시
          "**/.pytest_cache/**",     // Pytest 캐시
          "**/.mypy_cache/**",       // Mypy 캐시
          "**/.git/**",              // Git 메타데이터
          "**/node_modules/**",      // Node 의존성 캐시
          "**/*.tmp",                // 임시 파일
          "**/*.db",                 // 로컬 데이터베이스
          "**/*.sqlite*",            // SQLite 데이터
          "**/dist/**",              // 빌드 산출물
          "**/build/**",             // 빌드 디렉토리
          "**/.DS_Store",            // macOS 메타 파일
          "**/Thumbs.db"             // Windows 메타 파일
        ]
      }
    }
  ]
}
