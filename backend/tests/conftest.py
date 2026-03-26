import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.database import Base, get_db
from main import app

SYNC_DATABASE_URL = "postgresql+psycopg2://rescue:rescue@localhost:5432/rescue_chat_test"
ASYNC_DATABASE_URL = "postgresql+asyncpg://rescue:rescue@localhost:5432/rescue_chat_test"

# синхронный движок — только для setup/teardown таблиц
sync_engine = create_engine(SYNC_DATABASE_URL)

# асинхронный движок — для самих тестов
async_engine = create_async_engine(ASYNC_DATABASE_URL)
TestSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(sync_engine)
    yield
    Base.metadata.drop_all(sync_engine)

@pytest.fixture(autouse=True)
def clean_tables():
    yield
    with sync_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())
    # сбрасываем пул соединений async движка между тестами
    async_engine.sync_engine.dispose()

@pytest.fixture
async def client():
    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.clear()