"""Tests for templates API endpoints."""
import pytest


class TestTemplatesAPI:
    """Test template endpoints."""

    async def test_list_templates(self, client):
        """Test listing all templates."""
        response = await client.get("/api/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_create_template(self, client):
        """Test creating a custom template."""
        template_data = {
            "name": "Test Template",
            "platform": "Test",
            "category": "general",
            "description": "A test template",
            "prompt_template": "Write about {{topic}}",
            "variables": [
                {
                    "name": "topic",
                    "label": "Topic",
                    "placeholder": "Enter topic",
                    "required": True,
                    "type": "text"
                }
            ],
            "is_custom": True
        }
        response = await client.post("/api/templates", json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Test Template"
        assert data["is_custom"] is True

    async def test_get_template_by_id(self, client):
        """Test getting a template by ID."""
        # First create a template
        template_data = {
            "name": "Get By ID Test",
            "platform": "Test",
            "category": "general",
            "prompt_template": "Test prompt {{var}}",
            "variables": [],
            "is_custom": True
        }
        create_response = await client.post("/api/templates", json=template_data)
        assert create_response.status_code == 200
        template_id = create_response.json()["id"]

        # Get by ID
        response = await client.get(f"/api/templates/{template_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == template_id
        assert data["name"] == "Get By ID Test"

    async def test_get_nonexistent_template(self, client):
        """Test getting a template that doesn't exist."""
        response = await client.get("/api/templates/99999")
        assert response.status_code == 404

    async def test_filter_templates_by_category(self, client):
        """Test filtering templates by category."""
        response = await client.get("/api/templates?category=social")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned templates should be in the social category
        for template in data:
            assert template["category"] == "social"

    async def test_delete_template(self, client):
        """Test deleting a custom template."""
        # Create a template first
        template_data = {
            "name": "To Delete",
            "platform": "Test",
            "category": "general",
            "prompt_template": "Delete me {{var}}",
            "variables": [],
            "is_custom": True
        }
        create_response = await client.post("/api/templates", json=template_data)
        template_id = create_response.json()["id"]

        # Delete it
        response = await client.delete(f"/api/templates/{template_id}")
        assert response.status_code == 200

        # Verify it's gone
        get_response = await client.get(f"/api/templates/{template_id}")
        assert get_response.status_code == 404
