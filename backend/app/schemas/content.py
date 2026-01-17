from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


# ============ Long-form Content ============

class OutlineSection(BaseModel):
    title: str
    key_points: List[str] = []


class LongFormRequest(BaseModel):
    topic: str
    content_type: str = "blog_post"  # blog_post, article, guide, tutorial
    target_audience: Optional[str] = None
    word_count: int = Field(default=1000, ge=300, le=5000)
    tone: Optional[str] = None
    keywords: Optional[List[str]] = None
    outline: Optional[List[OutlineSection]] = None  # Optional pre-defined outline
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class LongFormOutlineResponse(BaseModel):
    title: str
    introduction: str
    sections: List[OutlineSection]
    conclusion: str
    estimated_word_count: int


# ============ Email Sequences ============

class EmailType(str, Enum):
    WELCOME = "welcome"
    NURTURE = "nurture"
    SALES = "sales"
    ONBOARDING = "onboarding"
    RE_ENGAGEMENT = "re_engagement"
    ABANDONED_CART = "abandoned_cart"


class EmailSequenceRequest(BaseModel):
    sequence_type: EmailType
    product_or_service: str
    target_audience: Optional[str] = None
    email_count: int = Field(default=5, ge=2, le=10)
    days_between: int = Field(default=2, ge=1, le=14)
    tone: Optional[str] = None
    key_benefits: Optional[List[str]] = None
    call_to_action: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class EmailContent(BaseModel):
    day: int
    subject_line: str
    preview_text: str
    body: str
    call_to_action: str


class EmailSequenceResponse(BaseModel):
    sequence_name: str
    emails: List[EmailContent]


# ============ Ad Campaign ============

class AdPlatform(str, Enum):
    GOOGLE = "google"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    TIKTOK = "tiktok"


class AdCampaignRequest(BaseModel):
    platform: AdPlatform
    product_or_service: str
    target_audience: Optional[str] = None
    campaign_goal: str = "conversions"  # conversions, awareness, traffic, engagement
    key_benefits: Optional[List[str]] = None
    offer: Optional[str] = None
    variations: int = Field(default=3, ge=1, le=5)
    tone: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class AdVariation(BaseModel):
    headline: str
    description: str
    call_to_action: str
    primary_text: Optional[str] = None  # For Facebook/Instagram


class AdCampaignResponse(BaseModel):
    platform: str
    campaign_name: str
    variations: List[AdVariation]


# ============ SEO Content ============

class SEOContentRequest(BaseModel):
    page_url: Optional[str] = None
    page_topic: str
    target_keywords: List[str]
    page_type: str = "landing"  # landing, blog, product, service, about
    brand_id: Optional[int] = None


class SEOContentResponse(BaseModel):
    meta_title: str
    meta_description: str
    h1_suggestion: str
    alt_texts: List[str]
    schema_markup_suggestion: Optional[str] = None
    keyword_usage_tips: List[str]


# ============ Landing Page Copy ============

class LandingPageRequest(BaseModel):
    product_or_service: str
    target_audience: Optional[str] = None
    unique_value_proposition: Optional[str] = None
    key_features: Optional[List[str]] = None
    pain_points: Optional[List[str]] = None
    testimonials_count: int = Field(default=3, ge=0, le=5)
    faq_count: int = Field(default=5, ge=0, le=10)
    tone: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class Testimonial(BaseModel):
    quote: str
    author_name: str
    author_title: Optional[str] = None


class FAQ(BaseModel):
    question: str
    answer: str


class LandingPageResponse(BaseModel):
    hero_headline: str
    hero_subheadline: str
    hero_cta: str
    problem_section: str
    solution_section: str
    features: List[dict]  # {title, description, icon_suggestion}
    social_proof_headline: str
    testimonials: List[Testimonial]
    faq: List[FAQ]
    final_cta_headline: str
    final_cta_button: str


# ============ Video Scripts ============

class VideoType(str, Enum):
    TIKTOK = "tiktok"
    YOUTUBE_SHORT = "youtube_short"
    INSTAGRAM_REEL = "instagram_reel"
    YOUTUBE_LONG = "youtube_long"
    EXPLAINER = "explainer"
    TESTIMONIAL = "testimonial"


class VideoScriptRequest(BaseModel):
    video_type: VideoType
    topic: str
    target_audience: Optional[str] = None
    duration_seconds: int = Field(default=60, ge=15, le=600)
    key_message: Optional[str] = None
    call_to_action: Optional[str] = None
    tone: Optional[str] = None
    brand_id: Optional[int] = None
    persona_id: Optional[int] = None


class ScriptSection(BaseModel):
    timestamp: str
    section_type: str  # hook, intro, point_1, point_2, etc.
    visual_cue: str
    dialogue: str
    on_screen_text: Optional[str] = None


class VideoScriptResponse(BaseModel):
    title: str
    hook: str
    sections: List[ScriptSection]
    call_to_action: str
    total_duration: str
    thumbnail_suggestions: List[str]
