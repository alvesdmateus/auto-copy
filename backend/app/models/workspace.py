from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Table
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import secrets


# Many-to-many association table for Generation-Tag relationship
generation_tags = Table(
    "generation_tags",
    Base.metadata,
    Column("generation_id", Integer, ForeignKey("generations.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Project(Base):
    """Projects/Folders for organizing generations by campaign or client."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # Hex color for visual identification
    icon = Column(String(50), nullable=True)  # Icon name/emoji
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    generations = relationship("Generation", back_populates="project")


class Tag(Base):
    """Tags/Labels for categorizing and filtering generations."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    color = Column(String(7), nullable=True)  # Hex color
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    generations = relationship("Generation", secondary=generation_tags, back_populates="tags")


class Comment(Base):
    """Comments/feedback on generations."""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    generation_id = Column(Integer, ForeignKey("generations.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    author_name = Column(String(100), nullable=True)  # Optional author name
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    generation = relationship("Generation", back_populates="comments")


class GenerationVersion(Base):
    """Version history for tracking edits to generations."""
    __tablename__ = "generation_versions"

    id = Column(Integer, primary_key=True, index=True)
    generation_id = Column(Integer, ForeignKey("generations.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    change_description = Column(String(200), nullable=True)  # e.g., "Refined: made punchier"
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    generation = relationship("Generation", back_populates="versions")


class ShareLink(Base):
    """Public shareable links for generations."""
    __tablename__ = "share_links"

    id = Column(Integer, primary_key=True, index=True)
    generation_id = Column(Integer, ForeignKey("generations.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(32), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=True)  # Custom title for the share
    is_active = Column(Boolean, default=True)
    allow_comments = Column(Boolean, default=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional expiration
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    generation = relationship("Generation", back_populates="share_links")

    @staticmethod
    def generate_token():
        """Generate a secure random token for the share link."""
        return secrets.token_urlsafe(24)[:32]
