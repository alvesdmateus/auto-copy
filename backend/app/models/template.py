from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=False)
    prompt_template = Column(Text, nullable=False)
    is_custom = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
