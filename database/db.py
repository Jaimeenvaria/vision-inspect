import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# Fetch database URL from environment variables, defaulting to local async SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./factoryvision.db")

# SQLite require check_same_thread=False parameter
if DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # Postgres setup
    engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)

# Session factory for async database sessions
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Declarative base class for models
Base = declarative_base()

# FastAPI dependency for injection
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
