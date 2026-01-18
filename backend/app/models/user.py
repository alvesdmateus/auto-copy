from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON, Enum as SQLEnum
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserTier(str, enum.Enum):
    FREE = "free"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    # Profile
    full_name = Column(String(200), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    bio = Column(Text, nullable=True)

    # Tier and limits
    tier = Column(SQLEnum(UserTier), default=UserTier.FREE, nullable=False)
    generation_limit = Column(Integer, default=50)  # Per day for free tier
    generations_today = Column(Integer, default=0)
    generations_total = Column(Integer, default=0)

    # Status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)

    # OAuth
    oauth_provider = Column(String(50), nullable=True)  # google, github, etc.
    oauth_id = Column(String(255), nullable=True)

    # Settings
    settings = Column(JSON, default=dict)

    # Timestamps
    last_login = Column(DateTime, nullable=True)
    last_generation = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(50), nullable=True)  # generation, template, brand, etc.
    resource_id = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)


class WhiteLabelConfig(Base):
    __tablename__ = "whitelabel_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, unique=True, index=True)

    # Branding
    company_name = Column(String(200), nullable=True)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    primary_color = Column(String(7), default="#7C3AED")  # Purple
    secondary_color = Column(String(7), default="#10B981")  # Green

    # Custom domain
    custom_domain = Column(String(255), nullable=True, unique=True)
    domain_verified = Column(Boolean, default=False)

    # Footer/legal
    footer_text = Column(Text, nullable=True)
    privacy_url = Column(String(500), nullable=True)
    terms_url = Column(String(500), nullable=True)

    # Features
    hide_powered_by = Column(Boolean, default=False)
    custom_email_from = Column(String(255), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class UsageRecord(Base):
    __tablename__ = "usage_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)
    generation_count = Column(Integer, default=0)
    api_calls = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    features_used = Column(JSON, default=list)  # List of feature names used

    class Config:
        # Unique constraint on user_id + date
        pass
