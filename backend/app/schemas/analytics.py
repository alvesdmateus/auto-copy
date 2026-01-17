from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum


# ============ Readability ============

class ReadabilityMetrics(BaseModel):
    flesch_reading_ease: float = Field(..., description="Flesch Reading Ease score (0-100, higher = easier)")
    flesch_kincaid_grade: float = Field(..., description="Flesch-Kincaid Grade Level")
    gunning_fog: float = Field(..., description="Gunning Fog Index")
    smog_index: float = Field(..., description="SMOG Index")
    automated_readability_index: float = Field(..., description="Automated Readability Index")
    coleman_liau_index: float = Field(..., description="Coleman-Liau Index")
    avg_grade_level: float = Field(..., description="Average of all grade level metrics")
    reading_time_seconds: int = Field(..., description="Estimated reading time in seconds")

    # Text statistics
    word_count: int
    sentence_count: int
    paragraph_count: int
    avg_words_per_sentence: float
    avg_syllables_per_word: float

    # Interpretation
    difficulty_level: str = Field(..., description="easy, moderate, difficult, very_difficult")
    target_audience: str = Field(..., description="Suggested target audience based on readability")


class ReadabilityRequest(BaseModel):
    text: str


# ============ Sentiment Analysis ============

class SentimentType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    MIXED = "mixed"


class EmotionScore(BaseModel):
    emotion: str
    score: float = Field(..., ge=0, le=1)


class SentimentAnalysis(BaseModel):
    overall_sentiment: SentimentType
    sentiment_score: float = Field(..., ge=-1, le=1, description="-1 (negative) to 1 (positive)")
    confidence: float = Field(..., ge=0, le=1)

    # Emotional breakdown
    emotions: List[EmotionScore] = Field(default_factory=list)

    # Tone indicators
    is_urgent: bool = False
    is_persuasive: bool = False
    is_informative: bool = False
    is_casual: bool = False
    is_formal: bool = False

    # Marketing-specific
    call_to_action_strength: float = Field(default=0.0, ge=0, le=1)
    emotional_appeal: float = Field(default=0.0, ge=0, le=1)


class SentimentRequest(BaseModel):
    text: str


# ============ SEO Analysis ============

class KeywordAnalysis(BaseModel):
    keyword: str
    count: int
    density: float = Field(..., description="Percentage of total words")
    in_title: bool = False
    in_headings: bool = False
    in_first_paragraph: bool = False


class HeadingStructure(BaseModel):
    tag: str  # h1, h2, h3, etc.
    text: str
    word_count: int


class SEOAnalysis(BaseModel):
    # Overall score
    seo_score: float = Field(..., ge=0, le=100)

    # Content metrics
    word_count: int
    ideal_word_count_range: str

    # Keyword analysis
    keywords: List[KeywordAnalysis] = Field(default_factory=list)
    keyword_stuffing_warning: bool = False

    # Structure
    headings: List[HeadingStructure] = Field(default_factory=list)
    has_h1: bool = False
    heading_hierarchy_valid: bool = True

    # Readability for SEO
    paragraph_count: int
    avg_paragraph_length: float
    short_paragraphs_ratio: float = Field(..., description="Ratio of paragraphs under 3 sentences")

    # Suggestions
    suggestions: List[str] = Field(default_factory=list)


class SEORequest(BaseModel):
    text: str
    target_keywords: Optional[List[str]] = None
    content_type: str = "blog"  # blog, landing, product, etc.


# ============ Engagement Prediction ============

class EngagementPrediction(BaseModel):
    overall_score: float = Field(..., ge=0, le=100, description="Predicted engagement score")

    # Component scores
    headline_score: float = Field(default=0.0, ge=0, le=100)
    hook_score: float = Field(default=0.0, ge=0, le=100)
    readability_score: float = Field(default=0.0, ge=0, le=100)
    emotional_score: float = Field(default=0.0, ge=0, le=100)
    cta_score: float = Field(default=0.0, ge=0, le=100)

    # Predictions
    predicted_click_rate: str = Field(..., description="low, medium, high, very_high")
    predicted_read_completion: float = Field(..., ge=0, le=1, description="Probability of reading to end")
    predicted_share_likelihood: str = Field(..., description="unlikely, possible, likely, very_likely")

    # Improvement suggestions
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


class EngagementRequest(BaseModel):
    text: str
    content_type: str = "social"  # social, email, blog, ad, landing
    platform: Optional[str] = None  # instagram, twitter, linkedin, etc.


# ============ Usage Analytics ============

class TemplateUsageStats(BaseModel):
    template_id: int
    template_name: str
    usage_count: int
    last_used: Optional[datetime] = None
    avg_output_length: float
    favorite_rate: float = Field(..., description="Percentage marked as favorite")


class GenerationStats(BaseModel):
    total_generations: int
    generations_today: int
    generations_this_week: int
    generations_this_month: int

    avg_generations_per_day: float
    peak_hour: Optional[int] = None
    peak_day: Optional[str] = None

    # By type
    generations_by_tone: Dict[str, int] = Field(default_factory=dict)
    generations_by_template: Dict[str, int] = Field(default_factory=dict)

    # Quality metrics
    total_favorites: int
    favorite_rate: float
    avg_output_length: float


class UsageAnalytics(BaseModel):
    generation_stats: GenerationStats
    top_templates: List[TemplateUsageStats] = Field(default_factory=list)
    recent_activity: List[Dict] = Field(default_factory=list)


# ============ A/B Test Tracking ============

class ABTestResult(BaseModel):
    id: int
    generation_id: int
    variant_a: str
    variant_b: str
    winner: Optional[str] = None  # "A", "B", or None
    winner_reason: Optional[str] = None
    created_at: datetime
    decided_at: Optional[datetime] = None


class ABTestCreate(BaseModel):
    generation_id: int
    variant_a: str
    variant_b: str


class ABTestUpdate(BaseModel):
    winner: str = Field(..., pattern="^[AB]$")
    winner_reason: Optional[str] = None


class ABTestStats(BaseModel):
    total_tests: int
    decided_tests: int
    variant_a_wins: int
    variant_b_wins: int
    undecided_tests: int
    avg_decision_time_hours: Optional[float] = None


# ============ Combined Analysis ============

class FullAnalysis(BaseModel):
    readability: ReadabilityMetrics
    sentiment: SentimentAnalysis
    seo: SEOAnalysis
    engagement: EngagementPrediction


class FullAnalysisRequest(BaseModel):
    text: str
    target_keywords: Optional[List[str]] = None
    content_type: str = "blog"
    platform: Optional[str] = None
