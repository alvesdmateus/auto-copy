from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============ Webhook Events ============

class WebhookEvent(str, Enum):
    GENERATION_CREATED = "generation.created"
    GENERATION_FAVORITED = "generation.favorited"
    GENERATION_DELETED = "generation.deleted"
    TEMPLATE_CREATED = "template.created"
    TEMPLATE_UPDATED = "template.updated"
    BRAND_CREATED = "brand.created"
    BRAND_UPDATED = "brand.updated"
    ABTEST_DECIDED = "abtest.decided"


# ============ Webhook Configuration ============

class WebhookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: HttpUrl
    events: List[WebhookEvent]
    secret: Optional[str] = Field(None, min_length=16, max_length=64)
    is_active: bool = True
    headers: Optional[Dict[str, str]] = None


class WebhookUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    url: Optional[HttpUrl] = None
    events: Optional[List[WebhookEvent]] = None
    secret: Optional[str] = Field(None, min_length=16, max_length=64)
    is_active: Optional[bool] = None
    headers: Optional[Dict[str, str]] = None


class WebhookResponse(BaseModel):
    id: int
    name: str
    url: str
    events: List[WebhookEvent]
    is_active: bool
    headers: Optional[Dict[str, str]] = None
    last_triggered: Optional[datetime] = None
    last_status: Optional[int] = None
    failure_count: int = 0
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WebhookDelivery(BaseModel):
    id: int
    webhook_id: int
    event: WebhookEvent
    payload: Dict[str, Any]
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    success: bool
    delivered_at: datetime


class WebhookTestResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    response_time_ms: int
    error: Optional[str] = None


# ============ API Keys ============

class APIKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    scopes: List[str] = Field(default=["read", "write"])
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class APIKeyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    key_prefix: str  # First 8 chars for identification
    scopes: List[str]
    is_active: bool
    last_used: Optional[datetime] = None
    usage_count: int = 0
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class APIKeyCreated(APIKeyResponse):
    key: str  # Full key, only shown once on creation


class APIKeyUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    scopes: Optional[List[str]] = None
    is_active: Optional[bool] = None


# ============ Integration Settings ============

class NotionSettings(BaseModel):
    access_token: Optional[str] = None
    default_database_id: Optional[str] = None
    is_connected: bool = False


class GoogleSettings(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    default_folder_id: Optional[str] = None
    is_connected: bool = False


class SlackSettings(BaseModel):
    bot_token: Optional[str] = None
    default_channel: Optional[str] = None
    is_connected: bool = False


class IntegrationSettings(BaseModel):
    notion: NotionSettings = NotionSettings()
    google: GoogleSettings = GoogleSettings()
    slack: SlackSettings = SlackSettings()


# ============ Export Formats ============

class ExportFormat(str, Enum):
    PLAIN = "plain"
    MARKDOWN = "markdown"
    HTML = "html"
    NOTION = "notion"
    GOOGLE_DOCS = "google_docs"
    JSON = "json"


class ExportRequest(BaseModel):
    content: str
    format: ExportFormat
    title: Optional[str] = None
    include_metadata: bool = False


class ExportResponse(BaseModel):
    format: ExportFormat
    content: str
    mime_type: str
    filename: str


# ============ Webhook Payload Types ============

class GenerationPayload(BaseModel):
    id: int
    prompt: str
    output: str
    template_id: Optional[int] = None
    template_name: Optional[str] = None
    tone: Optional[str] = None
    is_favorite: bool
    created_at: str


class TemplatePayload(BaseModel):
    id: int
    name: str
    platform: str
    category: str
    is_custom: bool
    created_at: str


class BrandPayload(BaseModel):
    id: int
    name: str
    tone: Optional[str] = None
    is_default: bool
    created_at: str


class ABTestPayload(BaseModel):
    id: int
    generation_id: int
    winner: str
    winner_reason: Optional[str] = None
    decided_at: str


class WebhookPayload(BaseModel):
    event: WebhookEvent
    timestamp: str
    data: Dict[str, Any]
