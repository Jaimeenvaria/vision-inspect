from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- AUTHENTICATION SCHEMAS ---

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)
    role: str = Field("inspector", pattern="^(inspector|supervisor|admin)$")

class UserLogin(BaseModel):
    username: str
    password: str

class UserOut(BaseModel):
    id: str
    username: str
    email: EmailStr
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


# --- PRODUCT SCHEMAS ---

class ProductCreate(BaseModel):
    sku: str = Field(..., min_length=3, max_length=50)
    name: str = Field(..., min_length=3, max_length=150)
    description: Optional[str] = None

class ProductOut(BaseModel):
    id: str
    sku: str
    name: str
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- PRODUCTION LINE SCHEMAS ---

class ProductionLineCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    location: Optional[str] = None
    status: str = Field("active", pattern="^(active|maintenance|inactive)$")

class ProductionLineOut(BaseModel):
    id: str
    name: str
    location: Optional[str]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- DEFECT SCHEMAS ---

class DefectOut(BaseModel):
    id: str
    defect_type: str
    confidence: float
    severity: str
    x_min: Optional[float]
    y_min: Optional[float]
    x_max: Optional[float]
    y_max: Optional[float]
    explanation: Optional[str]
    suggested_action: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- INSPECTION IMAGE SCHEMAS ---

class InspectionImageOut(BaseModel):
    id: str
    original_url: str
    annotated_url: str
    storage_provider: str

    class Config:
        from_attributes = True


# --- INSPECTION SCHEMAS ---

class InspectionOut(BaseModel):
    id: str
    product_id: str
    production_line_id: str
    inspector_id: str
    status: str
    shift: str
    avg_confidence: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class InspectionDetailOut(BaseModel):
    id: str
    product: ProductOut
    production_line: ProductionLineOut
    inspector: UserOut
    status: str
    shift: str
    avg_confidence: float
    notes: Optional[str]
    created_at: datetime
    image: Optional[InspectionImageOut]
    defects: List[DefectOut]

    class Config:
        from_attributes = True


# --- REPORT SCHEMAS ---

class ReportCreate(BaseModel):
    name: str
    report_type: str = Field(..., pattern="^(daily|monthly|inspection)$")
    file_format: str = Field(..., pattern="^(pdf|csv)$")
    start_date: datetime
    end_date: datetime

class ReportOut(BaseModel):
    id: str
    name: str
    report_type: str
    file_format: str
    file_url: str
    created_by_id: str
    created_at: datetime

    class Config:
        from_attributes = True
