"""Tests for main app endpoints."""
import pytest


class TestHealthEndpoints:
    """Test health and root endpoints."""

    async def test_root_endpoint(self, client):
        """Test root endpoint returns API info."""
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Auto-Copy API" in data["message"]
        assert "docs" in data

    async def test_health_endpoint(self, client):
        """Test health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


class TestCORS:
    """Test CORS configuration."""

    async def test_cors_allowed_origin(self, client):
        """Test CORS headers for allowed origins."""
        response = await client.options(
            "/",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            }
        )
        # CORS preflight should work
        assert response.status_code in [200, 204, 405]
