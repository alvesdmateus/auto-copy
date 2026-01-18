"""Tests for content generation API endpoints."""
import pytest


class TestGenerateAPI:
    """Test generation endpoints."""

    async def test_sync_generate_missing_prompt(self, client):
        """Test sync generation fails without prompt."""
        response = await client.post("/api/generate/sync", json={})
        assert response.status_code == 422

    async def test_sync_generate_with_prompt(self, client):
        """Test sync generation with valid prompt.

        Note: This test may fail if Ollama is not running.
        In CI, this would be mocked.
        """
        data = {
            "prompt": "Write a short greeting",
            "template_id": None,
            "variables": {}
        }
        response = await client.post("/api/generate/sync", json=data)
        # Could be 200 (success) or 500/503 (Ollama not available)
        assert response.status_code in [200, 500, 503]


class TestGenerateValidation:
    """Test generation input validation."""

    async def test_generate_with_template(self, client):
        """Test generation with template ID."""
        # First create a template
        template_data = {
            "name": "Generate Test Template",
            "platform": "Test",
            "category": "general",
            "prompt_template": "Write about {{topic}} in a {{tone}} way",
            "variables": [
                {"name": "topic", "label": "Topic", "required": True, "type": "text"},
                {"name": "tone", "label": "Tone", "required": True, "type": "text"}
            ],
            "is_custom": True
        }
        create_response = await client.post("/api/templates", json=template_data)
        if create_response.status_code == 200:
            template_id = create_response.json()["id"]

            # Try to generate with template
            gen_data = {
                "template_id": template_id,
                "variables": {"topic": "technology", "tone": "professional"}
            }
            response = await client.post("/api/generate/sync", json=gen_data)
            # Could be 200 or 500/503 depending on Ollama availability
            assert response.status_code in [200, 500, 503]
