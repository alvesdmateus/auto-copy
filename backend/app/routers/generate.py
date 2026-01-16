from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.database import get_db
from app.models import Generation, Template
from app.schemas import GenerateRequest
from app.services.ollama import get_ollama_service, OllamaService

router = APIRouter(prefix="/api/generate", tags=["generate"])


@router.post("")
async def generate_copy(
    request: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate copywriting text with streaming response."""
    template_text = None
    if request.template_id:
        result = await db.execute(
            select(Template).where(Template.id == request.template_id)
        )
        template = result.scalar_one_or_none()
        if template:
            template_text = template.prompt_template

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
    template_text = None
    if request.template_id:
        result = await db.execute(
            select(Template).where(Template.id == request.template_id)
        )
        template = result.scalar_one_or_none()
        if template:
            template_text = template.prompt_template

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
