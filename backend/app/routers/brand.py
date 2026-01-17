from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json
import re

from app.database import get_db
from app.models import Brand, CustomTone, Persona
from app.schemas import (
    BrandCreate,
    BrandUpdate,
    BrandResponse,
    CustomToneCreate,
    CustomToneUpdate,
    CustomToneResponse,
    PersonaCreate,
    PersonaUpdate,
    PersonaResponse,
    CompetitorAnalysisRequest,
    StyleCheckRequest,
    StyleCheckResponse,
    StyleViolation,
)
from app.services.ollama import get_ollama_service, OllamaService

router = APIRouter(prefix="/api/brand", tags=["brand"])


# ============ Brand Endpoints ============

@router.get("/brands", response_model=List[BrandResponse])
async def list_brands(db: AsyncSession = Depends(get_db)):
    """List all brand profiles."""
    result = await db.execute(select(Brand).order_by(Brand.name))
    brands = result.scalars().all()
    return brands


@router.get("/brands/{brand_id}", response_model=BrandResponse)
async def get_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific brand profile."""
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.post("/brands", response_model=BrandResponse)
async def create_brand(brand: BrandCreate, db: AsyncSession = Depends(get_db)):
    """Create a new brand profile."""
    # If this is set as default, unset other defaults
    if brand.is_default:
        await db.execute(
            Brand.__table__.update().values(is_default=False)
        )

    db_brand = Brand(
        name=brand.name,
        description=brand.description,
        tone=brand.tone,
        voice_attributes=brand.voice_attributes,
        keywords=brand.keywords,
        avoid_words=brand.avoid_words,
        voice_examples=brand.voice_examples,
        style_rules=brand.style_rules,
        is_default=brand.is_default,
    )
    db.add(db_brand)
    await db.commit()
    await db.refresh(db_brand)
    return db_brand


@router.put("/brands/{brand_id}", response_model=BrandResponse)
async def update_brand(
    brand_id: int,
    brand: BrandUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a brand profile."""
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    db_brand = result.scalar_one_or_none()
    if not db_brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    update_data = brand.model_dump(exclude_unset=True)

    # If setting as default, unset other defaults
    if update_data.get("is_default"):
        await db.execute(
            Brand.__table__.update().where(Brand.id != brand_id).values(is_default=False)
        )

    for field, value in update_data.items():
        setattr(db_brand, field, value)

    await db.commit()
    await db.refresh(db_brand)
    return db_brand


@router.delete("/brands/{brand_id}")
async def delete_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a brand profile."""
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    await db.delete(brand)
    await db.commit()
    return {"message": "Brand deleted"}


@router.post("/brands/{brand_id}/set-default", response_model=BrandResponse)
async def set_default_brand(brand_id: int, db: AsyncSession = Depends(get_db)):
    """Set a brand as the default."""
    result = await db.execute(select(Brand).where(Brand.id == brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    # Unset all other defaults
    await db.execute(Brand.__table__.update().values(is_default=False))

    brand.is_default = True
    await db.commit()
    await db.refresh(brand)
    return brand


# ============ Custom Tone Endpoints ============

@router.get("/tones", response_model=List[CustomToneResponse])
async def list_custom_tones(db: AsyncSession = Depends(get_db)):
    """List all custom tones."""
    result = await db.execute(select(CustomTone).order_by(CustomTone.name))
    tones = result.scalars().all()
    return tones


@router.get("/tones/all")
async def list_all_tones(db: AsyncSession = Depends(get_db)):
    """List all tones (preset + custom)."""
    # Preset tones
    presets = [
        {"id": None, "name": "professional", "description": "Formal and business-appropriate", "is_preset": True},
        {"id": None, "name": "casual", "description": "Friendly and conversational", "is_preset": True},
        {"id": None, "name": "playful", "description": "Fun and lighthearted", "is_preset": True},
        {"id": None, "name": "urgent", "description": "Creates urgency and FOMO", "is_preset": True},
        {"id": None, "name": "empathetic", "description": "Understanding and supportive", "is_preset": True},
        {"id": None, "name": "confident", "description": "Bold and authoritative", "is_preset": True},
        {"id": None, "name": "luxury", "description": "Sophisticated and premium", "is_preset": True},
    ]

    # Custom tones from database
    result = await db.execute(select(CustomTone).order_by(CustomTone.name))
    custom = result.scalars().all()
    custom_list = [
        {
            "id": t.id,
            "name": t.name,
            "description": t.description,
            "is_preset": False,
            "formality": t.formality,
            "energy": t.energy,
            "humor": t.humor,
        }
        for t in custom
    ]

    return {"presets": presets, "custom": custom_list}


@router.get("/tones/{tone_id}", response_model=CustomToneResponse)
async def get_custom_tone(tone_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific custom tone."""
    result = await db.execute(select(CustomTone).where(CustomTone.id == tone_id))
    tone = result.scalar_one_or_none()
    if not tone:
        raise HTTPException(status_code=404, detail="Custom tone not found")
    return tone


@router.post("/tones", response_model=CustomToneResponse)
async def create_custom_tone(tone: CustomToneCreate, db: AsyncSession = Depends(get_db)):
    """Create a new custom tone."""
    # Check for duplicate name
    existing = await db.execute(select(CustomTone).where(CustomTone.name == tone.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tone with this name already exists")

    db_tone = CustomTone(
        name=tone.name,
        description=tone.description,
        formality=tone.formality,
        energy=tone.energy,
        humor=tone.humor,
        prompt_prefix=tone.prompt_prefix,
        style_instructions=tone.style_instructions,
    )
    db.add(db_tone)
    await db.commit()
    await db.refresh(db_tone)
    return db_tone


@router.put("/tones/{tone_id}", response_model=CustomToneResponse)
async def update_custom_tone(
    tone_id: int,
    tone: CustomToneUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a custom tone."""
    result = await db.execute(select(CustomTone).where(CustomTone.id == tone_id))
    db_tone = result.scalar_one_or_none()
    if not db_tone:
        raise HTTPException(status_code=404, detail="Custom tone not found")

    update_data = tone.model_dump(exclude_unset=True)

    # Check for duplicate name if changing
    if "name" in update_data and update_data["name"] != db_tone.name:
        existing = await db.execute(
            select(CustomTone).where(CustomTone.name == update_data["name"])
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Tone with this name already exists")

    for field, value in update_data.items():
        setattr(db_tone, field, value)

    await db.commit()
    await db.refresh(db_tone)
    return db_tone


@router.delete("/tones/{tone_id}")
async def delete_custom_tone(tone_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a custom tone."""
    result = await db.execute(select(CustomTone).where(CustomTone.id == tone_id))
    tone = result.scalar_one_or_none()
    if not tone:
        raise HTTPException(status_code=404, detail="Custom tone not found")
    await db.delete(tone)
    await db.commit()
    return {"message": "Custom tone deleted"}


# ============ Persona Endpoints ============

@router.get("/personas", response_model=List[PersonaResponse])
async def list_personas(db: AsyncSession = Depends(get_db)):
    """List all audience personas."""
    result = await db.execute(select(Persona).order_by(Persona.name))
    personas = result.scalars().all()
    return personas


@router.get("/personas/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific persona."""
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona = result.scalar_one_or_none()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    return persona


@router.post("/personas", response_model=PersonaResponse)
async def create_persona(persona: PersonaCreate, db: AsyncSession = Depends(get_db)):
    """Create a new audience persona."""
    db_persona = Persona(
        name=persona.name,
        description=persona.description,
        age_range=persona.age_range,
        gender=persona.gender,
        location=persona.location,
        occupation=persona.occupation,
        income_level=persona.income_level,
        interests=persona.interests,
        values=persona.values,
        pain_points=persona.pain_points,
        goals=persona.goals,
        buying_motivations=persona.buying_motivations,
        objections=persona.objections,
        preferred_channels=persona.preferred_channels,
        communication_style=persona.communication_style,
        language_level=persona.language_level,
    )
    db.add(db_persona)
    await db.commit()
    await db.refresh(db_persona)
    return db_persona


@router.put("/personas/{persona_id}", response_model=PersonaResponse)
async def update_persona(
    persona_id: int,
    persona: PersonaUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a persona."""
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    db_persona = result.scalar_one_or_none()
    if not db_persona:
        raise HTTPException(status_code=404, detail="Persona not found")

    update_data = persona.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_persona, field, value)

    await db.commit()
    await db.refresh(db_persona)
    return db_persona


@router.delete("/personas/{persona_id}")
async def delete_persona(persona_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a persona."""
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona = result.scalar_one_or_none()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    await db.delete(persona)
    await db.commit()
    return {"message": "Persona deleted"}


# ============ Competitor Analysis ============

@router.post("/competitor-analysis")
async def analyze_competitor(
    request: CompetitorAnalysisRequest,
    db: AsyncSession = Depends(get_db),
    ollama: OllamaService = Depends(get_ollama_service),
):
    """Analyze competitor copy and generate differentiated alternatives."""
    # Get brand context if provided
    brand_context = ""
    if request.brand_id:
        result = await db.execute(select(Brand).where(Brand.id == request.brand_id))
        brand = result.scalar_one_or_none()
        if brand:
            brand_context = f"\nBrand: {brand.name}"
            if brand.tone:
                brand_context += f"\nTone: {brand.tone}"
            if brand.voice_attributes:
                brand_context += f"\nVoice: {', '.join(brand.voice_attributes)}"
            if brand.keywords:
                brand_context += f"\nKeywords to use: {', '.join(brand.keywords)}"
            if brand.avoid_words:
                brand_context += f"\nWords to avoid: {', '.join(brand.avoid_words)}"

    # Get persona context if provided
    persona_context = ""
    if request.persona_id:
        result = await db.execute(select(Persona).where(Persona.id == request.persona_id))
        persona = result.scalar_one_or_none()
        if persona:
            persona_context = f"\n\nTarget Audience: {persona.name}"
            if persona.pain_points:
                persona_context += f"\nPain points: {', '.join(persona.pain_points)}"
            if persona.goals:
                persona_context += f"\nGoals: {', '.join(persona.goals)}"

    prompt = f"""Analyze this competitor copy and create a differentiated alternative:

COMPETITOR COPY:
{request.competitor_copy}

{f"MY PRODUCT: {request.product_description}" if request.product_description else ""}
{brand_context}
{persona_context}
{f"DIFFERENTIATION FOCUS: {request.differentiation_focus}" if request.differentiation_focus else ""}

Please provide:
1. ANALYSIS: Brief analysis of the competitor's approach (strengths and weaknesses)
2. DIFFERENTIATED COPY: New copy that stands out while addressing the same audience
3. KEY DIFFERENCES: List 3-5 key ways your version differs

Format your response as:
ANALYSIS:
[your analysis]

DIFFERENTIATED COPY:
[your new copy]

KEY DIFFERENCES:
- [difference 1]
- [difference 2]
- [difference 3]"""

    async def stream_generator():
        full_output = []
        try:
            async for chunk in ollama.generate_stream(prompt):
                full_output.append(chunk)
                yield f"data: {json.dumps({'chunk': chunk})}\n\n"

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


# ============ Style Check ============

@router.post("/style-check", response_model=StyleCheckResponse)
async def check_style(
    request: StyleCheckRequest,
    db: AsyncSession = Depends(get_db),
):
    """Check if text complies with brand style guide."""
    result = await db.execute(select(Brand).where(Brand.id == request.brand_id))
    brand = result.scalar_one_or_none()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    violations: List[StyleViolation] = []
    text_lower = request.text.lower()

    # Check avoid words
    if brand.avoid_words:
        for word in brand.avoid_words:
            # Use word boundary matching
            pattern = r'\b' + re.escape(word.lower()) + r'\b'
            matches = re.findall(pattern, text_lower)
            if matches:
                violations.append(StyleViolation(
                    type="avoid_word",
                    message=f"Contains word to avoid: '{word}'",
                    severity="warning",
                    suggestion=f"Consider removing or replacing '{word}'"
                ))

    # Check for missing keywords (soft check)
    keywords_found = 0
    if brand.keywords:
        for keyword in brand.keywords:
            if keyword.lower() in text_lower:
                keywords_found += 1

    # Check style rules
    if brand.style_rules:
        for rule in brand.style_rules:
            rule_lower = rule.lower()
            # Check for common rule patterns
            if "no exclamation" in rule_lower and "!" in request.text:
                violations.append(StyleViolation(
                    type="style_rule",
                    message=f"Style rule violation: {rule}",
                    severity="warning",
                    suggestion="Remove exclamation marks"
                ))
            elif "no all caps" in rule_lower:
                # Check for words that are all caps (3+ letters)
                all_caps_words = re.findall(r'\b[A-Z]{3,}\b', request.text)
                if all_caps_words:
                    violations.append(StyleViolation(
                        type="style_rule",
                        message=f"Style rule violation: {rule}",
                        severity="warning",
                        suggestion=f"Convert to sentence case: {', '.join(all_caps_words)}"
                    ))
            elif "no emoji" in rule_lower:
                # Simple emoji detection
                emoji_pattern = re.compile(
                    "["
                    "\U0001F600-\U0001F64F"
                    "\U0001F300-\U0001F5FF"
                    "\U0001F680-\U0001F6FF"
                    "\U0001F1E0-\U0001F1FF"
                    "]+",
                    flags=re.UNICODE
                )
                if emoji_pattern.search(request.text):
                    violations.append(StyleViolation(
                        type="style_rule",
                        message=f"Style rule violation: {rule}",
                        severity="warning",
                        suggestion="Remove emojis from the copy"
                    ))

    # Calculate compliance score
    total_checks = len(brand.avoid_words or []) + len(brand.style_rules or [])
    violations_count = len(violations)

    if total_checks > 0:
        score = max(0, int(100 - (violations_count / total_checks) * 100))
    else:
        score = 100

    return StyleCheckResponse(
        text=request.text,
        is_compliant=len(violations) == 0,
        violations=violations,
        score=score
    )
