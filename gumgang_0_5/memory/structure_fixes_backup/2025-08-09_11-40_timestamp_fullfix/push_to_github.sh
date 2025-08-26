# 경로: ~/바탕화면/gumgang_0_5/backup/push_to_github.sh
# 역할: 금강 전체 프로젝트를 GitHub로 자동 푸시 (토큰 인증 포함)

cd ~/바탕화면/gumgang_0_5

# 1. 환경변수 로드
source backend/.env

# 2. 환경변수 확인 (기초 검증)
if [[ -z "$GITHUB_TOKEN" || -z "$GITHUB_USERNAME" || -z "$GITHUB_REPO" ]]; then
  echo "❌ .env 파일에 GITHUB_TOKEN / GITHUB_USERNAME / GITHUB_REPO 값이 설정되어야 합니다."
  exit 1
fi

# 3. Git 초기화 (필요시)
git init

# 4. 기본 무시 파일 추가 (선택)
echo -e ".venv/\n.env\n__pycache__/\nnode_modules/\n*.zip\n.vscode/\nbackup/\n" > .gitignore

# 5. GitHub 토큰 기반 원격 주소 설정
git remote remove origin 2>/dev/null
git remote add origin https://$GITHUB_TOKEN@github.com/$GITHUB_USERNAME/$GITHUB_REPO.git

# 6. 브랜치 설정 및 커밋
git add .
git commit -m "🧠 금강 v0.8 자동 백업 커밋 - $(date +'%Y-%m-%d %H:%M:%S')"
git branch -M main

# 7. 푸시
git push -u origin main

echo "✅ GitHub 백업 완료: https://github.com/$GITHUB_USERNAME/$GITHUB_REPO"
