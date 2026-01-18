"""Tests for history API endpoints."""
import pytest


class TestHistoryAPI:
    """Test generation history endpoints."""

    async def test_list_history_empty(self, client):
        """Test listing history when empty."""
        response = await client.get("/api/history")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_list_history_with_pagination(self, client):
        """Test listing history with pagination params."""
        response = await client.get("/api/history?skip=0&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10

    async def test_delete_nonexistent_history(self, client):
        """Test deleting a history item that doesn't exist."""
        response = await client.delete("/api/history/99999")
        assert response.status_code == 404

    async def test_toggle_favorite_nonexistent(self, client):
        """Test toggling favorite on non-existent item."""
        response = await client.post("/api/history/99999/favorite")
        assert response.status_code == 404


class TestHistoryFiltering:
    """Test history filtering and search."""

    async def test_filter_history_by_favorites(self, client):
        """Test filtering history to only favorites."""
        response = await client.get("/api/history?favorites_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_search_history(self, client):
        """Test searching history by prompt."""
        response = await client.get("/api/history?search=test")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
