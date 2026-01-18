from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserTier(str, Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


# ============ Authentication ============

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=100)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


# ============ User Profile ============

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    tier: UserTier
    is_active: bool
    is_verified: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None


class UserSettings(BaseModel):
    theme: str = "light"
    default_tone: Optional[str] = None
    default_brand_id: Optional[int] = None
    notifications_enabled: bool = True
    email_notifications: bool = True


# ============ Usage & Limits ============

class UsageLimits(BaseModel):
    tier: UserTier
    generation_limit: int
    generations_today: int
    generations_remaining: int
    api_calls_limit: int
    api_calls_today: int
    features_available: List[str]
    features_locked: List[str]


TIER_LIMITS = {
    UserTier.FREE: {
        "generation_limit": 50,
        "api_calls_limit": 0,
        "features": ["basic_generation", "templates", "history"],
        "locked_features": ["bulk_generation", "api_access", "white_label", "priority_support", "custom_models"],
    },
    UserTier.PRO: {
        "generation_limit": 1000,
        "api_calls_limit": 5000,
        "features": ["basic_generation", "templates", "history", "bulk_generation", "api_access", "analytics", "brands", "personas"],
        "locked_features": ["white_label", "sso", "priority_support", "custom_models"],
    },
    UserTier.ENTERPRISE: {
        "generation_limit": -1,  # Unlimited
        "api_calls_limit": -1,  # Unlimited
        "features": ["basic_generation", "templates", "history", "bulk_generation", "api_access", "analytics", "brands", "personas", "white_label", "sso", "priority_support", "custom_models"],
        "locked_features": [],
    },
}


class TierInfo(BaseModel):
    tier: UserTier
    name: str
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    generation_limit: int
    api_calls_limit: int
    features: List[str]
    description: str


TIER_INFO = [
    TierInfo(
        tier=UserTier.FREE,
        name="Free",
        price_monthly=0,
        price_yearly=0,
        generation_limit=50,
        api_calls_limit=0,
        features=["50 generations/day", "Basic templates", "History"],
        description="Perfect for trying out Auto-Copy",
    ),
    TierInfo(
        tier=UserTier.PRO,
        name="Pro",
        price_monthly=29,
        price_yearly=290,
        generation_limit=1000,
        api_calls_limit=5000,
        features=["1000 generations/day", "All templates", "API access", "Bulk generation", "Analytics", "Brands & Personas"],
        description="For professionals and small teams",
    ),
    TierInfo(
        tier=UserTier.ENTERPRISE,
        name="Enterprise",
        price_monthly=None,
        price_yearly=None,
        generation_limit=-1,
        api_calls_limit=-1,
        features=["Unlimited generations", "White-label", "SSO", "Priority support", "Custom models", "Dedicated account manager"],
        description="For large teams and agencies",
    ),
]


# ============ Audit Logs ============

class AuditLogEntry(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogFilter(BaseModel):
    user_id: Optional[int] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0


# ============ White Label ============

class WhiteLabelConfig(BaseModel):
    company_name: Optional[str] = None
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#7C3AED"
    secondary_color: str = "#10B981"
    custom_domain: Optional[str] = None
    footer_text: Optional[str] = None
    privacy_url: Optional[str] = None
    terms_url: Optional[str] = None
    hide_powered_by: bool = False


class WhiteLabelResponse(WhiteLabelConfig):
    id: int
    user_id: int
    domain_verified: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ OAuth ============

class OAuthProvider(str, Enum):
    GOOGLE = "google"
    GITHUB = "github"


class OAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None


class OAuthUserInfo(BaseModel):
    provider: OAuthProvider
    oauth_id: str
    email: str
    name: Optional[str] = None
    avatar_url: Optional[str] = None
