from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models import (
    Project, Tag, Comment, GenerationVersion, ShareLink, Generation, generation_tags
)
from app.schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse,
    TagCreate, TagUpdate, TagResponse,
    CommentCreate, CommentUpdate, CommentResponse,
    VersionCreate, VersionResponse,
    ShareLinkCreate, ShareLinkUpdate, ShareLinkResponse, SharedContentResponse,
    GenerationWorkspaceUpdate, GenerationWithWorkspace,
)

router = APIRouter(prefix="/api/workspace", tags=["workspace"])


# ============ Project Endpoints ============

@router.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    include_archived: bool = False,
    db: AsyncSession = Depends(get_db),
):
    """List all projects with generation counts."""
    query = select(Project)
    if not include_archived:
        query = query.where(Project.is_archived == False)
    query = query.order_by(Project.name)

    result = await db.execute(query)
    projects = result.scalars().all()

    # Get generation counts
    response = []
    for project in projects:
        count_result = await db.execute(
            select(func.count(Generation.id)).where(Generation.project_id == project.id)
        )
        count = count_result.scalar() or 0

        proj_dict = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "color": project.color,
            "icon": project.icon,
            "is_archived": project.is_archived,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "generation_count": count,
        }
        response.append(ProjectResponse(**proj_dict))

    return response


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get generation count
    count_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.project_id == project.id)
    )
    count = count_result.scalar() or 0

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        color=project.color,
        icon=project.icon,
        is_archived=project.is_archived,
        created_at=project.created_at,
        updated_at=project.updated_at,
        generation_count=count,
    )


@router.post("/projects", response_model=ProjectResponse)
async def create_project(project: ProjectCreate, db: AsyncSession = Depends(get_db)):
    """Create a new project."""
    db_project = Project(
        name=project.name,
        description=project.description,
        color=project.color,
        icon=project.icon,
    )
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)

    return ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        color=db_project.color,
        icon=db_project.icon,
        is_archived=db_project.is_archived,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        generation_count=0,
    )


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    db_project = result.scalar_one_or_none()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_project, field, value)

    await db.commit()
    await db.refresh(db_project)

    # Get generation count
    count_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.project_id == db_project.id)
    )
    count = count_result.scalar() or 0

    return ProjectResponse(
        id=db_project.id,
        name=db_project.name,
        description=db_project.description,
        color=db_project.color,
        icon=db_project.icon,
        is_archived=db_project.is_archived,
        created_at=db_project.created_at,
        updated_at=db_project.updated_at,
        generation_count=count,
    )


@router.delete("/projects/{project_id}")
async def delete_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a project (generations will have project_id set to NULL)."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()
    return {"message": "Project deleted"}


# ============ Tag Endpoints ============

@router.get("/tags", response_model=List[TagResponse])
async def list_tags(db: AsyncSession = Depends(get_db)):
    """List all tags with usage counts."""
    result = await db.execute(select(Tag).order_by(Tag.name))
    tags = result.scalars().all()

    response = []
    for tag in tags:
        # Count generations using this tag
        count_result = await db.execute(
            select(func.count()).select_from(generation_tags).where(
                generation_tags.c.tag_id == tag.id
            )
        )
        count = count_result.scalar() or 0

        response.append(TagResponse(
            id=tag.id,
            name=tag.name,
            color=tag.color,
            created_at=tag.created_at,
            usage_count=count,
        ))

    return response


@router.post("/tags", response_model=TagResponse)
async def create_tag(tag: TagCreate, db: AsyncSession = Depends(get_db)):
    """Create a new tag."""
    # Check for duplicate
    existing = await db.execute(select(Tag).where(Tag.name == tag.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Tag with this name already exists")

    db_tag = Tag(name=tag.name, color=tag.color)
    db.add(db_tag)
    await db.commit()
    await db.refresh(db_tag)

    return TagResponse(
        id=db_tag.id,
        name=db_tag.name,
        color=db_tag.color,
        created_at=db_tag.created_at,
        usage_count=0,
    )


@router.put("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(tag_id: int, tag: TagUpdate, db: AsyncSession = Depends(get_db)):
    """Update a tag."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    db_tag = result.scalar_one_or_none()
    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    update_data = tag.model_dump(exclude_unset=True)

    # Check for duplicate name
    if "name" in update_data and update_data["name"] != db_tag.name:
        existing = await db.execute(select(Tag).where(Tag.name == update_data["name"]))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Tag with this name already exists")

    for field, value in update_data.items():
        setattr(db_tag, field, value)

    await db.commit()
    await db.refresh(db_tag)

    # Get usage count
    count_result = await db.execute(
        select(func.count()).select_from(generation_tags).where(
            generation_tags.c.tag_id == db_tag.id
        )
    )
    count = count_result.scalar() or 0

    return TagResponse(
        id=db_tag.id,
        name=db_tag.name,
        color=db_tag.color,
        created_at=db_tag.created_at,
        usage_count=count,
    )


@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a tag."""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    await db.delete(tag)
    await db.commit()
    return {"message": "Tag deleted"}


# ============ Comment Endpoints ============

@router.get("/generations/{generation_id}/comments", response_model=List[CommentResponse])
async def list_comments(generation_id: int, db: AsyncSession = Depends(get_db)):
    """List all comments for a generation."""
    # Verify generation exists
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    if not gen_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation not found")

    result = await db.execute(
        select(Comment)
        .where(Comment.generation_id == generation_id)
        .order_by(Comment.created_at.desc())
    )
    return result.scalars().all()


@router.post("/generations/{generation_id}/comments", response_model=CommentResponse)
async def create_comment(
    generation_id: int,
    comment: CommentCreate,
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a generation."""
    # Verify generation exists
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    if not gen_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation not found")

    db_comment = Comment(
        generation_id=generation_id,
        content=comment.content,
        author_name=comment.author_name,
    )
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)
    return db_comment


@router.put("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment: CommentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a comment."""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    db_comment = result.scalar_one_or_none()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.content:
        db_comment.content = comment.content

    await db.commit()
    await db.refresh(db_comment)
    return db_comment


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a comment."""
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalar_one_or_none()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    await db.delete(comment)
    await db.commit()
    return {"message": "Comment deleted"}


# ============ Version History Endpoints ============

@router.get("/generations/{generation_id}/versions", response_model=List[VersionResponse])
async def list_versions(generation_id: int, db: AsyncSession = Depends(get_db)):
    """List all versions for a generation."""
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    if not gen_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation not found")

    result = await db.execute(
        select(GenerationVersion)
        .where(GenerationVersion.generation_id == generation_id)
        .order_by(GenerationVersion.version_number.desc())
    )
    return result.scalars().all()


@router.post("/generations/{generation_id}/versions", response_model=VersionResponse)
async def create_version(
    generation_id: int,
    version: VersionCreate,
    db: AsyncSession = Depends(get_db),
):
    """Save a new version of the generation content."""
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    generation = gen_result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    # Get the latest version number
    latest_result = await db.execute(
        select(func.max(GenerationVersion.version_number))
        .where(GenerationVersion.generation_id == generation_id)
    )
    latest_version = latest_result.scalar() or 0

    db_version = GenerationVersion(
        generation_id=generation_id,
        version_number=latest_version + 1,
        content=version.content,
        change_description=version.change_description,
    )
    db.add(db_version)
    await db.commit()
    await db.refresh(db_version)
    return db_version


@router.post("/generations/{generation_id}/versions/{version_id}/restore")
async def restore_version(
    generation_id: int,
    version_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Restore a previous version as the current content."""
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    generation = gen_result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    version_result = await db.execute(
        select(GenerationVersion).where(
            GenerationVersion.id == version_id,
            GenerationVersion.generation_id == generation_id
        )
    )
    version = version_result.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Save current as new version before restoring
    latest_result = await db.execute(
        select(func.max(GenerationVersion.version_number))
        .where(GenerationVersion.generation_id == generation_id)
    )
    latest_version = latest_result.scalar() or 0

    backup_version = GenerationVersion(
        generation_id=generation_id,
        version_number=latest_version + 1,
        content=generation.output,
        change_description=f"Backup before restoring v{version.version_number}",
    )
    db.add(backup_version)

    # Restore the old version
    generation.output = version.content

    await db.commit()
    return {"message": f"Restored version {version.version_number}"}


# ============ Share Link Endpoints ============

@router.get("/generations/{generation_id}/shares", response_model=List[ShareLinkResponse])
async def list_share_links(generation_id: int, db: AsyncSession = Depends(get_db)):
    """List all share links for a generation."""
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    if not gen_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation not found")

    result = await db.execute(
        select(ShareLink)
        .where(ShareLink.generation_id == generation_id)
        .order_by(ShareLink.created_at.desc())
    )
    shares = result.scalars().all()

    return [
        ShareLinkResponse(
            id=s.id,
            generation_id=s.generation_id,
            token=s.token,
            title=s.title,
            is_active=s.is_active,
            allow_comments=s.allow_comments,
            expires_at=s.expires_at,
            view_count=s.view_count,
            created_at=s.created_at,
            share_url=f"/share/{s.token}",
        )
        for s in shares
    ]


@router.post("/generations/{generation_id}/shares", response_model=ShareLinkResponse)
async def create_share_link(
    generation_id: int,
    share: ShareLinkCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a share link for a generation."""
    gen_result = await db.execute(select(Generation).where(Generation.id == generation_id))
    if not gen_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation not found")

    expires_at = None
    if share.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=share.expires_in_days)

    db_share = ShareLink(
        generation_id=generation_id,
        token=ShareLink.generate_token(),
        title=share.title,
        allow_comments=share.allow_comments,
        expires_at=expires_at,
    )
    db.add(db_share)
    await db.commit()
    await db.refresh(db_share)

    return ShareLinkResponse(
        id=db_share.id,
        generation_id=db_share.generation_id,
        token=db_share.token,
        title=db_share.title,
        is_active=db_share.is_active,
        allow_comments=db_share.allow_comments,
        expires_at=db_share.expires_at,
        view_count=db_share.view_count,
        created_at=db_share.created_at,
        share_url=f"/share/{db_share.token}",
    )


@router.put("/shares/{share_id}", response_model=ShareLinkResponse)
async def update_share_link(
    share_id: int,
    share: ShareLinkUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a share link."""
    result = await db.execute(select(ShareLink).where(ShareLink.id == share_id))
    db_share = result.scalar_one_or_none()
    if not db_share:
        raise HTTPException(status_code=404, detail="Share link not found")

    update_data = share.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_share, field, value)

    await db.commit()
    await db.refresh(db_share)

    return ShareLinkResponse(
        id=db_share.id,
        generation_id=db_share.generation_id,
        token=db_share.token,
        title=db_share.title,
        is_active=db_share.is_active,
        allow_comments=db_share.allow_comments,
        expires_at=db_share.expires_at,
        view_count=db_share.view_count,
        created_at=db_share.created_at,
        share_url=f"/share/{db_share.token}",
    )


@router.delete("/shares/{share_id}")
async def delete_share_link(share_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a share link."""
    result = await db.execute(select(ShareLink).where(ShareLink.id == share_id))
    share = result.scalar_one_or_none()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    await db.delete(share)
    await db.commit()
    return {"message": "Share link deleted"}


# Public share view endpoint
@router.get("/share/{token}", response_model=SharedContentResponse)
async def view_shared_content(token: str, db: AsyncSession = Depends(get_db)):
    """View shared content (public endpoint)."""
    result = await db.execute(
        select(ShareLink)
        .where(ShareLink.token == token)
        .options(selectinload(ShareLink.generation))
    )
    share = result.scalar_one_or_none()

    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    if not share.is_active:
        raise HTTPException(status_code=410, detail="Share link is no longer active")

    if share.expires_at and share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    # Increment view count
    share.view_count += 1
    await db.commit()

    # Get comments if allowed
    comments = None
    if share.allow_comments:
        comments_result = await db.execute(
            select(Comment)
            .where(Comment.generation_id == share.generation_id)
            .order_by(Comment.created_at.desc())
        )
        comments = [
            CommentResponse(
                id=c.id,
                generation_id=c.generation_id,
                content=c.content,
                author_name=c.author_name,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in comments_result.scalars().all()
        ]

    return SharedContentResponse(
        title=share.title,
        output=share.generation.output,
        prompt=None,  # Hide prompt for privacy
        tone=share.generation.tone,
        created_at=share.generation.created_at,
        allow_comments=share.allow_comments,
        comments=comments,
    )


# ============ Generation Workspace Management ============

@router.put("/generations/{generation_id}/organize", response_model=GenerationWithWorkspace)
async def organize_generation(
    generation_id: int,
    update: GenerationWorkspaceUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a generation's project and tags."""
    result = await db.execute(
        select(Generation)
        .where(Generation.id == generation_id)
        .options(selectinload(Generation.tags), selectinload(Generation.project))
    )
    generation = result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="Generation not found")

    # Update project
    if update.project_id is not None:
        if update.project_id == 0:  # Remove from project
            generation.project_id = None
        else:
            proj_result = await db.execute(select(Project).where(Project.id == update.project_id))
            if not proj_result.scalar_one_or_none():
                raise HTTPException(status_code=404, detail="Project not found")
            generation.project_id = update.project_id

    # Update tags
    if update.tag_ids is not None:
        # Clear existing tags
        generation.tags = []

        # Add new tags
        if update.tag_ids:
            tags_result = await db.execute(select(Tag).where(Tag.id.in_(update.tag_ids)))
            generation.tags = list(tags_result.scalars().all())

    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Generation)
        .where(Generation.id == generation_id)
        .options(
            selectinload(Generation.tags),
            selectinload(Generation.project),
            selectinload(Generation.comments),
            selectinload(Generation.versions),
            selectinload(Generation.share_links),
        )
    )
    generation = result.scalar_one()

    return GenerationWithWorkspace(
        id=generation.id,
        prompt=generation.prompt,
        template_id=generation.template_id,
        project_id=generation.project_id,
        tone=generation.tone,
        output=generation.output,
        is_favorite=generation.is_favorite,
        created_at=generation.created_at,
        updated_at=generation.updated_at,
        project=ProjectResponse(
            id=generation.project.id,
            name=generation.project.name,
            description=generation.project.description,
            color=generation.project.color,
            icon=generation.project.icon,
            is_archived=generation.project.is_archived,
            created_at=generation.project.created_at,
            updated_at=generation.project.updated_at,
        ) if generation.project else None,
        tags=[
            TagResponse(
                id=t.id,
                name=t.name,
                color=t.color,
                created_at=t.created_at,
            )
            for t in generation.tags
        ],
        comment_count=len(generation.comments),
        version_count=len(generation.versions),
        has_share_link=len(generation.share_links) > 0,
    )
