import csv
import io
import re
import base64
import hashlib
from collections import Counter
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Optional, List
import httpx
import json

from app.services.ollama import get_ollama_service, BrandContext
from app.schemas.advanced import (
    OllamaModel,
    ModelInfo,
    ModelListResponse,
    ModelSwitchRequest,
    ModelSwitchResponse,
    URLToCopyRequest,
    URLToCopyResponse,
    ContentFormat,
    RepurposeRequest,
    RepurposeResponse,
    Language,
    LANGUAGE_NAMES,
    TranslateRequest,
    TranslateResponse,
    MultiTranslateRequest,
    MultiTranslateResponse,
    BulkGenerationItem,
    BulkGenerationRequest,
    BulkGenerationResponse,
    BulkGenerationResultItem,
    CSVUploadResponse,
    ImageToCopyRequest,
    ImageToCopyResponse,
    PlagiarismCheckRequest,
    PlagiarismCheckResponse,
    SimilarityMatch,
)
from app.database import async_session_maker
from app.models import Brand, Persona, CustomTone

router = APIRouter(prefix="/api/advanced", tags=["advanced"])


# Store for session model override (in production, use Redis or DB)
_current_model_override: Optional[str] = None


async def get_brand_context(brand_id: Optional[int], persona_id: Optional[int]) -> Optional[BrandContext]:
    """Fetch brand and persona context from database."""
    if not brand_id and not persona_id:
        return None

    async with async_session_maker() as session:
        brand_data = None
        persona_data = None
        custom_tone_data = None

        if brand_id:
            from sqlalchemy import select
            result = await session.execute(select(Brand).where(Brand.id == brand_id))
            brand = result.scalar_one_or_none()
            if brand:
                brand_data = {
                    "name": brand.name,
                    "tone": brand.tone,
                    "voice_attributes": brand.voice_attributes,
                    "keywords": brand.keywords,
                    "avoid_words": brand.avoid_words,
                    "voice_examples": brand.voice_examples,
                    "style_rules": brand.style_rules,
                }

        if persona_id:
            from sqlalchemy import select
            result = await session.execute(select(Persona).where(Persona.id == persona_id))
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

        return BrandContext(brand=brand_data, persona=persona_data, custom_tone=custom_tone_data)


# ============ Model Management ============

@router.get("/models", response_model=ModelListResponse)
async def list_models():
    """List all available Ollama models."""
    service = get_ollama_service()
    try:
        models = await service.list_models()
        current = _current_model_override or service.model
        return ModelListResponse(
            models=[OllamaModel(**m) for m in models],
            current_model=current,
        )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to Ollama: {str(e)}")


@router.get("/models/{model_name}", response_model=ModelInfo)
async def get_model_info(model_name: str):
    """Get detailed information about a specific model."""
    service = get_ollama_service()
    try:
        info = await service.get_model_info(model_name)
        # Detect capabilities
        capabilities = ["text"]
        model_lower = model_name.lower()
        if any(v in model_lower for v in ["llava", "bakllava", "vision"]):
            capabilities.append("vision")
        return ModelInfo(
            name=model_name,
            modelfile=info.get("modelfile"),
            parameters=info.get("parameters"),
            template=info.get("template"),
            system=info.get("system"),
            license=info.get("license"),
            capabilities=capabilities,
        )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=404, detail=f"Model not found: {str(e)}")


@router.post("/models/switch", response_model=ModelSwitchResponse)
async def switch_model(request: ModelSwitchRequest):
    """Switch the current model for generation."""
    global _current_model_override
    service = get_ollama_service()

    # Verify model exists
    try:
        models = await service.list_models()
        model_names = [m["name"] for m in models]
        if request.model not in model_names:
            # Try without tag
            base_names = [m["name"].split(":")[0] for m in models]
            if request.model.split(":")[0] not in base_names:
                raise HTTPException(
                    status_code=404,
                    detail=f"Model '{request.model}' not found. Available: {', '.join(model_names)}",
                )
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Failed to connect to Ollama: {str(e)}")

    _current_model_override = request.model
    return ModelSwitchResponse(
        success=True,
        current_model=request.model,
        message=f"Switched to model: {request.model}",
    )


@router.post("/models/reset")
async def reset_model():
    """Reset to the default model from settings."""
    global _current_model_override
    service = get_ollama_service()
    _current_model_override = None
    return {"success": True, "current_model": service.model, "message": "Reset to default model"}


def get_current_model() -> Optional[str]:
    """Get the currently active model."""
    return _current_model_override


# ============ URL-to-Copy ============

async def extract_content_from_url(url: str) -> tuple[str, str]:
    """Extract text content from a URL."""
    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        response = await client.get(url, headers={"User-Agent": "Mozilla/5.0 Auto-Copy Bot"})
        response.raise_for_status()
        html = response.text

    # Extract title
    title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.IGNORECASE)
    title = title_match.group(1).strip() if title_match else None

    # Remove script and style tags
    html = re.sub(r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE)
    html = re.sub(r"<style[^>]*>.*?</style>", "", html, flags=re.DOTALL | re.IGNORECASE)

    # Extract text from common content areas
    content_patterns = [
        r"<article[^>]*>(.*?)</article>",
        r"<main[^>]*>(.*?)</main>",
        r'<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)</div>',
        r"<body[^>]*>(.*?)</body>",
    ]

    content = ""
    for pattern in content_patterns:
        match = re.search(pattern, html, re.DOTALL | re.IGNORECASE)
        if match:
            content = match.group(1)
            break

    if not content:
        content = html

    # Remove remaining HTML tags
    content = re.sub(r"<[^>]+>", " ", content)
    # Clean whitespace
    content = re.sub(r"\s+", " ", content).strip()
    # Limit length
    content = content[:5000]

    return title, content


@router.post("/url-to-copy", response_model=URLToCopyResponse)
async def url_to_copy(request: URLToCopyRequest):
    """Extract content from a URL and generate copy."""
    try:
        title, extracted_content = await extract_content_from_url(str(request.url))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")

    if not extracted_content:
        raise HTTPException(status_code=400, detail="Could not extract content from URL")

    # Build prompt based on output type
    prompts = {
        "rewrite": f"""Rewrite the following content in a fresh, engaging way.
Maintain the key information but improve the writing quality and make it more compelling.
{f'Tone: {request.tone}' if request.tone else ''}
{f'Target length: {request.target_length}' if request.target_length else ''}
{f'Focus on: {request.focus}' if request.focus else ''}

Original content:
{extracted_content[:3000]}

Rewritten content:""",
        "summarize": f"""Summarize the following content concisely.
Capture the main points and key takeaways.
{f'Target length: {request.target_length}' if request.target_length else 'Keep it to 2-3 paragraphs.'}

Content:
{extracted_content[:3000]}

Summary:""",
        "extract": f"""Extract the key points and important information from this content.
Format as bullet points.
{f'Focus on: {request.focus}' if request.focus else ''}

Content:
{extracted_content[:3000]}

Key points:""",
    }

    prompt = prompts.get(request.output_type, prompts["rewrite"])

    # Get brand context if provided
    brand_context = await get_brand_context(request.brand_id, request.persona_id)
    if brand_context:
        context_str = brand_context.build_context_string()
        if context_str:
            prompt = f"{context_str}\n\n{prompt}"

    service = get_ollama_service()
    model = request.model or get_current_model()
    generated = await service.generate(prompt, model=model)

    return URLToCopyResponse(
        original_url=str(request.url),
        extracted_title=title,
        extracted_content=extracted_content[:1000] + "..." if len(extracted_content) > 1000 else extracted_content,
        generated_copy=generated.strip(),
        word_count=len(generated.split()),
    )


@router.post("/url-to-copy/stream")
async def url_to_copy_stream(request: URLToCopyRequest):
    """Extract content from a URL and generate copy with streaming."""
    try:
        title, extracted_content = await extract_content_from_url(str(request.url))
    except httpx.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")

    if not extracted_content:
        raise HTTPException(status_code=400, detail="Could not extract content from URL")

    prompts = {
        "rewrite": f"""Rewrite the following content in a fresh, engaging way.
{f'Tone: {request.tone}' if request.tone else ''}

Original content:
{extracted_content[:3000]}

Rewritten content:""",
        "summarize": f"""Summarize the following content concisely.

Content:
{extracted_content[:3000]}

Summary:""",
        "extract": f"""Extract the key points from this content as bullet points.

Content:
{extracted_content[:3000]}

Key points:""",
    }

    prompt = prompts.get(request.output_type, prompts["rewrite"])
    brand_context = await get_brand_context(request.brand_id, request.persona_id)
    if brand_context:
        context_str = brand_context.build_context_string()
        if context_str:
            prompt = f"{context_str}\n\n{prompt}"

    service = get_ollama_service()
    model = request.model or get_current_model()

    async def generate():
        # Send metadata first
        yield f"data: {json.dumps({'title': title, 'url': str(request.url)})}\n\n"
        async for chunk in service.generate_stream(prompt, model=model):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ============ Content Repurposing ============

FORMAT_PROMPTS = {
    ContentFormat.BLOG_POST: "a detailed blog post with introduction, body paragraphs, and conclusion",
    ContentFormat.SOCIAL_POST: "a short, engaging social media post (1-2 paragraphs)",
    ContentFormat.EMAIL: "a professional email with subject line, greeting, body, and sign-off",
    ContentFormat.AD_COPY: "compelling advertising copy with headline, body, and call-to-action",
    ContentFormat.TWEET_THREAD: "a Twitter/X thread of 3-5 connected tweets (each under 280 characters)",
    ContentFormat.LINKEDIN_POST: "a professional LinkedIn post that provides value and encourages engagement",
    ContentFormat.INSTAGRAM_CAPTION: "an engaging Instagram caption with relevant hashtags",
    ContentFormat.VIDEO_SCRIPT: "a video script with hook, main content, and call-to-action",
    ContentFormat.PRESS_RELEASE: "a formal press release with headline, dateline, and quotes",
    ContentFormat.PRODUCT_DESCRIPTION: "a persuasive product description highlighting features and benefits",
}


@router.post("/repurpose", response_model=RepurposeResponse)
async def repurpose_content(request: RepurposeRequest):
    """Convert content from one format to another."""
    source_desc = FORMAT_PROMPTS.get(request.source_format, str(request.source_format))
    target_desc = FORMAT_PROMPTS.get(request.target_format, str(request.target_format))

    prompt = f"""Convert the following {source_desc} into {target_desc}.

{f'Tone: {request.tone}' if request.tone else ''}
{f'Platform: {request.target_platform}' if request.target_platform else ''}
{f'Maximum length: {request.max_length} words' if request.max_length else ''}

Original content ({request.source_format.value}):
{request.content}

Converted content ({request.target_format.value}):"""

    brand_context = await get_brand_context(request.brand_id, request.persona_id)
    if brand_context:
        context_str = brand_context.build_context_string()
        if context_str:
            prompt = f"{context_str}\n\n{prompt}"

    service = get_ollama_service()
    model = request.model or get_current_model()
    generated = await service.generate(prompt, model=model)

    return RepurposeResponse(
        original_format=request.source_format,
        target_format=request.target_format,
        original_content=request.content,
        repurposed_content=generated.strip(),
        word_count=len(generated.split()),
    )


@router.post("/repurpose/stream")
async def repurpose_content_stream(request: RepurposeRequest):
    """Convert content from one format to another with streaming."""
    source_desc = FORMAT_PROMPTS.get(request.source_format, str(request.source_format))
    target_desc = FORMAT_PROMPTS.get(request.target_format, str(request.target_format))

    prompt = f"""Convert the following {source_desc} into {target_desc}.

{f'Tone: {request.tone}' if request.tone else ''}

Original content:
{request.content}

Converted content:"""

    brand_context = await get_brand_context(request.brand_id, request.persona_id)
    if brand_context:
        context_str = brand_context.build_context_string()
        if context_str:
            prompt = f"{context_str}\n\n{prompt}"

    service = get_ollama_service()
    model = request.model or get_current_model()

    async def generate():
        async for chunk in service.generate_stream(prompt, model=model):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/repurpose/formats")
async def get_repurpose_formats():
    """Get available content formats for repurposing."""
    return [
        {"value": f.value, "label": f.value.replace("_", " ").title(), "description": FORMAT_PROMPTS[f]}
        for f in ContentFormat
    ]


# ============ Translation ============

@router.post("/translate", response_model=TranslateResponse)
async def translate_content(request: TranslateRequest):
    """Translate content to another language."""
    source_name = LANGUAGE_NAMES.get(request.source_language.value, "auto-detect") if request.source_language else "auto-detect"
    target_name = LANGUAGE_NAMES.get(request.target_language.value, request.target_language.value)

    localize_instruction = ""
    if request.localize:
        localize_instruction = "Adapt the content culturally for the target audience, not just translate literally. Use local idioms and expressions where appropriate."

    prompt = f"""Translate the following content from {source_name} to {target_name}.
{f'Preserve the original tone and style.' if request.preserve_tone else 'You may adjust the tone for the target language.'}
{localize_instruction}

Content to translate:
{request.content}

{target_name} translation:"""

    service = get_ollama_service()
    model = request.model or get_current_model()
    translated = await service.generate(prompt, model=model)

    # Detect source language if not provided
    detected = None
    if not request.source_language:
        detect_prompt = f"What language is this text written in? Reply with just the language name: {request.content[:200]}"
        detected = await service.generate(detect_prompt, model=model)
        detected = detected.strip().lower()

    return TranslateResponse(
        original_content=request.content,
        translated_content=translated.strip(),
        source_language=source_name,
        target_language=target_name,
        detected_language=detected,
    )


@router.post("/translate/multi", response_model=MultiTranslateResponse)
async def translate_multi(request: MultiTranslateRequest):
    """Translate content to multiple languages."""
    service = get_ollama_service()
    model = request.model or get_current_model()
    translations = {}

    for lang in request.target_languages:
        target_name = LANGUAGE_NAMES.get(lang.value, lang.value)
        prompt = f"""Translate the following content to {target_name}.
{f'Preserve the original tone and style.' if request.preserve_tone else ''}

Content:
{request.content}

{target_name} translation:"""

        translated = await service.generate(prompt, model=model)
        translations[lang.value] = translated.strip()

    return MultiTranslateResponse(
        original_content=request.content,
        translations=translations,
    )


@router.post("/translate/stream")
async def translate_stream(request: TranslateRequest):
    """Translate content with streaming output."""
    target_name = LANGUAGE_NAMES.get(request.target_language.value, request.target_language.value)

    prompt = f"""Translate the following content to {target_name}.
{f'Preserve the original tone and style.' if request.preserve_tone else ''}

Content:
{request.content}

{target_name} translation:"""

    service = get_ollama_service()
    model = request.model or get_current_model()

    async def generate():
        async for chunk in service.generate_stream(prompt, model=model):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.get("/translate/languages")
async def get_languages():
    """Get available languages for translation."""
    return [{"code": code, "name": name} for code, name in LANGUAGE_NAMES.items()]


# ============ Bulk Generation ============

@router.post("/bulk/generate", response_model=BulkGenerationResponse)
async def bulk_generate(request: BulkGenerationRequest):
    """Generate copy for multiple prompts in batch."""
    service = get_ollama_service()
    model = request.model or get_current_model()
    brand_context = await get_brand_context(request.brand_id, request.persona_id)

    results = []
    successful = 0
    failed = 0

    for i, item in enumerate(request.items):
        try:
            # Build prompt
            prompt_parts = []
            if brand_context:
                context_str = brand_context.build_context_string()
                if context_str:
                    prompt_parts.append(context_str)

            if item.tone:
                prompt_parts.append(f"Tone: {item.tone}")

            prompt_parts.append(f"Generate marketing copy for: {item.prompt}")

            if item.variables:
                vars_str = ", ".join(f"{k}: {v}" for k, v in item.variables.items())
                prompt_parts.append(f"Variables: {vars_str}")

            prompt_parts.append("Generated copy:")
            prompt = "\n\n".join(prompt_parts)

            output = await service.generate(prompt, model=model)
            results.append(BulkGenerationResultItem(
                index=i,
                prompt=item.prompt,
                output=output.strip(),
                success=True,
                error=None,
            ))
            successful += 1
        except Exception as e:
            results.append(BulkGenerationResultItem(
                index=i,
                prompt=item.prompt,
                output="",
                success=False,
                error=str(e),
            ))
            failed += 1

    return BulkGenerationResponse(
        total=len(request.items),
        successful=successful,
        failed=failed,
        results=results,
    )


@router.post("/bulk/upload-csv", response_model=CSVUploadResponse)
async def upload_csv(file: UploadFile = File(...)):
    """Parse a CSV file for bulk generation."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    items = []
    errors = []

    reader = csv.DictReader(io.StringIO(text))

    for i, row in enumerate(reader):
        try:
            # Required: prompt column
            if "prompt" not in row:
                errors.append(f"Row {i + 1}: Missing 'prompt' column")
                continue

            item = BulkGenerationItem(
                prompt=row["prompt"],
                tone=row.get("tone"),
                template_id=int(row["template_id"]) if row.get("template_id") else None,
            )

            # Parse variables from var_* columns
            variables = {}
            for key, value in row.items():
                if key.startswith("var_") and value:
                    var_name = key[4:]  # Remove 'var_' prefix
                    variables[var_name] = value
            if variables:
                item.variables = variables

            items.append(item)
        except Exception as e:
            errors.append(f"Row {i + 1}: {str(e)}")

    return CSVUploadResponse(
        rows_parsed=len(items),
        items=items,
        errors=errors,
    )


# ============ Image-to-Copy ============

@router.post("/image-to-copy", response_model=ImageToCopyResponse)
async def image_to_copy(request: ImageToCopyRequest):
    """Generate copy from an image using a vision-capable model."""
    service = get_ollama_service()
    model = request.model or get_current_model()

    # Check if model supports vision
    try:
        info = await service.get_model_info(model)
        model_lower = model.lower()
        if not any(v in model_lower for v in ["llava", "bakllava", "vision"]):
            raise HTTPException(
                status_code=400,
                detail=f"Model '{model}' may not support vision. Try llava or bakllava.",
            )
    except Exception:
        pass  # Continue anyway, let Ollama handle it

    output_prompts = {
        "description": "Describe this image in detail, focusing on the main subject, colors, composition, and mood.",
        "ad_copy": "Create compelling advertising copy for the product shown in this image. Include a headline and body text.",
        "social_post": "Write an engaging social media post about what's shown in this image. Make it shareable and include relevant hashtags.",
    }

    prompt = output_prompts.get(request.output_type, output_prompts["description"])

    if request.additional_context:
        prompt = f"{prompt}\n\nAdditional context: {request.additional_context}"

    if request.tone:
        prompt = f"{prompt}\n\nTone: {request.tone}"

    if request.max_length:
        prompt = f"{prompt}\n\nKeep it under {request.max_length} words."

    brand_context = await get_brand_context(request.brand_id, request.persona_id)
    if brand_context:
        context_str = brand_context.build_context_string()
        if context_str:
            prompt = f"{context_str}\n\n{prompt}"

    try:
        generated = await service.generate(prompt, model=model, images=[request.image_base64])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate from image: {str(e)}")

    return ImageToCopyResponse(
        generated_copy=generated.strip(),
        word_count=len(generated.split()),
    )


@router.post("/image-to-copy/stream")
async def image_to_copy_stream(request: ImageToCopyRequest):
    """Generate copy from an image with streaming output."""
    service = get_ollama_service()
    model = request.model or get_current_model()

    output_prompts = {
        "description": "Describe this image in detail.",
        "ad_copy": "Create advertising copy for the product in this image.",
        "social_post": "Write a social media post about this image.",
    }

    prompt = output_prompts.get(request.output_type, output_prompts["description"])

    if request.tone:
        prompt = f"{prompt}\nTone: {request.tone}"

    async def generate():
        try:
            async for chunk in service.generate_stream(prompt, model=model, images=[request.image_base64]):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# ============ Plagiarism Check ============

def calculate_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts."""
    # Tokenize into words
    words1 = set(re.findall(r'\b\w+\b', text1.lower()))
    words2 = set(re.findall(r'\b\w+\b', text2.lower()))

    if not words1 or not words2:
        return 0.0

    intersection = len(words1 & words2)
    union = len(words1 | words2)

    return intersection / union if union > 0 else 0.0


def extract_ngrams(text: str, n: int = 3) -> List[str]:
    """Extract n-grams from text."""
    words = re.findall(r'\b\w+\b', text.lower())
    return [" ".join(words[i:i + n]) for i in range(len(words) - n + 1)]


def find_matching_phrases(content: str, reference: str, min_words: int = 4) -> List[tuple]:
    """Find matching phrases between content and reference."""
    content_ngrams = set(extract_ngrams(content, min_words))
    reference_ngrams = set(extract_ngrams(reference, min_words))
    matches = content_ngrams & reference_ngrams
    return list(matches)


@router.post("/plagiarism-check", response_model=PlagiarismCheckResponse)
async def plagiarism_check(request: PlagiarismCheckRequest):
    """Check content for originality."""
    content = request.content
    word_count = len(content.split())

    matches = []
    total_similarity = 0.0

    if request.check_against:
        # Check against provided content
        for i, reference in enumerate(request.check_against):
            similarity = calculate_similarity(content, reference)
            if similarity > 0.2:  # Threshold for reporting
                matching_phrases = find_matching_phrases(content, reference)
                for phrase in matching_phrases[:3]:  # Limit matches per reference
                    matches.append(SimilarityMatch(
                        matched_text=phrase,
                        similarity_score=similarity,
                        source=f"Reference {i + 1}",
                    ))
            total_similarity = max(total_similarity, similarity)

    # Calculate unique phrases ratio
    all_ngrams = extract_ngrams(content, 4)
    unique_ngrams = len(set(all_ngrams))
    total_ngrams = len(all_ngrams) if all_ngrams else 1
    unique_ratio = unique_ngrams / total_ngrams

    # Calculate originality score
    if request.check_against:
        originality_score = (1 - total_similarity) * 100
    else:
        # Without references, base on unique phrase ratio
        originality_score = unique_ratio * 100

    # Clamp score
    originality_score = max(0, min(100, originality_score))

    return PlagiarismCheckResponse(
        content=content[:500] + "..." if len(content) > 500 else content,
        is_original=originality_score >= 70,
        originality_score=round(originality_score, 1),
        matches=matches,
        word_count=word_count,
        unique_phrases_ratio=round(unique_ratio, 2),
    )


# ============ Content Quality Analysis ============

@router.post("/analyze-quality")
async def analyze_content_quality(content: str, model: Optional[str] = None):
    """Use AI to analyze content quality."""
    service = get_ollama_service()
    model = model or get_current_model()

    prompt = f"""Analyze the following marketing copy and provide feedback in JSON format:

Content:
{content}

Provide analysis in this exact JSON format:
{{
    "strengths": ["list of 2-3 strengths"],
    "weaknesses": ["list of 2-3 areas for improvement"],
    "tone_detected": "the overall tone (e.g., professional, casual, urgent)",
    "overall_quality_score": <number from 0-100>,
    "suggestions": [
        {{"type": "improvement", "message": "specific suggestion"}}
    ]
}}

JSON analysis:"""

    try:
        result = await service.generate(prompt, model=model)
        # Try to parse JSON from response
        json_match = re.search(r'\{.*\}', result, re.DOTALL)
        if json_match:
            analysis = json.loads(json_match.group())
            return analysis
        else:
            return {
                "strengths": ["Content provided"],
                "weaknesses": ["Could not analyze"],
                "tone_detected": "unknown",
                "overall_quality_score": 50,
                "suggestions": [],
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
