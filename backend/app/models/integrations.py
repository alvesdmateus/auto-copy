from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    url = Column(String(500), nullable=False)
    events = Column(JSON, nullable=False)  # List of event types
    secret = Column(String(64), nullable=True)  # For HMAC signing
    is_active = Column(Boolean, default=True)
    headers = Column(JSON, nullable=True)  # Custom headers

    # Tracking
    last_triggered = Column(DateTime, nullable=True)
    last_status = Column(Integer, nullable=True)
    failure_count = Column(Integer, default=0)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class WebhookDelivery(Base):
    __tablename__ = "webhook_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, nullable=False, index=True)
    event = Column(String(50), nullable=False)
    payload = Column(JSON, nullable=False)
    status_code = Column(Integer, nullable=True)
    response_body = Column(Text, nullable=True)
    success = Column(Boolean, default=False)
    delivered_at = Column(DateTime, server_default=func.now())


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    key_hash = Column(String(64), nullable=False, unique=True)  # SHA-256 hash
    key_prefix = Column(String(8), nullable=False)  # For identification
    scopes = Column(JSON, nullable=False)  # List of allowed scopes
    is_active = Column(Boolean, default=True)

    # Usage tracking
    last_used = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)

    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class IntegrationConfig(Base):
    __tablename__ = "integration_configs"

    id = Column(Integer, primary_key=True, index=True)
    integration_type = Column(String(50), nullable=False, unique=True)  # notion, google, slack
    config = Column(JSON, nullable=False)  # Encrypted config data
    is_connected = Column(Boolean, default=False)
    last_sync = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
