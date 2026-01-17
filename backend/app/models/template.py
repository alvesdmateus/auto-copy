from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False, default="general")
    description = Column(Text, nullable=True)
    prompt_template = Column(Text, nullable=False)
    variables = Column(JSON, nullable=True)  # List of variable definitions
    wizard_steps = Column(JSON, nullable=True)  # Multi-step wizard configuration
    example_output = Column(Text, nullable=True)
    is_custom = Column(Boolean, default=False)
    is_ab_template = Column(Boolean, default=False)  # For A/B testing templates
    created_at = Column(DateTime(timezone=True), server_default=func.now())
