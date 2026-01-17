from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============ Model Management ============

class OllamaModel(BaseModel):
    name: str
    model: str
    modified_at: str
    size: int
    digest: str
    details: Optional[Dict[str, Any]] = None


class ModelInfo(BaseModel):
    name: str
    modelfile: Optional[str] = None
    parameters: Optional[str] = None
    template: Optional[str] = None
    system: Optional[str] = None
    license: Optional[str] = None
    size: Optional[int] = None
    capabilities: List[str] = []  # e.g., ["text", "vision"]


class ModelListResponse(BaseModel):
    models: List[OllamaModel]
    current_model: str


class ModelSwitchRequest(BaseModel):
    model: str


class ModelSwitchResponse(BaseModel):
    success: bool
    current_model: str
    message: str


# ============ URL-to-Copy ============

class URLToCopyRequest(BaseModel):
    url: HttpUrl
    output_type: str = Field(default="rewrite", description="rewrite, summarize, or extract")
    tone: Optional[str] = None
    target_length: Optional[str] = Field(default=None, description="short, medium, or long")
    focus: Optional[str] = Field(default=None, description="What aspect to focus on")
    model: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class URLToCopyResponse(BaseModel):
    original_url: str
    extracted_title: Optional[str] = None
    extracted_content: str
    generated_copy: str
    word_count: int


# ============ Content Repurposing ============

class ContentFormat(str, Enum):
    BLOG_POST = "blog_post"
    SOCIAL_POST = "social_post"
    EMAIL = "email"
    AD_COPY = "ad_copy"
    TWEET_THREAD = "tweet_thread"
    LINKEDIN_POST = "linkedin_post"
    INSTAGRAM_CAPTION = "instagram_caption"
    VIDEO_SCRIPT = "video_script"
    PRESS_RELEASE = "press_release"
    PRODUCT_DESCRIPTION = "product_description"


class RepurposeRequest(BaseModel):
    content: str
    source_format: ContentFormat
    target_format: ContentFormat
    tone: Optional[str] = None
    target_platform: Optional[str] = None
    max_length: Optional[int] = None
    model: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class RepurposeResponse(BaseModel):
    original_format: ContentFormat
    target_format: ContentFormat
    original_content: str
    repurposed_content: str
    word_count: int


# ============ Translation ============

class Language(str, Enum):
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    ITALIAN = "it"
    PORTUGUESE = "pt"
    DUTCH = "nl"
    RUSSIAN = "ru"
    CHINESE = "zh"
    JAPANESE = "ja"
    KOREAN = "ko"
    ARABIC = "ar"
    HINDI = "hi"
    TURKISH = "tr"
    POLISH = "pl"
    SWEDISH = "sv"


LANGUAGE_NAMES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "nl": "Dutch",
    "ru": "Russian",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "tr": "Turkish",
    "pl": "Polish",
    "sv": "Swedish",
}


class TranslateRequest(BaseModel):
    content: str
    source_language: Optional[Language] = None  # Auto-detect if not provided
    target_language: Language
    preserve_tone: bool = True
    localize: bool = False  # Adapt to local culture, not just translate
    model: Optional[str] = None


class TranslateResponse(BaseModel):
    original_content: str
    translated_content: str
    source_language: str
    target_language: str
    detected_language: Optional[str] = None


class MultiTranslateRequest(BaseModel):
    content: str
    target_languages: List[Language]
    preserve_tone: bool = True
    model: Optional[str] = None


class MultiTranslateResponse(BaseModel):
    original_content: str
    translations: Dict[str, str]  # language code -> translated content


# ============ Bulk Generation ============

class BulkGenerationItem(BaseModel):
    prompt: str
    template_id: Optional[int] = None
    tone: Optional[str] = None
    variables: Optional[Dict[str, str]] = None


class BulkGenerationRequest(BaseModel):
    items: List[BulkGenerationItem]
    model: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class BulkGenerationResultItem(BaseModel):
    index: int
    prompt: str
    output: str
    success: bool
    error: Optional[str] = None


class BulkGenerationResponse(BaseModel):
    total: int
    successful: int
    failed: int
    results: List[BulkGenerationResultItem]


class CSVUploadResponse(BaseModel):
    rows_parsed: int
    items: List[BulkGenerationItem]
    errors: List[str]


# ============ Image-to-Copy ============

class ImageToCopyRequest(BaseModel):
    image_base64: str  # Base64 encoded image
    output_type: str = Field(default="description", description="description, ad_copy, social_post")
    tone: Optional[str] = None
    max_length: Optional[int] = None
    model: Optional[str] = None  # Must be a vision-capable model
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None
    additional_context: Optional[str] = None


class ImageToCopyResponse(BaseModel):
    generated_copy: str
    detected_objects: Optional[List[str]] = None
    image_description: Optional[str] = None
    word_count: int


# ============ Plagiarism Check ============

class PlagiarismCheckRequest(BaseModel):
    content: str
    check_against: Optional[List[str]] = None  # Optional list of content to check against


class SimilarityMatch(BaseModel):
    matched_text: str
    similarity_score: float
    source: Optional[str] = None


class PlagiarismCheckResponse(BaseModel):
    content: str
    is_original: bool
    originality_score: float  # 0-100, higher is more original
    matches: List[SimilarityMatch]
    word_count: int
    unique_phrases_ratio: float


# ============ Content Analysis ============

class ContentSuggestion(BaseModel):
    type: str  # improvement, warning, info
    message: str
    position: Optional[int] = None


class AIContentAnalysis(BaseModel):
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[ContentSuggestion]
    overall_quality_score: float  # 0-100
    tone_detected: str
    target_audience_fit: Optional[str] = None
