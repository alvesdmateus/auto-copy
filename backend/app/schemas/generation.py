from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class RefineAction(str, Enum):
    IMPROVE = "improve"
    SHORTEN = "shorten"
    LENGTHEN = "lengthen"
    PUNCHIER = "punchier"
    FORMAL = "formal"
    CASUAL = "casual"


class TemplateCategory(str, Enum):
    SOCIAL = "social"
    EMAIL = "email"
    ADS = "ads"
    ECOMMERCE = "ecommerce"
    SEO = "seo"
    GENERAL = "general"


class TemplateVariable(BaseModel):
    name: str
    label: str
    placeholder: str
    required: bool = True
    type: str = "text"  # text, textarea, select
    options: Optional[List[str]] = None  # For select type


class WizardStep(BaseModel):
    title: str
    description: Optional[str] = None
    variables: List[str]  # List of variable names to show in this step


class GenerateRequest(BaseModel):
    prompt: str
    template_id: Optional[int] = None
    tone: Optional[str] = None
    variables: Optional[Dict[str, str]] = None  # Filled template variables
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class VariationsRequest(BaseModel):
    prompt: str
    template_id: Optional[int] = None
    tone: Optional[str] = None
    count: int = 3
    variables: Optional[Dict[str, str]] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class RefineRequest(BaseModel):
    text: str
    action: RefineAction
    template_id: Optional[int] = None
    tone: Optional[str] = None
    brand_id: Optional[int] = None


class ABTestRequest(BaseModel):
    prompt: str
    template_id: Optional[int] = None
    tone: Optional[str] = None
    variables: Optional[Dict[str, str]] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class GenerateResponse(BaseModel):
    id: int
    output: str


class GenerationHistory(BaseModel):
    id: int
    prompt: str
    template_id: Optional[int]
    tone: Optional[str]
    output: str
    is_favorite: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    name: str
    platform: str
    category: TemplateCategory = TemplateCategory.GENERAL
    description: Optional[str] = None
    prompt_template: str
    variables: Optional[List[TemplateVariable]] = None
    wizard_steps: Optional[List[WizardStep]] = None
    example_output: Optional[str] = None
    is_custom: bool = True
    is_ab_template: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    platform: Optional[str] = None
    category: Optional[TemplateCategory] = None
    description: Optional[str] = None
    prompt_template: Optional[str] = None
    variables: Optional[List[TemplateVariable]] = None
    wizard_steps: Optional[List[WizardStep]] = None
    example_output: Optional[str] = None
    is_ab_template: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    platform: str
    category: str
    description: Optional[str]
    prompt_template: str
    variables: Optional[List[Dict[str, Any]]]
    wizard_steps: Optional[List[Dict[str, Any]]]
    example_output: Optional[str]
    is_custom: bool
    is_ab_template: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TemplateExport(BaseModel):
    templates: List[TemplateCreate]
    exported_at: datetime
    version: str = "1.0"


class TemplateImport(BaseModel):
    templates: List[TemplateCreate]
