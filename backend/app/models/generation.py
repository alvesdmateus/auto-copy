from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base


class Generation(Base):
    __tablename__ = "generations"

    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    template_id = Column(Integer, ForeignKey("templates.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    tone = Column(String(50), nullable=True)
    output = Column(Text, nullable=False)
    is_favorite = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    project = relationship("Project", back_populates="generations")
    tags = relationship("Tag", secondary="generation_tags", back_populates="generations")
    comments = relationship("Comment", back_populates="generation", cascade="all, delete-orphan")
    versions = relationship("GenerationVersion", back_populates="generation", cascade="all, delete-orphan", order_by="GenerationVersion.version_number")
    share_links = relationship("ShareLink", back_populates="generation", cascade="all, delete-orphan")
