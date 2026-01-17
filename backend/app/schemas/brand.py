from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# ============ Brand Schemas ============

class BrandBase(BaseModel):
    name: str
    description: Optional[str] = None
    tone: Optional[str] = None
    voice_attributes: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    avoid_words: Optional[List[str]] = None
    voice_examples: Optional[List[str]] = None
    style_rules: Optional[List[str]] = None
    is_default: bool = False


class BrandCreate(BrandBase):
    pass


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    tone: Optional[str] = None
    voice_attributes: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    avoid_words: Optional[List[str]] = None
    voice_examples: Optional[List[str]] = None
    style_rules: Optional[List[str]] = None
    is_default: Optional[bool] = None


class BrandResponse(BrandBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Custom Tone Schemas ============

class CustomToneBase(BaseModel):
    name: str
    description: Optional[str] = None
    formality: int = 50  # 0-100
    energy: int = 50  # 0-100
    humor: int = 0  # 0-100
    prompt_prefix: Optional[str] = None
    style_instructions: Optional[str] = None


class CustomToneCreate(CustomToneBase):
    pass


class CustomToneUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    formality: Optional[int] = None
    energy: Optional[int] = None
    humor: Optional[int] = None
    prompt_prefix: Optional[str] = None
    style_instructions: Optional[str] = None


class CustomToneResponse(CustomToneBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Persona Schemas ============

class PersonaBase(BaseModel):
    name: str
    description: Optional[str] = None
    # Demographics
    age_range: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    income_level: Optional[str] = None
    # Psychographics
    interests: Optional[List[str]] = None
    values: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    # Behavior
    buying_motivations: Optional[List[str]] = None
    objections: Optional[List[str]] = None
    preferred_channels: Optional[List[str]] = None
    # Communication
    communication_style: Optional[str] = None
    language_level: Optional[str] = None


class PersonaCreate(PersonaBase):
    pass


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    age_range: Optional[str] = None
    gender: Optional[str] = None
    location: Optional[str] = None
    occupation: Optional[str] = None
    income_level: Optional[str] = None
    interests: Optional[List[str]] = None
    values: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    buying_motivations: Optional[List[str]] = None
    objections: Optional[List[str]] = None
    preferred_channels: Optional[List[str]] = None
    communication_style: Optional[str] = None
    language_level: Optional[str] = None


class PersonaResponse(PersonaBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ Competitor Analysis Schemas ============

class CompetitorAnalysisRequest(BaseModel):
    competitor_copy: str
    product_description: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None
    differentiation_focus: Optional[str] = None  # e.g., "price", "quality", "features"


class CompetitorAnalysisResponse(BaseModel):
    original_copy: str
    analysis: str
    differentiated_copy: str
    key_differences: List[str]


# ============ Style Check Schemas ============

class StyleCheckRequest(BaseModel):
    text: str
    brand_id: int


class StyleViolation(BaseModel):
    type: str  # "avoid_word", "tone_mismatch", "style_rule"
    message: str
    severity: str  # "warning", "error"
    suggestion: Optional[str] = None


class StyleCheckResponse(BaseModel):
    text: str
    is_compliant: bool
    violations: List[StyleViolation]
    score: int  # 0-100 compliance score
