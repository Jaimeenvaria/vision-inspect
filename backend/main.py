import os
import logging
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy.future import select

from database.db import Base, engine, AsyncSessionLocal
from database.models import User
from database.seed import seed_database
from backend.auth_routes import router as auth_router
from backend.metadata_routes import router as metadata_router
from backend.inspection_routes import router as inspection_router
from backend.analytics_routes import router as analytics_router
from backend.report_routes import router as report_router


# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("factoryvision")

# Initialize app
app = FastAPI(
    title="FactoryVision AI API",
    description="Backend API for real-time manufacturing defect inspection and analytics.",
    version="1.0.0"
)

# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files folder setup
UPLOAD_DIR = os.path.join("backend", "static", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=os.path.join("backend", "static")), name="static")

# Centralized Error Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled Exception occurred: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system support."}
    )

# Routing registrations
app.include_router(auth_router, prefix="/api")
app.include_router(metadata_router, prefix="/api")
app.include_router(inspection_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(report_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "healthy", "environment": os.getenv("ENV", "development")}

# Startup Events: DB init & seeding
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing database...")
    async with engine.begin() as conn:
        # Create tables if not exists
        await conn.run_sync(Base.metadata.create_all)
    
    # Check if database needs seeding
    async with AsyncSessionLocal() as session:
        result = await db_check_users_exist(session)
        if not result:
            logger.info("Database is empty. Seeding seed data...")
            try:
                await seed_database()
            except Exception as e:
                logger.error(f"Error seeding database: {e}")
        else:
            logger.info("Database already seeded.")

async def db_check_users_exist(session) -> bool:
    try:
        result = await session.execute(select(User).limit(1))
        return result.scalars().first() is not None
    except Exception:
        return False
