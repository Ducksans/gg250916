# 금강 2.0 - 프론트엔드 Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build Stage
FROM node:18-alpine AS builder

# 작업 디렉토리 설정
WORKDIR /app

# 패키지 파일 복사 (캐싱 최적화)
COPY package*.json ./
COPY yarn.lock* ./

# 의존성 설치
RUN npm ci --only=production && \
    npm cache clean --force

# 개발 의존성 설치 (빌드용)
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force

# 소스 코드 복사
COPY . .

# 환경 변수 설정
ARG REACT_APP_API_URL
ARG REACT_APP_WS_URL
ARG REACT_APP_ENV=production

ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}
ENV REACT_APP_ENV=${REACT_APP_ENV}

# 빌드 실행
RUN npm run build

# Stage 2: Production Stage
FROM nginx:alpine

# 메타데이터
LABEL maintainer="dev@gumgang.com"
LABEL version="2.0.0"
LABEL description="금강 2.0 프론트엔드"

# nginx 사용자로 실행 (보안)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# nginx 설정 복사
COPY --from=builder /app/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/nginx-default.conf /etc/nginx/conf.d/default.conf

# 빌드된 파일 복사
COPY --from=builder --chown=nginx:nginx /app/build /usr/share/nginx/html

# 헬스체크 스크립트
COPY --from=builder /app/docker-healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# 포트 노출
EXPOSE 80 443

# 헬스체크 설정
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh || exit 1

# nginx 사용자로 전환
USER nginx

# nginx 시작 (foreground)
CMD ["nginx", "-g", "daemon off;"]
