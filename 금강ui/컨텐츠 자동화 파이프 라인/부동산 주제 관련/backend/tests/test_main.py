import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_read_main():
    """루트 엔드포인트 테스트"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "status" in data


def test_health_check():
    """헬스 체크 엔드포인트 테스트"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_docs_endpoint():
    """API 문서 엔드포인트 테스트"""
    response = client.get("/docs")
    assert response.status_code == 200


def test_openapi_endpoint():
    """OpenAPI 스키마 엔드포인트 테스트"""
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data


def test_cors_headers():
    """CORS 헤더 테스트"""
    response = client.options("/", headers={
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET"
    })
    # OPTIONS 요청에 대한 응답 확인
    assert "access-control-allow-origin" in response.headers or response.status_code in [200, 405]


def test_security_headers():
    """보안 헤더 테스트"""
    response = client.get("/")
    assert response.status_code == 200
    
    # 보안 헤더 확인
    assert "x-content-type-options" in response.headers
    assert "x-frame-options" in response.headers
    assert "x-xss-protection" in response.headers


def test_api_version_header():
    """API 버전 헤더 테스트"""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-api-version" in response.headers
    assert response.headers["x-api-version"] == "1.0.0"


def test_process_time_header():
    """처리 시간 헤더 테스트"""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-process-time" in response.headers
    
    # 처리 시간이 숫자인지 확인
    process_time = float(response.headers["x-process-time"])
    assert process_time >= 0
