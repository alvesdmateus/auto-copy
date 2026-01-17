from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# ============ Project Schemas ============

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None
    is_archived: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    color: Optional[str]
    icon: Optional[str]
    is_archived: bool
    created_at: datetime
    updated_at: Optional[datetime]
    generation_count: Optional[int] = None

    class Config:
        from_attributes = True


# ============ Tag Schemas ============

class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')


class TagResponse(BaseModel):
    id: int
    name: str
    color: Optional[str]
    created_at: datetime
    usage_count: Optional[int] = None

    class Config:
        from_attributes = True


# ============ Comment Schemas ============

class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)
    author_name: Optional[str] = Field(None, max_length=100)


class CommentUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)


class CommentResponse(BaseModel):
    id: int
    generation_id: int
    content: str
    author_name: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ============ Version History Schemas ============

class VersionCreate(BaseModel):
    content: str
    change_description: Optional[str] = Field(None, max_length=200)


class VersionResponse(BaseModel):
    id: int
    generation_id: int
    version_number: int
    content: str
    change_description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============ Share Link Schemas ============

class ShareLinkCreate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    allow_comments: bool = False
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class ShareLinkUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    is_active: Optional[bool] = None
    allow_comments: Optional[bool] = None


class ShareLinkResponse(BaseModel):
    id: int
    generation_id: int
    token: str
    title: Optional[str]
    is_active: bool
    allow_comments: bool
    expires_at: Optional[datetime]
    view_count: int
    created_at: datetime
    share_url: Optional[str] = None

    class Config:
        from_attributes = True


class SharedContentResponse(BaseModel):
    """Response for public shared content view."""
    title: Optional[str]
    output: str
    prompt: Optional[str]  # May be hidden for privacy
    tone: Optional[str]
    created_at: datetime
    allow_comments: bool
    comments: Optional[List[CommentResponse]] = None


# ============ Generation with Workspace Info ============

class GenerationWorkspaceUpdate(BaseModel):
    """Update generation's project and tags."""
    project_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class GenerationWithWorkspace(BaseModel):
    """Generation response including workspace info."""
    id: int
    prompt: str
    template_id: Optional[int]
    project_id: Optional[int]
    tone: Optional[str]
    output: str
    is_favorite: bool
    created_at: datetime
    updated_at: Optional[datetime]
    project: Optional[ProjectResponse] = None
    tags: List[TagResponse] = []
    comment_count: int = 0
    version_count: int = 0
    has_share_link: bool = False

    class Config:
        from_attributes = True
