from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import re
from typing import Dict, Optional

from app.database import get_db
from app.models import Generation, Template, Brand, Persona, CustomTone
from app.schemas import GenerateRequest, VariationsRequest, RefineRequest, ABTestRequest
from app.services.ollama import get_ollama_service, OllamaService, BrandContext

router = APIRouter(prefix="/api/generate", tags=["generate"])


async def get_brand_context(
    db: AsyncSession,
    brand_id: Optional[int] = None,
    persona_id: Optional[int] = None,
) -> Optional[BrandContext]:
    """Fetch brand and persona data and create BrandContext."""
    brand_data = None
    persona_data = None
    custom_tone_data = None

    if brand_id:
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if brand:
            brand_data = {
                "name": brand.name,
                "description": brand.description,
                "tone": brand.tone,
                "voice_attributes": brand.voice_attributes,
                "keywords": brand.keywords,
                "avoid_words": brand.avoid_words,
                "voice_examples": brand.voice_examples,
                "style_rules": brand.style_rules,
            }

    if persona_id:
        result = await db.execute(select(Persona).where(Persona.id == persona_id))
        persona = result.scalar_one_or_none()
        if persona:
            persona_data = {
                "name": persona.name,
                "description": persona.description,
                "age_range": persona.age_range,
                "occupation": persona.occupation,
                "pain_points": persona.pain_points,
                "goals": persona.goals,
                "values": persona.values,
                "communication_style": persona.communication_style,
                "language_level": persona.language_level,
            }

    if brand_data or persona_data:
        return BrandContext(brand=brand_data, persona=persona_data, custom_tone=custom_tone_data)

    return None


def substitute_variables(template_text: str, variables: Optional[Dict[str, str]]) -> str:
    """Replace {{variable}} placeholders with actual values."""
    if not variables or not template_text:
        return template_text

    result = template_text
    for key, value in variables.items():
        pattern = r'\{\{\s*' + re.escape(key) + r'\s*\}\}'
        result = re.sub(pattern, value, result)

    return result


async def get_template_with_variables(
    db: AsyncSession,
    template_id: int | None,
    variables: Optional[Dict[str, str]] = None,
) -> tuple[str | None, bool]:
    """Fetch template text and substitute variables. Returns (text, is_ab_template)."""
    if not template_id:
        return None, False
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        return None, False

    text = substitute_variables(template.prompt_template, variables)
    return text, template.is_ab_template or False


@router.post("")
async def generate_copy(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate copywriting text with streaming response."""
    template_text, _ = await get_template_with_variables(
        db, request.template_id, request.variables
    )

    # Get brand context if provided
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)

    prompt = ollama.build_prompt(request.prompt, template_text, request.tone, brand_context)

    async def stream_generator():
        full_output = []
        try:
            async for chunk in ollama.generate_stream(prompt):
                full_output.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            output_text = "".join(full_output)
            generation = Generation(
                prompt=request.prompt,
                template_id=request.template_id,
                tone=request.tone,
                output=output_text,
                is_favorite=False,
            )
            db.add(generation)
            await db.commit()
            await db.refresh(generation)

            yield f"data: {json.dumps({'done': True, 'id': generation.id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/sync")
async def generate_copy_sync(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate copywriting text (non-streaming)."""
    template_text, _ = await get_template_with_variables(
        db, request.template_id, request.variables
    )

    # Get brand context if provided
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)

    prompt = ollama.build_prompt(request.prompt, template_text, request.tone, brand_context)

    try:
        output = await ollama.generate(prompt)

        generation = Generation(
            prompt=request.prompt,
            template_id=request.template_id,
            tone=request.tone,
            output=output,
            is_favorite=False,
        )
        db.add(generation)
        await db.commit()
        await db.refresh(generation)

        return {"id": generation.id, "output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/variations")
async def generate_variations(
    request: VariationsRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate multiple variations of copy."""
    template_text, _ = await get_template_with_variables(
        db, request.template_id, request.variables
    )
    count = min(max(request.count, 1), 5)

    # Get brand context if provided
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)

    async def stream_generator():
        try:
            for i in range(count):
                yield f"data: {json.dumps({'variation_start': i + 1})}\n\n"

                prompt = ollama.build_variation_prompt(
                    request.prompt, i + 1, template_text, request.tone, brand_context
                )

                full_output = []
                async for chunk in ollama.generate_stream(prompt):
                    full_output.append(chunk)
                    yield f"data: {json.dumps({'variation': i + 1, 'chunk': chunk})}\n\n"

                output_text = "".join(full_output)
                generation = Generation(
                    prompt=request.prompt,
                    template_id=request.template_id,
                    tone=request.tone,
                    output=output_text,
                    is_favorite=False,
                )
                db.add(generation)
                await db.commit()
                await db.refresh(generation)

                yield f"data: {json.dumps({'variation_done': i + 1, 'id': generation.id})}\n\n"

            yield f"data: {json.dumps({'done': True, 'count': count})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/refine")
async def refine_copy(
    request: RefineRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Refine existing copy with a specific action."""
    # Get brand context if provided (for maintaining brand voice during refinement)
    brand_context = await get_brand_context(db, request.brand_id, None)

    if brand_context:
        prompt = ollama.build_refine_prompt_with_brand(request.text, request.action.value, brand_context)
    else:
        prompt = ollama.build_refine_prompt(request.text, request.action.value)

    async def stream_generator():
        full_output = []
        try:
            async for chunk in ollama.generate_stream(prompt):
                full_output.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

            output_text = "".join(full_output)
            generation = Generation(
                prompt=f"[Refine: {request.action.value}] {request.text[:100]}...",
                template_id=request.template_id,
                tone=request.tone,
                output=output_text,
                is_favorite=False,
            )
            db.add(generation)
            await db.commit()
            await db.refresh(generation)

            yield f"data: {json.dumps({'done': True, 'id': generation.id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.post("/ab-test")
async def generate_ab_test(
    request: ABTestRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate A/B test variations (Version A and Version B)."""
    template_text, _ = await get_template_with_variables(
        db, request.template_id, request.variables
    )

    # Get brand context if provided
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)

    async def stream_generator():
        versions = ["A", "B"]
        try:
            for i, version in enumerate(versions):
                yield f"data: {json.dumps({'version_start': version})}\n\n"

                prompt = ollama.build_ab_test_prompt(
                    request.prompt, version, template_text, request.tone, brand_context
                )

                full_output = []
                async for chunk in ollama.generate_stream(prompt):
                    full_output.append(chunk)
                    yield f"data: {json.dumps({'version': version, 'chunk': chunk})}\n\n"

                output_text = "".join(full_output)
                generation = Generation(
                    prompt=f"[A/B Test - Version {version}] {request.prompt}",
                    template_id=request.template_id,
                    tone=request.tone,
                    output=output_text,
                    is_favorite=False,
                )
                db.add(generation)
                await db.commit()
                await db.refresh(generation)

                yield f"data: {json.dumps({'version_done': version, 'id': generation.id})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
