from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models import Template
from app.schemas import TemplateCreate, TemplateResponse

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
async def list_templates(db: AsyncSession = Depends(get_db)):
    """List all templates."""
    result = await db.execute(select(Template).order_by(Template.name))
    templates = result.scalars().all()
    return templates


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific template by ID."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateResponse)
async def create_template(
    template: TemplateCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new custom template."""
    db_template = Template(
        name=template.name,
        platform=template.platform,
        prompt_template=template.prompt_template,
        is_custom=True,
    )
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    return db_template


@router.delete("/{template_id}")
async def delete_template(template_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a custom template."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if not template.is_custom:
        raise HTTPException(status_code=400, detail="Cannot delete built-in templates")
    await db.delete(template)
    await db.commit()
    return {"message": "Template deleted"}
