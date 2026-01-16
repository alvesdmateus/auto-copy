import httpx
import json
from typing import AsyncGenerator
from app.config import get_settings


class OllamaService:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def generate_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Generate text using Ollama with streaming response."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": True,
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
                        if data.get("done", False):
                            break

    async def generate(self, prompt: str) -> str:
        """Generate text using Ollama (non-streaming)."""
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    def build_prompt(
        self,
        user_input: str,
        template: str | None = None,
        tone: str | None = None,
    ) -> str:
        """Build the final prompt with template and tone."""
        prompt_parts = []

        if template:
            prompt_parts.append(f"Template: {template}")

        if tone:
            tone_instructions = {
                "professional": "Write in a professional, formal tone suitable for business communication.",
                "casual": "Write in a casual, friendly tone that feels approachable and relatable.",
                "persuasive": "Write in a persuasive, sales-oriented tone that encourages action.",
                "informative": "Write in an informative, educational tone that explains clearly.",
                "urgent": "Write with urgency and FOMO (fear of missing out) to create immediate action.",
                "inspirational": "Write in an inspirational, motivational tone that uplifts and empowers.",
            }
            prompt_parts.append(tone_instructions.get(tone, f"Tone: {tone}"))

        prompt_parts.append(f"Topic/Product: {user_input}")
        prompt_parts.append("Generate the copy now:")

        return "\n\n".join(prompt_parts)


def get_ollama_service() -> OllamaService:
    return OllamaService()
