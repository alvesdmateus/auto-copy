from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.database import get_db
from app.models import Generation
from app.schemas import GenerationHistory

router = APIRouter(prefix="/api/history", tags=["history"])


@router.get("", response_model=List[GenerationHistory])
async def list_history(
    favorites_only: bool = Query(False),
    search: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
):
    """List generation history with optional filters."""
    query = select(Generation).order_by(desc(Generation.created_at))

    if favorites_only:
        query = query.where(Generation.is_favorite == True)

    if search:
        query = query.where(
            Generation.prompt.ilike(f"%{search}%")
            | Generation.output.ilike(f"%{search}%")
        )

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    generations = result.scalars().all()
    return generations


@router.get("/{history_id}", response_model=GenerationHistory)
async def get_history_item(history_id: int, db: AsyncSession = Depends(get_db)):
    """Get a specific history item by ID."""
    result = await db.execute(select(Generation).where(Generation.id == history_id))
    generation = result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="History item not found")
    return generation


@router.post("/{history_id}/favorite")
async def toggle_favorite(history_id: int, db: AsyncSession = Depends(get_db)):
    """Toggle favorite status for a history item."""
    result = await db.execute(select(Generation).where(Generation.id == history_id))
    generation = result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="History item not found")

    generation.is_favorite = not generation.is_favorite
    await db.commit()
    return {"is_favorite": generation.is_favorite}


@router.delete("/{history_id}")
async def delete_history_item(history_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a history item."""
    result = await db.execute(select(Generation).where(Generation.id == history_id))
    generation = result.scalar_one_or_none()
    if not generation:
        raise HTTPException(status_code=404, detail="History item not found")

    await db.delete(generation)
    await db.commit()
    return {"message": "History item deleted"}
