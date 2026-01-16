from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class GenerateRequest(BaseModel):
    prompt: str
    template_id: Optional[int] = None
    tone: Optional[str] = None


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
    prompt_template: str
    is_custom: bool = True


class TemplateResponse(BaseModel):
    id: int
    name: str
    platform: str
    prompt_template: str
    is_custom: bool
    created_at: datetime

    class Config:
        from_attributes = True
