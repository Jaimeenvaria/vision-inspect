import uuid
import datetime
from sqlalchemy import Column, String, Float, ForeignKey, Text, DateTime
from sqlalchemy.orm import relationship
from database.db import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="inspector")  # "inspector", "supervisor", "admin"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspections = relationship("Inspection", back_populates="inspector")
    reports = relationship("Report", back_populates="creator")


class Product(Base):
    __tablename__ = "products"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspections = relationship("Inspection", back_populates="product")


class ProductionLine(Base):
    __tablename__ = "production_lines"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), unique=True, nullable=False, index=True)
    location = Column(String(255), nullable=True)
    status = Column(String(50), default="active")  # "active", "maintenance", "inactive"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspections = relationship("Inspection", back_populates="production_line")


class Inspection(Base):
    __tablename__ = "inspections"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id"), nullable=False)
    production_line_id = Column(String(36), ForeignKey("production_lines.id"), nullable=False)
    inspector_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), nullable=False)  # "pass", "rework", "reject"
    shift = Column(String(50), nullable=False)  # "morning", "afternoon", "night"
    avg_confidence = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="inspections")
    production_line = relationship("ProductionLine", back_populates="inspections")
    inspector = relationship("User", back_populates="inspections")
    defects = relationship("Defect", back_populates="inspection", cascade="all, delete-orphan")
    image = relationship("InspectionImage", back_populates="inspection", uselist=False, cascade="all, delete-orphan")


class Defect(Base):
    __tablename__ = "defects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id"), nullable=False)
    defect_type = Column(String(100), nullable=False)  # "scratch", "dent", "crack", "paint", "misalignment", "missing_component", "rust", "anomaly"
    confidence = Column(Float, nullable=False)
    severity = Column(String(50), nullable=False)  # "low", "medium", "high"
    x_min = Column(Float, nullable=True)
    y_min = Column(Float, nullable=True)
    x_max = Column(Float, nullable=True)
    y_max = Column(Float, nullable=True)
    explanation = Column(Text, nullable=True)
    suggested_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspection = relationship("Inspection", back_populates="defects")


class InspectionImage(Base):
    __tablename__ = "inspection_images"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    inspection_id = Column(String(36), ForeignKey("inspections.id"), nullable=False)
    original_url = Column(String(500), nullable=False)
    annotated_url = Column(String(500), nullable=False)
    storage_provider = Column(String(50), default="local")  # "local", "cloudinary"
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    inspection = relationship("Inspection", back_populates="image")


class Report(Base):
    __tablename__ = "reports"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    report_type = Column(String(50), nullable=False)  # "daily", "monthly", "inspection"
    file_format = Column(String(50), nullable=False)  # "pdf", "csv"
    file_url = Column(String(500), nullable=False)
    created_by_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    creator = relationship("User", back_populates="reports")
