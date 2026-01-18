"""Tests for authentication API endpoints."""
import pytest


class TestAuthRegistration:
    """Test user registration."""

    async def test_register_user(self, client):
        """Test successful user registration."""
        user_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "SecurePass123!",
            "full_name": "New User"
        }
        response = await client.post("/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        # Registration returns tokens, not user data
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    async def test_register_duplicate_email(self, client):
        """Test registration with existing email fails."""
        user_data = {
            "email": "duplicate@example.com",
            "username": "duplicate1",
            "password": "SecurePass123!",
            "full_name": "First User"
        }
        # Register first user
        await client.post("/api/auth/register", json=user_data)

        # Try to register with same email
        user_data["username"] = "duplicate2"
        response = await client.post("/api/auth/register", json=user_data)
        assert response.status_code == 400

    async def test_register_weak_password(self, client):
        """Test registration with weak password fails."""
        user_data = {
            "email": "weakpass@example.com",
            "username": "weakpass",
            "password": "123",
            "full_name": "Weak Pass User"
        }
        response = await client.post("/api/auth/register", json=user_data)
        assert response.status_code in [400, 422]

    async def test_register_invalid_email(self, client):
        """Test registration with invalid email fails."""
        user_data = {
            "email": "not-an-email",
            "username": "invalidemail",
            "password": "SecurePass123!",
            "full_name": "Invalid Email User"
        }
        response = await client.post("/api/auth/register", json=user_data)
        assert response.status_code == 422


class TestAuthLogin:
    """Test user login."""

    async def test_login_success(self, client):
        """Test successful login."""
        # Register user first
        register_data = {
            "email": "login@example.com",
            "username": "loginuser",
            "password": "SecurePass123!",
            "full_name": "Login User"
        }
        await client.post("/api/auth/register", json=register_data)

        # Login
        login_data = {
            "email": "login@example.com",
            "password": "SecurePass123!"
        }
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_wrong_password(self, client):
        """Test login with wrong password fails."""
        # Register user first
        register_data = {
            "email": "wrongpass@example.com",
            "username": "wrongpass",
            "password": "SecurePass123!",
            "full_name": "Wrong Pass User"
        }
        await client.post("/api/auth/register", json=register_data)

        # Try to login with wrong password
        login_data = {
            "email": "wrongpass@example.com",
            "password": "WrongPassword!"
        }
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401

    async def test_login_nonexistent_user(self, client):
        """Test login for non-existent user fails."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "SomePassword123!"
        }
        response = await client.post("/api/auth/login", json=login_data)
        assert response.status_code == 401


class TestAuthProfile:
    """Test user profile endpoints."""

    async def test_get_profile_authenticated(self, client, auth_headers):
        """Test getting profile when authenticated."""
        response = await client.get("/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "username" in data

    async def test_get_profile_unauthenticated(self, client):
        """Test getting profile without auth fails."""
        response = await client.get("/api/auth/me")
        assert response.status_code == 401

    async def test_get_profile_invalid_token(self, client):
        """Test getting profile with invalid token fails."""
        headers = {"Authorization": "Bearer invalid_token_here"}
        response = await client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401
