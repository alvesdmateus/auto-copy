from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import init_db, async_session_maker
from app.models import Template
from app.routers import generate_router, templates_router, history_router


DEFAULT_TEMPLATES = [
    {
        "name": "Instagram Caption",
        "platform": "Instagram",
        "prompt_template": "Write an engaging Instagram caption for the following topic. Include relevant hashtags (5-10), use emojis appropriately, and keep it under 2200 characters. Make it shareable and engaging.",
    },
    {
        "name": "LinkedIn Post",
        "platform": "LinkedIn",
        "prompt_template": "Write a professional LinkedIn post about the following topic. Focus on insights, value, and professional tone. Include a call-to-action. Keep it between 150-300 words for optimal engagement.",
    },
    {
        "name": "Facebook Ad Copy",
        "platform": "Facebook",
        "prompt_template": "Write compelling Facebook ad copy for the following product/service. Include a strong headline, engaging body text, and a clear call-to-action. Focus on benefits and emotional triggers.",
    },
    {
        "name": "Twitter/X Thread",
        "platform": "Twitter/X",
        "prompt_template": "Create a Twitter/X thread (5-7 tweets) about the following topic. Each tweet should be under 280 characters. Start with a hook, build value, and end with a call-to-action.",
    },
    {
        "name": "Email Subject Lines",
        "platform": "Email",
        "prompt_template": "Generate 5 compelling email subject lines for the following topic. Focus on curiosity, urgency, or value. Keep each under 50 characters for optimal mobile display.",
    },
    {
        "name": "Product Description",
        "platform": "E-commerce",
        "prompt_template": "Write a persuasive product description for the following item. Highlight key features, benefits, and unique selling points. Include sensory language and address potential objections.",
    },
    {
        "name": "Call-to-Action Phrases",
        "platform": "General",
        "prompt_template": "Generate 10 compelling call-to-action phrases for the following offer/product. Mix different styles: urgency-based, benefit-focused, curiosity-driven, and action-oriented.",
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
                    prompt_template=tmpl["prompt_template"],
                    is_custom=False,
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


@app.get("/")
async def root():
    return {"message": "Auto-Copy API is running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
