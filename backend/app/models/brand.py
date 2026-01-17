from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class Brand(Base):
    """Brand profile for consistent voice across generations."""
    __tablename__ = "brands"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Voice and tone
    tone = Column(String(50), nullable=True)  # Primary tone (professional, casual, etc.)
    voice_attributes = Column(JSON, nullable=True)  # List of voice descriptors

    # Keywords and language
    keywords = Column(JSON, nullable=True)  # Words to include/emphasize
    avoid_words = Column(JSON, nullable=True)  # Words to never use

    # Brand voice examples - sample copy that represents the brand's style
    voice_examples = Column(JSON, nullable=True)  # List of example texts

    # Style guide rules
    style_rules = Column(JSON, nullable=True)  # Custom rules for enforcement

    is_default = Column(Boolean, default=False)  # Default brand to use
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CustomTone(Base):
    """Custom tone definitions beyond the presets."""
    __tablename__ = "custom_tones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Tone characteristics
    formality = Column(Integer, default=50)  # 0-100: casual to formal
    energy = Column(Integer, default=50)  # 0-100: calm to energetic
    humor = Column(Integer, default=0)  # 0-100: serious to playful

    # Prompt modifiers
    prompt_prefix = Column(Text, nullable=True)  # Added before the main prompt
    style_instructions = Column(Text, nullable=True)  # Specific writing style instructions

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Persona(Base):
    """Target audience persona for better targeted copy."""
    __tablename__ = "personas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Demographics
    age_range = Column(String(50), nullable=True)  # e.g., "25-34"
    gender = Column(String(50), nullable=True)  # e.g., "All", "Female", "Male"
    location = Column(String(100), nullable=True)  # Geographic target
    occupation = Column(String(100), nullable=True)
    income_level = Column(String(50), nullable=True)

    # Psychographics
    interests = Column(JSON, nullable=True)  # List of interests/hobbies
    values = Column(JSON, nullable=True)  # What they care about
    pain_points = Column(JSON, nullable=True)  # Problems they face
    goals = Column(JSON, nullable=True)  # What they want to achieve

    # Behavior
    buying_motivations = Column(JSON, nullable=True)  # What drives purchases
    objections = Column(JSON, nullable=True)  # Common objections/concerns
    preferred_channels = Column(JSON, nullable=True)  # Where they consume content

    # Communication preferences
    communication_style = Column(String(50), nullable=True)  # How they like to be addressed
    language_level = Column(String(50), nullable=True)  # Simple, technical, etc.

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
