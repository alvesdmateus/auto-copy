from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import datetime, timedelta
from typing import Optional, List

from app.database import get_db
from app.models import Generation, Template
from app.services.analytics import get_text_analyzer, TextAnalyzer
from app.schemas.analytics import (
    ReadabilityRequest,
    ReadabilityMetrics,
    SentimentRequest,
    SentimentAnalysis,
    SEORequest,
    SEOAnalysis,
    EngagementRequest,
    EngagementPrediction,
    FullAnalysisRequest,
    FullAnalysis,
    UsageAnalytics,
    GenerationStats,
    TemplateUsageStats,
    ABTestCreate,
    ABTestUpdate,
    ABTestResult,
    ABTestStats,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# ============ Text Analysis Endpoints ============

@router.post("/readability", response_model=ReadabilityMetrics)
async def analyze_readability(
    request: ReadabilityRequest,
    analyzer: TextAnalyzer = Depends(get_text_analyzer),
):
    """Analyze text readability with Flesch-Kincaid and other metrics."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = analyzer.analyze_readability(request.text)
    return ReadabilityMetrics(**result)


@router.post("/sentiment", response_model=SentimentAnalysis)
async def analyze_sentiment(
    request: SentimentRequest,
    analyzer: TextAnalyzer = Depends(get_text_analyzer),
):
    """Analyze sentiment and emotional tone of text."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = analyzer.analyze_sentiment(request.text)
    return SentimentAnalysis(**result)


@router.post("/seo", response_model=SEOAnalysis)
async def analyze_seo(
    request: SEORequest,
    analyzer: TextAnalyzer = Depends(get_text_analyzer),
):
    """Analyze SEO factors including keyword density and structure."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = analyzer.analyze_seo(
        request.text,
        request.target_keywords,
        request.content_type
    )
    return SEOAnalysis(**result)


@router.post("/engagement", response_model=EngagementPrediction)
async def predict_engagement(
    request: EngagementRequest,
    analyzer: TextAnalyzer = Depends(get_text_analyzer),
):
    """Predict engagement potential of content."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = analyzer.predict_engagement(
        request.text,
        request.content_type,
        request.platform
    )
    return EngagementPrediction(**result)


@router.post("/full", response_model=FullAnalysis)
async def full_analysis(
    request: FullAnalysisRequest,
    analyzer: TextAnalyzer = Depends(get_text_analyzer),
):
    """Run complete analysis (readability, sentiment, SEO, engagement)."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    result = analyzer.full_analysis(
        request.text,
        request.target_keywords,
        request.content_type,
        request.platform
    )
    return FullAnalysis(
        readability=ReadabilityMetrics(**result["readability"]),
        sentiment=SentimentAnalysis(**result["sentiment"]),
        seo=SEOAnalysis(**result["seo"]),
        engagement=EngagementPrediction(**result["engagement"]),
    )


# ============ Usage Analytics Endpoints ============

@router.get("/usage", response_model=UsageAnalytics)
async def get_usage_analytics(
    db: AsyncSession = Depends(get_db),
):
    """Get usage analytics including generation stats and template usage."""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    # Total generations
    total_result = await db.execute(select(func.count(Generation.id)))
    total_generations = total_result.scalar() or 0

    # Generations today
    today_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.created_at >= today_start)
    )
    generations_today = today_result.scalar() or 0

    # Generations this week
    week_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.created_at >= week_start)
    )
    generations_this_week = week_result.scalar() or 0

    # Generations this month
    month_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.created_at >= month_start)
    )
    generations_this_month = month_result.scalar() or 0

    # Total favorites
    fav_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.is_favorite == True)
    )
    total_favorites = fav_result.scalar() or 0

    # Average output length
    avg_len_result = await db.execute(
        select(func.avg(func.length(Generation.output)))
    )
    avg_output_length = avg_len_result.scalar() or 0

    # Generations by tone
    tone_result = await db.execute(
        select(Generation.tone, func.count(Generation.id))
        .where(Generation.tone.isnot(None))
        .group_by(Generation.tone)
    )
    generations_by_tone = {row[0]: row[1] for row in tone_result.fetchall()}

    # Generations by template
    template_result = await db.execute(
        select(Template.name, func.count(Generation.id))
        .join(Template, Generation.template_id == Template.id)
        .group_by(Template.name)
    )
    generations_by_template = {row[0]: row[1] for row in template_result.fetchall()}

    # Calculate avg generations per day (last 30 days)
    thirty_days_ago = now - timedelta(days=30)
    last_30_result = await db.execute(
        select(func.count(Generation.id)).where(Generation.created_at >= thirty_days_ago)
    )
    last_30_count = last_30_result.scalar() or 0
    avg_per_day = last_30_count / 30

    # Favorite rate
    favorite_rate = (total_favorites / total_generations * 100) if total_generations > 0 else 0

    generation_stats = GenerationStats(
        total_generations=total_generations,
        generations_today=generations_today,
        generations_this_week=generations_this_week,
        generations_this_month=generations_this_month,
        avg_generations_per_day=round(avg_per_day, 1),
        peak_hour=None,  # Would need more complex query
        peak_day=None,
        generations_by_tone=generations_by_tone,
        generations_by_template=generations_by_template,
        total_favorites=total_favorites,
        favorite_rate=round(favorite_rate, 1),
        avg_output_length=round(avg_output_length, 0),
    )

    # Top templates
    top_templates_result = await db.execute(
        select(
            Template.id,
            Template.name,
            func.count(Generation.id).label("usage_count"),
            func.max(Generation.created_at).label("last_used"),
            func.avg(func.length(Generation.output)).label("avg_length"),
        )
        .join(Generation, Template.id == Generation.template_id)
        .group_by(Template.id, Template.name)
        .order_by(desc("usage_count"))
        .limit(10)
    )

    top_templates = []
    for row in top_templates_result.fetchall():
        # Get favorite rate for this template
        fav_count_result = await db.execute(
            select(func.count(Generation.id))
            .where(Generation.template_id == row[0])
            .where(Generation.is_favorite == True)
        )
        fav_count = fav_count_result.scalar() or 0
        template_fav_rate = (fav_count / row[2] * 100) if row[2] > 0 else 0

        top_templates.append(TemplateUsageStats(
            template_id=row[0],
            template_name=row[1],
            usage_count=row[2],
            last_used=row[3],
            avg_output_length=round(row[4] or 0, 0),
            favorite_rate=round(template_fav_rate, 1),
        ))

    # Recent activity (last 10 generations)
    recent_result = await db.execute(
        select(Generation)
        .order_by(desc(Generation.created_at))
        .limit(10)
    )
    recent_generations = recent_result.scalars().all()
    recent_activity = [
        {
            "id": g.id,
            "prompt": g.prompt[:50] + "..." if len(g.prompt) > 50 else g.prompt,
            "created_at": g.created_at.isoformat(),
            "is_favorite": g.is_favorite,
        }
        for g in recent_generations
    ]

    return UsageAnalytics(
        generation_stats=generation_stats,
        top_templates=top_templates,
        recent_activity=recent_activity,
    )


# ============ A/B Test Tracking ============

# We need to create the ABTest model first, but for now we'll use a simple in-memory store
# In production, this should be a database table
_ab_tests: dict = {}
_ab_test_counter = 0


@router.post("/ab-tests", response_model=ABTestResult)
async def create_ab_test(
    test: ABTestCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new A/B test record."""
    global _ab_test_counter

    # Verify generation exists
    result = await db.execute(
        select(Generation).where(Generation.id == test.generation_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation not found")

    _ab_test_counter += 1
    ab_test = {
        "id": _ab_test_counter,
        "generation_id": test.generation_id,
        "variant_a": test.variant_a,
        "variant_b": test.variant_b,
        "winner": None,
        "winner_reason": None,
        "created_at": datetime.utcnow(),
        "decided_at": None,
    }
    _ab_tests[_ab_test_counter] = ab_test

    return ABTestResult(**ab_test)


@router.get("/ab-tests", response_model=List[ABTestResult])
async def list_ab_tests(
    decided_only: bool = Query(False),
    limit: int = Query(20, ge=1, le=100),
):
    """List A/B tests."""
    tests = list(_ab_tests.values())

    if decided_only:
        tests = [t for t in tests if t["winner"] is not None]

    # Sort by created_at descending
    tests.sort(key=lambda x: x["created_at"], reverse=True)

    return [ABTestResult(**t) for t in tests[:limit]]


@router.get("/ab-tests/{test_id}", response_model=ABTestResult)
async def get_ab_test(test_id: int):
    """Get a specific A/B test."""
    if test_id not in _ab_tests:
        raise HTTPException(status_code=404, detail="A/B test not found")

    return ABTestResult(**_ab_tests[test_id])


@router.put("/ab-tests/{test_id}", response_model=ABTestResult)
async def update_ab_test(test_id: int, update: ABTestUpdate):
    """Record the winner of an A/B test."""
    if test_id not in _ab_tests:
        raise HTTPException(status_code=404, detail="A/B test not found")

    test = _ab_tests[test_id]
    if test["winner"] is not None:
        raise HTTPException(status_code=400, detail="A/B test already has a winner")

    test["winner"] = update.winner
    test["winner_reason"] = update.winner_reason
    test["decided_at"] = datetime.utcnow()

    return ABTestResult(**test)


@router.get("/ab-tests/stats", response_model=ABTestStats)
async def get_ab_test_stats():
    """Get A/B test statistics."""
    tests = list(_ab_tests.values())

    total = len(tests)
    decided = [t for t in tests if t["winner"] is not None]
    decided_count = len(decided)

    a_wins = sum(1 for t in decided if t["winner"] == "A")
    b_wins = sum(1 for t in decided if t["winner"] == "B")

    # Calculate average decision time
    avg_decision_time = None
    if decided:
        decision_times = []
        for t in decided:
            if t["decided_at"] and t["created_at"]:
                delta = t["decided_at"] - t["created_at"]
                decision_times.append(delta.total_seconds() / 3600)  # Hours
        if decision_times:
            avg_decision_time = sum(decision_times) / len(decision_times)

    return ABTestStats(
        total_tests=total,
        decided_tests=decided_count,
        variant_a_wins=a_wins,
        variant_b_wins=b_wins,
        undecided_tests=total - decided_count,
        avg_decision_time_hours=round(avg_decision_time, 1) if avg_decision_time else None,
    )


@router.delete("/ab-tests/{test_id}")
async def delete_ab_test(test_id: int):
    """Delete an A/B test."""
    if test_id not in _ab_tests:
        raise HTTPException(status_code=404, detail="A/B test not found")

    del _ab_tests[test_id]
    return {"message": "A/B test deleted"}
