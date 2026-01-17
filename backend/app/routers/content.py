from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
from typing import Optional

from app.database import get_db
from app.models import Brand, Persona
from app.schemas.content import (
    LongFormRequest,
    EmailSequenceRequest,
    AdCampaignRequest,
    SEOContentRequest,
    LandingPageRequest,
    VideoScriptRequest,
)
from app.services.ollama import get_ollama_service, OllamaService, BrandContext

router = APIRouter(prefix="/api/content", tags=["content"])


async def get_brand_context(
    db: AsyncSession,
    brand_id: Optional[int] = None,
    persona_id: Optional[int] = None,
) -> Optional[BrandContext]:
    """Fetch brand and persona data and create BrandContext."""
    brand_data = None
    persona_data = None

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
            }

    if persona_id:
        result = await db.execute(select(Persona).where(Persona.id == persona_id))
        persona = result.scalar_one_or_none()
        if persona:
            persona_data = {
                "name": persona.name,
                "description": persona.description,
                "age_range": persona.age_range,
                "pain_points": persona.pain_points,
                "goals": persona.goals,
            }

    if brand_data or persona_data:
        return BrandContext(brand=brand_data, persona=persona_data)

    return None


# ============ Long-form Content ============

@router.post("/long-form/outline")
async def generate_outline(
    request: LongFormRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate an outline for long-form content."""
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    prompt = f"""Create a detailed outline for a {request.content_type.replace('_', ' ')} about: {request.topic}

Target word count: approximately {request.word_count} words
{f"Target audience: {request.target_audience}" if request.target_audience else ""}
{f"Tone: {request.tone}" if request.tone else ""}
{f"Keywords to include: {', '.join(request.keywords)}" if request.keywords else ""}
{context_str}

Provide the outline in this exact JSON format:
{{
    "title": "Compelling article title",
    "introduction": "Brief overview of the introduction (2-3 sentences)",
    "sections": [
        {{
            "title": "Section title",
            "key_points": ["Point 1", "Point 2", "Point 3"]
        }}
    ],
    "conclusion": "Brief overview of the conclusion",
    "estimated_word_count": {request.word_count}
}}

Create 3-5 main sections based on the topic complexity. Only respond with valid JSON."""

    try:
        output = await ollama.generate(prompt)
        # Try to parse as JSON
        try:
            # Find JSON in response
            start = output.find('{')
            end = output.rfind('}') + 1
            if start >= 0 and end > start:
                json_str = output[start:end]
                outline = json.loads(json_str)
                return outline
        except json.JSONDecodeError:
            pass
        # Return raw if can't parse
        return {"raw_output": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/long-form/generate")
async def generate_long_form(
    request: LongFormRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate long-form content with streaming."""
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    outline_str = ""
    if request.outline:
        outline_str = "\n\nFollow this outline:\n"
        for i, section in enumerate(request.outline, 1):
            outline_str += f"{i}. {section.title}\n"
            for point in section.key_points:
                outline_str += f"   - {point}\n"

    prompt = f"""Write a comprehensive {request.content_type.replace('_', ' ')} about: {request.topic}

Target length: approximately {request.word_count} words
{f"Target audience: {request.target_audience}" if request.target_audience else ""}
{f"Tone: {request.tone}" if request.tone else ""}
{f"Keywords to naturally incorporate: {', '.join(request.keywords)}" if request.keywords else ""}
{context_str}
{outline_str}

Requirements:
- Write engaging, well-structured content
- Use headers (##) to organize sections
- Include an introduction and conclusion
- Make it informative and valuable to readers
- Use natural transitions between sections

Begin writing:"""

    async def stream_generator():
        try:
            async for chunk in ollama.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ============ Email Sequences ============

@router.post("/email-sequence")
async def generate_email_sequence(
    request: EmailSequenceRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate a multi-email sequence with streaming."""
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    prompt = f"""Create a {request.email_count}-email {request.sequence_type.value} sequence for: {request.product_or_service}

{f"Target audience: {request.target_audience}" if request.target_audience else ""}
{f"Tone: {request.tone}" if request.tone else ""}
{f"Key benefits to highlight: {', '.join(request.key_benefits)}" if request.key_benefits else ""}
{f"Main call-to-action: {request.call_to_action}" if request.call_to_action else ""}
Days between emails: {request.days_between}
{context_str}

For each email, provide:
1. Day number (starting from Day 1)
2. Subject line (compelling, under 50 characters)
3. Preview text (enticing, under 100 characters)
4. Email body (engaging, 100-200 words)
5. Call-to-action button text

Format each email clearly with these headers:
---EMAIL [NUMBER]---
Day: [day number]
Subject: [subject line]
Preview: [preview text]
Body:
[email body]
CTA: [call-to-action text]

Create a cohesive sequence that builds momentum and drives action."""

    async def stream_generator():
        try:
            async for chunk in ollama.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ============ Ad Campaign ============

@router.post("/ad-campaign")
async def generate_ad_campaign(
    request: AdCampaignRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate ad campaign variations with streaming."""
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    platform_specs = {
        "google": "Headlines: max 30 chars each, Descriptions: max 90 chars each",
        "facebook": "Primary text: 125 chars optimal, Headline: 40 chars, Description: 30 chars",
        "instagram": "Primary text: 125 chars optimal, include hashtags",
        "linkedin": "Headline: 70 chars max, Description: 100 chars optimal",
        "twitter": "280 chars total, concise and punchy",
        "tiktok": "Short, trendy, use relevant hashtags",
    }

    prompt = f"""Create {request.variations} ad variations for {request.platform.value.upper()} promoting: {request.product_or_service}

Campaign goal: {request.campaign_goal}
{f"Target audience: {request.target_audience}" if request.target_audience else ""}
{f"Key benefits: {', '.join(request.key_benefits)}" if request.key_benefits else ""}
{f"Special offer: {request.offer}" if request.offer else ""}
{f"Tone: {request.tone}" if request.tone else ""}
{context_str}

Platform requirements: {platform_specs.get(request.platform.value, "")}

For each variation, provide:
---VARIATION [NUMBER]---
Headline: [compelling headline]
Description: [benefit-focused description]
Primary Text: [engaging primary text for social platforms]
CTA: [call-to-action button text]

Create diverse angles: benefit-focused, pain-point, social proof, urgency, etc."""

    async def stream_generator():
        try:
            async for chunk in ollama.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ============ SEO Content ============

@router.post("/seo-content")
async def generate_seo_content(
    request: SEOContentRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate SEO-optimized content elements."""
    brand_context = await get_brand_context(db, request.brand_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    prompt = f"""Generate SEO content for a {request.page_type} page about: {request.page_topic}

Target keywords: {', '.join(request.target_keywords)}
{f"Page URL: {request.page_url}" if request.page_url else ""}
{context_str}

Provide the following (optimized for search engines):

META TITLE: (50-60 characters, include primary keyword)
[your meta title]

META DESCRIPTION: (150-160 characters, compelling with keyword)
[your meta description]

H1 SUGGESTION: (clear, keyword-rich)
[your H1 suggestion]

ALT TEXTS: (for 3 potential images)
1. [alt text 1]
2. [alt text 2]
3. [alt text 3]

KEYWORD USAGE TIPS:
- [tip 1]
- [tip 2]
- [tip 3]

Ensure all content is natural-sounding while being SEO-optimized."""

    async def stream_generator():
        try:
            async for chunk in ollama.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ============ Landing Page Copy ============

@router.post("/landing-page")
async def generate_landing_page(
    request: LandingPageRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate complete landing page copy with streaming."""
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    prompt = f"""Create compelling landing page copy for: {request.product_or_service}

{f"Target audience: {request.target_audience}" if request.target_audience else ""}
{f"Unique value proposition: {request.unique_value_proposition}" if request.unique_value_proposition else ""}
{f"Key features: {', '.join(request.key_features)}" if request.key_features else ""}
{f"Pain points to address: {', '.join(request.pain_points)}" if request.pain_points else ""}
{f"Tone: {request.tone}" if request.tone else ""}
{context_str}

Generate the following sections:

===HERO SECTION===
Headline: [powerful, benefit-driven headline]
Subheadline: [supporting statement]
CTA Button: [action-oriented button text]

===PROBLEM SECTION===
[2-3 paragraphs addressing the pain points]

===SOLUTION SECTION===
[2-3 paragraphs presenting the solution]

===FEATURES===
{f"Generate {len(request.key_features) if request.key_features else 3} features:" if request.key_features else "Generate 3-4 key features:"}
Feature 1:
- Title: [feature name]
- Description: [benefit-focused description]
- Icon suggestion: [relevant icon name]
[Repeat for each feature]

===SOCIAL PROOF===
Headline: [trust-building headline]

{f"===TESTIMONIALS===" if request.testimonials_count > 0 else ""}
{f"Generate {request.testimonials_count} realistic testimonials:" if request.testimonials_count > 0 else ""}

{f"===FAQ===" if request.faq_count > 0 else ""}
{f"Generate {request.faq_count} frequently asked questions with answers:" if request.faq_count > 0 else ""}

===FINAL CTA===
Headline: [urgency-driven headline]
Button: [compelling CTA button text]"""

    async def stream_generator():
        try:
            async for chunk in ollama.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


# ============ Video Scripts ============

@router.post("/video-script")
async def generate_video_script(
    request: VideoScriptRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Generate video script with timing and visual cues."""
    brand_context = await get_brand_context(db, request.brand_id, request.persona_id)
    context_str = brand_context.build_context_string() if brand_context else ""

    video_specs = {
        "tiktok": "Fast-paced, hook in first 3 seconds, trending style",
        "youtube_short": "Vertical format, immediate value, strong hook",
        "instagram_reel": "Visually engaging, music-friendly, quick cuts",
        "youtube_long": "Structured intro, detailed content, clear chapters",
        "explainer": "Problem-solution format, clear explanations",
        "testimonial": "Authentic, emotional, specific results",
    }

    prompt = f"""Create a video script for a {request.video_type.value.replace('_', ' ')} about: {request.topic}

Duration: {request.duration_seconds} seconds
Style: {video_specs.get(request.video_type.value, "")}
{f"Target audience: {request.target_audience}" if request.target_audience else ""}
{f"Key message: {request.key_message}" if request.key_message else ""}
{f"Call-to-action: {request.call_to_action}" if request.call_to_action else ""}
{f"Tone: {request.tone}" if request.tone else ""}
{context_str}

Format the script with timestamps:

TITLE: [Video title]

HOOK (0:00-0:03):
Visual: [what's shown on screen]
Dialogue: [what's said]
On-screen text: [any text overlays]

[Continue with sections...]

MAIN CONTENT:
[Break into logical sections with timestamps]

CALL-TO-ACTION ({request.duration_seconds - 10}s-{request.duration_seconds}s):
Visual: [final visual]
Dialogue: [closing dialogue]
On-screen text: [CTA text]

THUMBNAIL SUGGESTIONS:
1. [suggestion 1]
2. [suggestion 2]
3. [suggestion 3]"""

    async def stream_generator():
        try:
            async for chunk in ollama.generate_stream(prompt):
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )
