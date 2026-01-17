from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import init_db, async_session_maker
from app.models import Template
from app.routers import generate_router, templates_router, history_router, brand_router, workspace_router, content_router


DEFAULT_TEMPLATES = [
    {
        "name": "Instagram Caption",
        "platform": "Instagram",
        "category": "social",
        "description": "Engaging Instagram captions with hashtags and emojis",
        "prompt_template": """Write an engaging Instagram caption for {{product}}.

Target audience: {{audience}}
Key message: {{message}}

Include relevant hashtags (5-10), use emojis appropriately, and keep it under 2200 characters. Make it shareable and engaging.""",
        "variables": [
            {"name": "product", "label": "Product/Topic", "placeholder": "e.g., New fitness app launch", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Health-conscious millennials", "required": True, "type": "text"},
            {"name": "message", "label": "Key Message", "placeholder": "e.g., Transform your health in 30 days", "required": False, "type": "text"},
        ],
        "example_output": "Ready to transform your mornings? Our new fitness app makes it easy to build healthy habits that stick. Start your 30-day journey today and see the difference...",
    },
    {
        "name": "LinkedIn Post",
        "platform": "LinkedIn",
        "category": "social",
        "description": "Professional LinkedIn posts for thought leadership",
        "prompt_template": """Write a professional LinkedIn post about {{topic}}.

Industry context: {{industry}}
Key insight: {{insight}}

Focus on insights, value, and professional tone. Include a call-to-action. Keep it between 150-300 words for optimal engagement.""",
        "variables": [
            {"name": "topic", "label": "Topic", "placeholder": "e.g., Remote work productivity", "required": True, "type": "text"},
            {"name": "industry", "label": "Industry", "placeholder": "e.g., Tech/SaaS", "required": False, "type": "text"},
            {"name": "insight", "label": "Key Insight", "placeholder": "e.g., Async communication boosts productivity", "required": True, "type": "text"},
        ],
        "example_output": "After 3 years of leading remote teams, here's what I've learned about productivity...",
    },
    {
        "name": "Facebook Ad Copy",
        "platform": "Facebook",
        "category": "ads",
        "description": "High-converting Facebook ad copy with headlines and CTAs",
        "prompt_template": """Write compelling Facebook ad copy for {{product}}.

Target audience: {{audience}}
Main benefit: {{benefit}}
Offer: {{offer}}

Include a strong headline, engaging body text, and a clear call-to-action. Focus on benefits and emotional triggers.""",
        "variables": [
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., Online cooking course", "required": True, "type": "text"},
            {"name": "audience", "label": "Target Audience", "placeholder": "e.g., Busy parents who want healthy meals", "required": True, "type": "text"},
            {"name": "benefit", "label": "Main Benefit", "placeholder": "e.g., Cook gourmet meals in 20 minutes", "required": True, "type": "text"},
            {"name": "offer", "label": "Offer/CTA", "placeholder": "e.g., 50% off this week only", "required": False, "type": "text"},
        ],
        "example_output": "HEADLINE: Gourmet Meals in 20 Minutes or Less\n\nTired of choosing between healthy food and precious family time?...",
    },
    {
        "name": "Twitter/X Thread",
        "platform": "Twitter/X",
        "category": "social",
        "description": "Viral Twitter/X threads that build engagement",
        "prompt_template": """Create a Twitter/X thread (5-7 tweets) about {{topic}}.

Hook angle: {{hook}}
Key takeaways: {{takeaways}}

Each tweet should be under 280 characters. Start with a hook, build value, and end with a call-to-action.""",
        "variables": [
            {"name": "topic", "label": "Thread Topic", "placeholder": "e.g., How I grew my startup to $1M ARR", "required": True, "type": "text"},
            {"name": "hook", "label": "Hook Angle", "placeholder": "e.g., Counterintuitive insight", "required": True, "type": "text"},
            {"name": "takeaways", "label": "Key Takeaways", "placeholder": "e.g., 5 lessons learned", "required": False, "type": "textarea"},
        ],
        "example_output": "1/ I grew my startup from $0 to $1M ARR in 18 months.\n\nHere are the 5 counterintuitive lessons nobody talks about:\n\n(A thread)",
    },
    {
        "name": "Email Subject Lines",
        "platform": "Email",
        "category": "email",
        "description": "High open-rate email subject lines",
        "prompt_template": """Generate 5 compelling email subject lines for {{campaign}}.

Product/Service: {{product}}
Email goal: {{goal}}

Focus on curiosity, urgency, or value. Keep each under 50 characters for optimal mobile display.""",
        "variables": [
            {"name": "campaign", "label": "Campaign Type", "placeholder": "e.g., Product launch, Newsletter, Sale", "required": True, "type": "text"},
            {"name": "product", "label": "Product/Service", "placeholder": "e.g., SaaS productivity tool", "required": True, "type": "text"},
            {"name": "goal", "label": "Email Goal", "placeholder": "e.g., Drive trial signups", "required": True, "type": "text"},
        ],
        "example_output": "1. Your productivity hack is waiting\n2. [First name], ready to save 2 hours daily?\n3. The tool top CEOs won't share...",
    },
    {
        "name": "Product Description",
        "platform": "E-commerce",
        "category": "ecommerce",
        "description": "Persuasive product descriptions that convert",
        "prompt_template": """Write a persuasive product description for {{product}}.

Key features: {{features}}
Target buyer: {{buyer}}
Price point: {{price}}

Highlight key features, benefits, and unique selling points. Include sensory language and address potential objections.""",
        "variables": [
            {"name": "product", "label": "Product Name", "placeholder": "e.g., Wireless Noise-Canceling Headphones", "required": True, "type": "text"},
            {"name": "features", "label": "Key Features", "placeholder": "e.g., 40hr battery, ANC, premium drivers", "required": True, "type": "textarea"},
            {"name": "buyer", "label": "Target Buyer", "placeholder": "e.g., Remote workers, audiophiles", "required": True, "type": "text"},
            {"name": "price", "label": "Price Point", "placeholder": "e.g., Premium ($299)", "required": False, "type": "text"},
        ],
        "example_output": "Immerse yourself in crystal-clear audio with our Wireless Noise-Canceling Headphones. Featuring 40 hours of battery life...",
    },
    {
        "name": "Call-to-Action Phrases",
        "platform": "General",
        "category": "general",
        "description": "Compelling CTAs for any marketing material",
        "prompt_template": """Generate 10 compelling call-to-action phrases for {{offer}}.

Context: {{context}}
Desired action: {{action}}

Mix different styles: urgency-based, benefit-focused, curiosity-driven, and action-oriented.""",
        "variables": [
            {"name": "offer", "label": "Offer/Product", "placeholder": "e.g., Free trial of project management tool", "required": True, "type": "text"},
            {"name": "context", "label": "Context/Placement", "placeholder": "e.g., Landing page hero section", "required": True, "type": "text"},
            {"name": "action", "label": "Desired Action", "placeholder": "e.g., Start free trial", "required": True, "type": "text"},
        ],
        "example_output": "1. Start Your Free Trial Now\n2. Join 10,000+ Teams Already Winning\n3. See Why Teams Love Us - Free...",
    },
]


async def seed_templates():
    """Seed default templates if they don't exist."""
    async with async_session_maker() as session:
        result = await session.execute(select(Template).limit(1))
        if result.scalar_one_or_none() is None:
            for tmpl in DEFAULT_TEMPLATES:
                template = Template(
                    name=tmpl["name"],
                    platform=tmpl["platform"],
                    category=tmpl.get("category", "general"),
                    description=tmpl.get("description"),
                    prompt_template=tmpl["prompt_template"],
                    variables=tmpl.get("variables"),
                    example_output=tmpl.get("example_output"),
                    is_custom=False,
                    is_ab_template=tmpl.get("is_ab_template", False),
                )
                session.add(template)
            await session.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_templates()
    yield


app = FastAPI(
    title="Auto-Copy API",
    description="Copywriting tool powered by Ollama LLM",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router)
app.include_router(templates_router)
app.include_router(history_router)
app.include_router(brand_router)
app.include_router(workspace_router)
app.include_router(content_router)


@app.get("/")
async def root():
    return {"message": "Auto-Copy API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
