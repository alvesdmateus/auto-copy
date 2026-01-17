from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import Template
from app.schemas import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    TemplateExport,
    TemplateImport,
    TemplateCategory,
)

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    category: Optional[TemplateCategory] = Query(None),
    platform: Optional[str] = Query(None),
    custom_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """List all templates with optional filters."""
    query = select(Template).order_by(Template.category, Template.name)

    if category:
        query = query.where(Template.category == category.value)
    if platform:
        query = query.where(Template.platform == platform)
    if custom_only:
        query = query.where(Template.is_custom == True)

    result = await db.execute(query)
    templates = result.scalars().all()
    return templates


@router.get("/categories")
async def list_categories():
    """List all available template categories."""
    return [
        {"value": cat.value, "label": cat.value.replace("_", " ").title()}
        for cat in TemplateCategory
    ]


@router.get("/community")
async def list_community_templates():
    """List community/preset templates that can be imported."""
    return COMMUNITY_TEMPLATES


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
        category=template.category.value if template.category else "general",
        description=template.description,
        prompt_template=template.prompt_template,
        variables=[v.model_dump() for v in template.variables] if template.variables else None,
        wizard_steps=[s.model_dump() for s in template.wizard_steps] if template.wizard_steps else None,
        example_output=template.example_output,
        is_custom=True,
        is_ab_template=template.is_ab_template,
    )
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    return db_template


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: int,
    template: TemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a custom template."""
    result = await db.execute(select(Template).where(Template.id == template_id))
    db_template = result.scalar_one_or_none()
    if not db_template:
        raise HTTPException(status_code=404, detail="Template not found")
    if not db_template.is_custom:
        raise HTTPException(status_code=400, detail="Cannot edit built-in templates")

    update_data = template.model_dump(exclude_unset=True)
    if "category" in update_data and update_data["category"]:
        update_data["category"] = update_data["category"].value
    if "variables" in update_data and update_data["variables"]:
        update_data["variables"] = [v.model_dump() for v in update_data["variables"]]
    if "wizard_steps" in update_data and update_data["wizard_steps"]:
        update_data["wizard_steps"] = [s.model_dump() for s in update_data["wizard_steps"]]

    for field, value in update_data.items():
        setattr(db_template, field, value)

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


@router.post("/export", response_model=TemplateExport)
async def export_templates(
    template_ids: Optional[List[int]] = None,
    db: AsyncSession = Depends(get_db),
):
    """Export templates as JSON."""
    query = select(Template)
    if template_ids:
        query = query.where(Template.id.in_(template_ids))
    else:
        query = query.where(Template.is_custom == True)

    result = await db.execute(query)
    templates = result.scalars().all()

    export_data = []
    for t in templates:
        export_data.append(TemplateCreate(
            name=t.name,
            platform=t.platform,
            category=TemplateCategory(t.category) if t.category else TemplateCategory.GENERAL,
            description=t.description,
            prompt_template=t.prompt_template,
            variables=t.variables,
            wizard_steps=t.wizard_steps,
            example_output=t.example_output,
            is_custom=True,
            is_ab_template=t.is_ab_template or False,
        ))

    return TemplateExport(
        templates=export_data,
        exported_at=datetime.utcnow(),
        version="1.0",
    )


@router.post("/import", response_model=List[TemplateResponse])
async def import_templates(
    data: TemplateImport,
    db: AsyncSession = Depends(get_db),
):
    """Import templates from JSON."""
    imported = []
    for template in data.templates:
        db_template = Template(
            name=template.name,
            platform=template.platform,
            category=template.category.value if template.category else "general",
            description=template.description,
            prompt_template=template.prompt_template,
            variables=[v.model_dump() for v in template.variables] if template.variables else None,
            wizard_steps=[s.model_dump() for s in template.wizard_steps] if template.wizard_steps else None,
            example_output=template.example_output,
            is_custom=True,
            is_ab_template=template.is_ab_template,
        )
        db.add(db_template)
        await db.flush()
        imported.append(db_template)

    await db.commit()
    for t in imported:
        await db.refresh(t)

    return imported


@router.post("/import-community/{template_name}", response_model=TemplateResponse)
async def import_community_template(
    template_name: str,
    db: AsyncSession = Depends(get_db),
):
    """Import a community template by name."""
    template_data = next(
        (t for t in COMMUNITY_TEMPLATES if t["name"] == template_name),
        None
    )
    if not template_data:
        raise HTTPException(status_code=404, detail="Community template not found")

    db_template = Template(
        name=template_data["name"],
        platform=template_data["platform"],
        category=template_data["category"],
        description=template_data["description"],
        prompt_template=template_data["prompt_template"],
        variables=template_data.get("variables"),
        wizard_steps=template_data.get("wizard_steps"),
        example_output=template_data.get("example_output"),
        is_custom=True,
        is_ab_template=template_data.get("is_ab_template", False),
    )
    db.add(db_template)
    await db.commit()
    await db.refresh(db_template)
    return db_template


# Community templates library
COMMUNITY_TEMPLATES = [
    {
        "name": "AIDA Framework",
        "platform": "General",
        "category": "ads",
        "description": "Attention-Interest-Desire-Action copywriting framework",
        "prompt_template": """Write copy using the AIDA framework for {{product}}.

Target audience: {{audience}}
Key benefit: {{benefit}}

Structure:
1. ATTENTION: Hook that grabs attention
2. INTEREST: Build interest with features/benefits
3. DESIRE: Create emotional desire
4. ACTION: Clear call-to-action

Generate compelling AIDA copy now:""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Fitness app", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Busy professionals", "required": True, "type": "text"},
            {"name": "benefit", "label": "Key Benefit", "placeholder": "e.g., Save 2 hours daily", "required": True, "type": "text"},
        ],
        "example_output": "ATTENTION: Still wasting hours on ineffective workouts?\n\nINTEREST: FitPro app uses AI to create personalized 20-minute workouts...",
    },
    {
        "name": "PAS Framework",
        "platform": "General",
        "category": "ads",
        "description": "Problem-Agitate-Solution copywriting framework",
        "prompt_template": """Write copy using the PAS framework for {{product}}.

Problem to address: {{problem}}
Target audience: {{audience}}

Structure:
1. PROBLEM: Identify the pain point
2. AGITATE: Make the problem feel urgent
3. SOLUTION: Present your product as the solution

Generate compelling PAS copy now:""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Project management tool", "required": True, "type": "text"},
            {"name": "problem", "label": "Main Problem", "placeholder": "e.g., Missed deadlines", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Remote teams", "required": True, "type": "text"},
        ],
        "example_output": "PROBLEM: Your team keeps missing deadlines...\n\nAGITATE: Every missed deadline costs you clients, revenue, and reputation...",
    },
    {
        "name": "Before-After-Bridge",
        "platform": "General",
        "category": "ads",
        "description": "Show transformation from before to after state with guided wizard",
        "prompt_template": """Write copy using the Before-After-Bridge framework for {{product}}.

Target audience: {{audience}}
Transformation: From {{before}} to {{after}}

Structure:
1. BEFORE: Describe current painful situation
2. AFTER: Paint picture of ideal outcome
3. BRIDGE: Show how your product bridges the gap

Generate compelling BAB copy now:""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Online course", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Aspiring entrepreneurs", "required": True, "type": "text"},
            {"name": "before", "label": "Before State", "placeholder": "e.g., Stuck in 9-5 job", "required": True, "type": "text"},
            {"name": "after", "label": "After State", "placeholder": "e.g., Running profitable business", "required": True, "type": "text"},
        ],
        "wizard_steps": [
            {"title": "Your Offering", "description": "What product or service are you promoting?", "variables": ["product"]},
            {"title": "Your Audience", "description": "Who is your ideal customer?", "variables": ["audience"]},
            {"title": "The Transformation", "description": "Describe the journey from problem to solution", "variables": ["before", "after"]},
        ],
        "example_output": "BEFORE: You're stuck in a job you hate, watching others build their dreams...",
    },
    {
        "name": "Social Proof Post",
        "platform": "LinkedIn",
        "category": "social",
        "description": "Share results and testimonials",
        "prompt_template": """Write a LinkedIn post showcasing results for {{product}}.

Result achieved: {{result}}
Client/User type: {{client_type}}

Include:
- Specific numbers/metrics
- Brief story of the journey
- Key takeaway for readers
- Soft call-to-action

Generate the post now:""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Marketing agency", "required": True, "type": "text"},
            {"name": "result", "label": "Result Achieved", "placeholder": "e.g., 300% ROI increase", "required": True, "type": "text"},
            {"name": "client_type", "label": "Client Type", "placeholder": "e.g., E-commerce brand", "required": True, "type": "text"},
        ],
        "example_output": "Last month, we helped an e-commerce brand achieve 300% ROI...",
    },
    {
        "name": "Story-Based Email",
        "platform": "Email",
        "category": "email",
        "description": "Engaging email with storytelling",
        "prompt_template": """Write a story-based email for {{product}}.

Main message: {{message}}
Story angle: {{story}}
Call to action: {{cta}}

Include:
- Compelling subject line
- Story hook in first line
- Emotional connection
- Clear CTA

Generate the email now:""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Coaching program", "required": True, "type": "text"},
            {"name": "message", "label": "Main Message", "placeholder": "e.g., Overcome fear of failure", "required": True, "type": "text"},
            {"name": "story", "label": "Story Angle", "placeholder": "e.g., Personal struggle", "required": True, "type": "text"},
            {"name": "cta", "label": "Call to Action", "placeholder": "e.g., Book a free call", "required": True, "type": "text"},
        ],
        "example_output": "Subject: The day I almost gave up...\n\nI still remember sitting in my car, tears streaming down my face...",
    },
    {
        "name": "SEO Blog Intro",
        "platform": "Blog",
        "category": "seo",
        "description": "SEO-optimized blog post introduction",
        "prompt_template": """Write an SEO-optimized blog introduction for the topic: {{topic}}

Primary keyword: {{keyword}}
Target audience: {{audience}}

Include:
- Hook that addresses search intent
- Keyword naturally placed
- Preview of what reader will learn
- Reason to keep reading

Generate 150-200 word intro now:""",
        "variables": [
            {"name": "topic", "label": "Blog Topic", "placeholder": "e.g., Best productivity apps 2024", "required": True, "type": "text"},
            {"name": "keyword", "label": "Primary Keyword", "placeholder": "e.g., productivity apps", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Remote workers", "required": True, "type": "text"},
        ],
        "example_output": "Looking for the best productivity apps to supercharge your workflow in 2024?...",
    },
    {
        "name": "Product Launch Announcement",
        "platform": "Multi-platform",
        "category": "ecommerce",
        "description": "Announce a new product launch with guided wizard",
        "prompt_template": """Write a product launch announcement for {{product}}.

Key features: {{features}}
Launch offer: {{offer}}
Target audience: {{audience}}

Create versions for:
1. Email subject + preview
2. Social media post
3. Website hero copy

Generate all versions now:""",
        "variables": [
            {"name": "product", "label": "Product Name", "placeholder": "e.g., SmartWatch Pro", "required": True, "type": "text"},
            {"name": "features", "label": "Key Features", "placeholder": "e.g., 7-day battery, health tracking", "required": True, "type": "textarea"},
            {"name": "offer", "label": "Launch Offer", "placeholder": "e.g., 20% off first 100 orders", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Fitness enthusiasts", "required": True, "type": "text"},
        ],
        "wizard_steps": [
            {"title": "Product Details", "description": "Tell us about your product", "variables": ["product", "features"]},
            {"title": "Launch Strategy", "description": "Define your launch offer and target market", "variables": ["offer", "audience"]},
        ],
        "example_output": "EMAIL:\nSubject: It's here! Introducing SmartWatch Pro...",
    },
    {
        "name": "A/B Headlines Test",
        "platform": "Ads",
        "category": "ads",
        "description": "Generate A/B test headline variations",
        "prompt_template": """Create A/B test headlines for {{product}}.

Value proposition: {{value}}
Target audience: {{audience}}

Generate:
- Version A: Benefit-focused headline
- Version B: Curiosity-driven headline

Each should be under 60 characters for ad compatibility.

Generate both versions now:""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Email marketing tool", "required": True, "type": "text"},
            {"name": "value", "label": "Value Proposition", "placeholder": "e.g., 2x email open rates", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Small business owners", "required": True, "type": "text"},
        ],
        "example_output": "VERSION A: Double Your Email Open Rates in 30 Days\nVERSION B: The Email Secret Top Marketers Won't Share",
        "is_ab_template": True,
    },
    {
        "name": "Full Marketing Campaign",
        "platform": "Multi-platform",
        "category": "ads",
        "description": "Complete marketing campaign copy with 5-step guided wizard",
        "prompt_template": """Create a complete marketing campaign for {{product}}.

Brand: {{brand_name}}
Target Audience: {{audience}}
Pain Point: {{pain_point}}
Key Benefit: {{main_benefit}}
Unique Selling Point: {{usp}}
Tone: {{tone}}
Call to Action: {{cta}}

Generate the following:

1. HEADLINE OPTIONS (3 variations)
2. SOCIAL MEDIA POST (for {{platform}})
3. EMAIL SUBJECT + PREVIEW
4. LANDING PAGE HERO COPY
5. AD COPY (short version)

Make all copy compelling, benefit-focused, and consistent with the brand voice.""",
        "variables": [
            {"name": "product", "label": "Product/Service Name", "placeholder": "e.g., TaskFlow Pro", "required": True, "type": "text"},
            {"name": "brand_name", "label": "Brand Name", "placeholder": "e.g., TaskFlow", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Busy entrepreneurs", "required": True, "type": "text"},
            {"name": "pain_point", "label": "Main Pain Point", "placeholder": "e.g., Overwhelmed by too many tasks", "required": True, "type": "text"},
            {"name": "main_benefit", "label": "Key Benefit", "placeholder": "e.g., Get 2 extra hours daily", "required": True, "type": "text"},
            {"name": "usp", "label": "Unique Selling Point", "placeholder": "e.g., AI-powered task prioritization", "required": True, "type": "text"},
            {"name": "tone", "label": "Brand Tone", "placeholder": "e.g., Professional but friendly", "required": True, "type": "select", "options": ["Professional", "Casual & Friendly", "Bold & Confident", "Empathetic", "Playful", "Luxurious"]},
            {"name": "platform", "label": "Primary Social Platform", "placeholder": "Select platform", "required": True, "type": "select", "options": ["LinkedIn", "Instagram", "Twitter/X", "Facebook", "TikTok"]},
            {"name": "cta", "label": "Call to Action", "placeholder": "e.g., Start free trial", "required": True, "type": "text"},
        ],
        "wizard_steps": [
            {"title": "Product & Brand", "description": "Let's start with the basics about your product", "variables": ["product", "brand_name"]},
            {"title": "Audience & Problem", "description": "Who are you targeting and what problem do you solve?", "variables": ["audience", "pain_point"]},
            {"title": "Value Proposition", "description": "What makes your product special?", "variables": ["main_benefit", "usp"]},
            {"title": "Brand Voice", "description": "How should your copy sound?", "variables": ["tone"]},
            {"title": "Distribution & Action", "description": "Where will you share this and what should people do?", "variables": ["platform", "cta"]},
        ],
        "example_output": "HEADLINES:\n1. Stop Drowning in Tasks. Start Achieving Goals.\n2. 2 Extra Hours Every Day? Meet TaskFlow Pro.\n3. The AI Assistant That Actually Gets You Organized...",
    },
    {
        "name": "Story-Based Email Sequence",
        "platform": "Email",
        "category": "email",
        "description": "3-email nurture sequence with guided wizard",
        "prompt_template": """Create a 3-email nurture sequence for {{product}}.

Brand: {{brand_name}}
Target Audience: {{audience}}
Main Problem: {{problem}}
Solution: {{solution}}
Story Hook: {{story_hook}}
Social Proof: {{social_proof}}
Final CTA: {{cta}}

Generate:
EMAIL 1 - The Hook (introduce the problem with a story)
EMAIL 2 - The Journey (show understanding, introduce solution hints)
EMAIL 3 - The Reveal (present the solution with social proof and CTA)

Each email should have: Subject line, Preview text, Body copy""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Online Course", "required": True, "type": "text"},
            {"name": "brand_name", "label": "Brand/Sender Name", "placeholder": "e.g., Sarah from GrowthLab", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Aspiring freelancers", "required": True, "type": "text"},
            {"name": "problem", "label": "Main Problem", "placeholder": "e.g., Struggling to find clients", "required": True, "type": "text"},
            {"name": "solution", "label": "Your Solution", "placeholder": "e.g., Proven client acquisition system", "required": True, "type": "text"},
            {"name": "story_hook", "label": "Story Hook", "placeholder": "e.g., How I went from 0 to 6 figures", "required": True, "type": "textarea"},
            {"name": "social_proof", "label": "Social Proof", "placeholder": "e.g., 500+ students, 4.9 rating", "required": True, "type": "text"},
            {"name": "cta", "label": "Final Call to Action", "placeholder": "e.g., Enroll now", "required": True, "type": "text"},
        ],
        "wizard_steps": [
            {"title": "The Basics", "description": "What are you promoting and who's sending it?", "variables": ["product", "brand_name"]},
            {"title": "Your Audience", "description": "Who will receive these emails?", "variables": ["audience"]},
            {"title": "Problem & Solution", "description": "What pain does your audience have and how do you solve it?", "variables": ["problem", "solution"]},
            {"title": "The Story", "description": "What story will hook your readers?", "variables": ["story_hook"]},
            {"title": "Proof & Action", "description": "Build trust and drive action", "variables": ["social_proof", "cta"]},
        ],
        "example_output": "EMAIL 1 - THE HOOK\nSubject: I almost gave up on freelancing...\n\nPreview: Then everything changed.\n\nHey {{first_name}},\n\nThree years ago, I was exactly where you are now...",
    },
]
