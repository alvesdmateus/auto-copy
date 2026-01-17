import httpx
import json
from typing import AsyncGenerator, Optional, Dict, Any, List
from app.config import get_settings


class BrandContext:
    """Context object for brand voice and persona information."""

    def __init__(
        self,
        brand: Optional[Dict[str, Any]] = None,
        persona: Optional[Dict[str, Any]] = None,
        custom_tone: Optional[Dict[str, Any]] = None,
    ):
        self.brand = brand
        self.persona = persona
        self.custom_tone = custom_tone

    def build_context_string(self) -> str:
        """Build a context string for prompt injection."""
        parts = []

        if self.brand:
            brand_parts = [f"BRAND VOICE: {self.brand.get('name', 'Unknown')}"]
            if self.brand.get('tone'):
                brand_parts.append(f"Tone: {self.brand['tone']}")
            if self.brand.get('voice_attributes'):
                brand_parts.append(f"Voice characteristics: {', '.join(self.brand['voice_attributes'])}")
            if self.brand.get('keywords'):
                brand_parts.append(f"Try to incorporate these keywords naturally: {', '.join(self.brand['keywords'])}")
            if self.brand.get('avoid_words'):
                brand_parts.append(f"NEVER use these words: {', '.join(self.brand['avoid_words'])}")
            if self.brand.get('voice_examples'):
                brand_parts.append("Example of brand voice:")
                for i, example in enumerate(self.brand['voice_examples'][:2], 1):  # Limit to 2 examples
                    brand_parts.append(f"  {i}. \"{example[:200]}...\"" if len(example) > 200 else f"  {i}. \"{example}\"")
            if self.brand.get('style_rules'):
                brand_parts.append("Style rules to follow:")
                for rule in self.brand['style_rules']:
                    brand_parts.append(f"  - {rule}")
            parts.append("\n".join(brand_parts))

        if self.persona:
            persona_parts = [f"TARGET AUDIENCE: {self.persona.get('name', 'Unknown')}"]
            if self.persona.get('description'):
                persona_parts.append(f"Description: {self.persona['description']}")
            if self.persona.get('age_range'):
                persona_parts.append(f"Age range: {self.persona['age_range']}")
            if self.persona.get('occupation'):
                persona_parts.append(f"Occupation: {self.persona['occupation']}")
            if self.persona.get('pain_points'):
                persona_parts.append(f"Their pain points: {', '.join(self.persona['pain_points'])}")
            if self.persona.get('goals'):
                persona_parts.append(f"Their goals: {', '.join(self.persona['goals'])}")
            if self.persona.get('values'):
                persona_parts.append(f"They value: {', '.join(self.persona['values'])}")
            if self.persona.get('communication_style'):
                persona_parts.append(f"They prefer: {self.persona['communication_style']} communication")
            if self.persona.get('language_level'):
                persona_parts.append(f"Language level: {self.persona['language_level']}")
            parts.append("\n".join(persona_parts))

        if self.custom_tone:
            tone_parts = [f"CUSTOM TONE: {self.custom_tone.get('name', 'Unknown')}"]
            if self.custom_tone.get('description'):
                tone_parts.append(f"Description: {self.custom_tone['description']}")
            if self.custom_tone.get('style_instructions'):
                tone_parts.append(f"Style: {self.custom_tone['style_instructions']}")
            # Add formality/energy/humor as descriptors
            formality = self.custom_tone.get('formality', 50)
            energy = self.custom_tone.get('energy', 50)
            humor = self.custom_tone.get('humor', 0)
            descriptors = []
            if formality < 30:
                descriptors.append("very casual")
            elif formality > 70:
                descriptors.append("very formal")
            if energy > 70:
                descriptors.append("high energy")
            elif energy < 30:
                descriptors.append("calm and measured")
            if humor > 50:
                descriptors.append("with humor")
            if descriptors:
                tone_parts.append(f"Characteristics: {', '.join(descriptors)}")
            parts.append("\n".join(tone_parts))

        return "\n\n".join(parts)


class OllamaService:
    def __init__(self):
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model

    async def list_models(self) -> List[Dict[str, Any]]:
        """List all available Ollama models."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            data = response.json()
            return data.get("models", [])

    async def get_model_info(self, model_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific model."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/show",
                json={"name": model_name},
            )
            response.raise_for_status()
            return response.json()

    async def generate_stream(
        self, prompt: str, model: Optional[str] = None, images: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """Generate text using Ollama with streaming response."""
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "stream": True,
        }
        if images:
            payload["images"] = images

        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
                        if data.get("done", False):
                            break

    async def generate(
        self, prompt: str, model: Optional[str] = None, images: Optional[List[str]] = None
    ) -> str:
        """Generate text using Ollama (non-streaming)."""
        payload = {
            "model": model or self.model,
            "prompt": prompt,
            "stream": False,
        }
        if images:
            payload["images"] = images

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "")

    def build_prompt(
        self,
        user_input: str,
        template: str | None = None,
        tone: str | None = None,
        brand_context: Optional[BrandContext] = None,
    ) -> str:
        """Build the final prompt with template, tone, and brand context."""
        prompt_parts = []

        # Add brand/persona context first if provided
        if brand_context:
            context_str = brand_context.build_context_string()
            if context_str:
                prompt_parts.append(context_str)

        if template:
            prompt_parts.append(f"Template: {template}")

        # Only add tone instructions if not using custom tone from brand_context
        if tone and (not brand_context or not brand_context.custom_tone):
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
        brand_context: Optional[BrandContext] = None,
    ) -> str:
        """Build prompt for generating a unique variation."""
        prompt_parts = [
            f"Generate variation #{variation_num} of marketing copy.",
            "Make this version distinctly different from others while keeping the same intent.",
        ]

        # Add brand/persona context if provided
        if brand_context:
            context_str = brand_context.build_context_string()
            if context_str:
                prompt_parts.insert(0, context_str)

        if template:
            prompt_parts.append(f"Template: {template}")

        if tone and (not brand_context or not brand_context.custom_tone):
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

    def build_ab_test_prompt(
        self,
        user_input: str,
        version: str,
        template: str | None = None,
        tone: str | None = None,
        brand_context: Optional[BrandContext] = None,
    ) -> str:
        """Build prompt for A/B test copy generation."""
        version_styles = {
            "A": "Focus on BENEFITS and emotional appeal. Lead with the transformation or outcome the user will experience.",
            "B": "Focus on FEATURES and logical appeal. Lead with specific capabilities, numbers, or proof points.",
        }

        prompt_parts = [
            f"Generate Version {version} of marketing copy for A/B testing.",
            version_styles.get(version, ""),
            "Make this version distinct and testable against the other version.",
        ]

        # Add brand/persona context if provided
        if brand_context:
            context_str = brand_context.build_context_string()
            if context_str:
                prompt_parts.insert(0, context_str)

        if template:
            prompt_parts.append(f"Template: {template}")

        if tone and (not brand_context or not brand_context.custom_tone):
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
        prompt_parts.append(f"Generate Version {version} copy now:")

        return "\n\n".join(prompt_parts)

    def build_refine_prompt_with_brand(
        self, text: str, action: str, brand_context: Optional[BrandContext] = None
    ) -> str:
        """Build prompt for refining existing copy with brand context."""
        action_prompts = {
            "improve": "Improve this copy to make it more engaging, compelling, and effective. Keep the same general message but enhance the writing quality.",
            "shorten": "Make this copy more concise. Remove unnecessary words and tighten the message while keeping the core meaning intact. Aim for at least 30% shorter.",
            "lengthen": "Expand this copy with more details, examples, or emotional appeal. Make it more comprehensive while keeping it engaging.",
            "punchier": "Make this copy punchier and more impactful. Use stronger verbs, shorter sentences, and more dynamic language. Add urgency.",
            "formal": "Rewrite this copy in a more formal, professional tone. Use proper business language while keeping the message clear.",
            "casual": "Rewrite this copy in a more casual, conversational tone. Make it feel friendly and approachable.",
        }

        instruction = action_prompts.get(action, f"Refine this copy to be more {action}.")

        prompt_parts = []

        if brand_context:
            context_str = brand_context.build_context_string()
            if context_str:
                prompt_parts.append(context_str)
                prompt_parts.append("Maintain the brand voice while making these improvements:")

        prompt_parts.append(instruction)
        prompt_parts.append(f"\nOriginal copy:\n{text}\n\nRefined copy:")

        return "\n\n".join(prompt_parts)


def get_ollama_service() -> OllamaService:
    return OllamaService()
