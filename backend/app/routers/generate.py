from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import asyncio

from app.database import get_db
from app.models import Generation, Template
from app.schemas import GenerateRequest, VariationsRequest, RefineRequest
from app.services.ollama import get_ollama_service, OllamaService

router = APIRouter(prefix="/api/generate", tags=["generate"])


async def get_template_text(db: AsyncSession, template_id: int | None) -> str | None:
    """Helper to fetch template text by ID."""
    if not template_id:
        return None
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    return template.prompt_template if template else None


@router.post("")
async def generate_copy(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate copywriting text with streaming response."""
    template_text = await get_template_text(db, request.template_id)
    prompt = ollama.build_prompt(request.prompt, template_text, request.tone)

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
    template_text = await get_template_text(db, request.template_id)
    prompt = ollama.build_prompt(request.prompt, template_text, request.tone)

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
    template_text = await get_template_text(db, request.template_id)
    count = min(max(request.count, 1), 5)  # Limit between 1-5

    async def stream_generator():
        try:
            for i in range(count):
                yield f"data: {json.dumps({'variation_start': i + 1})}\n\n"

                prompt = ollama.build_variation_prompt(
                    request.prompt, i + 1, template_text, request.tone
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
