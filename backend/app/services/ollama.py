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

    def build_variation_prompt(
        self,
        user_input: str,
        variation_num: int,
        template: str | None = None,
        tone: str | None = None,
    ) -> str:
        """Build prompt for generating a unique variation."""
        prompt_parts = [
            f"Generate variation #{variation_num} of marketing copy.",
            "Make this version distinctly different from others while keeping the same intent.",
        ]

        if template:
            prompt_parts.append(f"Template: {template}")

        if tone:
            tone_instructions = {
                "professional": "Write in a professional, formal tone.",
                "casual": "Write in a casual, friendly tone.",
                "persuasive": "Write in a persuasive, sales-oriented tone.",
                "informative": "Write in an informative, educational tone.",
                "urgent": "Write with urgency and FOMO.",
                "inspirational": "Write in an inspirational, motivational tone.",
            }
            prompt_parts.append(tone_instructions.get(tone, f"Tone: {tone}"))

        prompt_parts.append(f"Topic/Product: {user_input}")
        prompt_parts.append("Generate the copy now:")

        return "\n\n".join(prompt_parts)

    def build_refine_prompt(self, text: str, action: str) -> str:
        """Build prompt for refining existing copy."""
        action_prompts = {
            "improve": "Improve this copy to make it more engaging, compelling, and effective. Keep the same general message but enhance the writing quality.",
            "shorten": "Make this copy more concise. Remove unnecessary words and tighten the message while keeping the core meaning intact. Aim for at least 30% shorter.",
            "lengthen": "Expand this copy with more details, examples, or emotional appeal. Make it more comprehensive while keeping it engaging.",
            "punchier": "Make this copy punchier and more impactful. Use stronger verbs, shorter sentences, and more dynamic language. Add urgency.",
            "formal": "Rewrite this copy in a more formal, professional tone. Use proper business language while keeping the message clear.",
            "casual": "Rewrite this copy in a more casual, conversational tone. Make it feel friendly and approachable.",
        }

        instruction = action_prompts.get(action, f"Refine this copy to be more {action}.")

        return f"{instruction}\n\nOriginal copy:\n{text}\n\nRefined copy:"


def get_ollama_service() -> OllamaService:
    return OllamaService()
