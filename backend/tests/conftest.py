"""Pytest configuration and fixtures for backend tests."""
import os
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Set test database before importing app
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_auto_copy.db"

from app.main import app
from app.database import Base, get_db


# Create test engine and session
test_engine = create_async_engine(
    "sqlite+aiosqlite:///./test_auto_copy.db",
    echo=False,
)
test_session_maker = async_sessionmaker(
    test_engine, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    """Override database dependency for tests."""
    async with test_session_maker() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="function")
async def setup_database():
    """Create tables before each test and drop after."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
async def client(setup_database):
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def db_session(setup_database):
    """Get database session for tests."""
    async with test_session_maker() as session:
        yield session


@pytest.fixture
async def auth_headers(client):
    """Create a test user and return auth headers."""
    # Register user
    register_data = {
        "email": "test@example.com",
        "password": "TestPassword123!",
        "name": "Test User"
    }
    await client.post("/api/auth/register", json=register_data)

    # Login to get token
    login_data = {
        "email": "test@example.com",
        "password": "TestPassword123!"
    }
    response = await client.post("/api/auth/login", json=login_data)

    if response.status_code == 200:
        token = response.json().get("access_token")
        return {"Authorization": f"Bearer {token}"}
    return {}
