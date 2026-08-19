import os
import shutil
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from database.db import get_db
from database.models import User, Product, ProductionLine, Inspection, Defect, InspectionImage
from backend.schemas import InspectionDetailOut, InspectionOut
from backend.auth_utils import get_current_user
from ai.detector import DefectDetector
from backend.llm_service import LLMExplanationService
from backend.storage_service import StorageService

logger = logging.getLogger("factoryvision.inspections")
router = APIRouter(prefix="/inspections", tags=["Inspections"])

# Instantiate core services
detector = DefectDetector()
llm_service = LLMExplanationService()
storage_service = StorageService()

@router.post("/inspect", response_model=InspectionDetailOut, status_code=status.HTTP_201_CREATED)
async def perform_inspection(
    product_id: str = Form(...),
    production_line_id: str = Form(...),
    shift: str = Form(...),
    notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate foreign keys
    product_check = await db.execute(select(Product).where(Product.id == product_id))
    product = product_check.scalars().first()
    if not product:
        raise HTTPException(status_code=400, detail="Invalid Product ID")
        
    line_check = await db.execute(select(ProductionLine).where(ProductionLine.id == production_line_id))
    line = line_check.scalars().first()
    if not line:
        raise HTTPException(status_code=400, detail="Invalid Production Line ID")
        
    if shift not in ["morning", "afternoon", "night"]:
        raise HTTPException(status_code=400, detail="Shift must be morning, afternoon, or night")

    # 2. Write uploaded file to temp path
    temp_dir = os.path.join("backend", "static", "uploads", "temp")
    os.makedirs(temp_dir, exist_ok=True)
    
    file_id = uuid.uuid4().hex
    safe_filename = os.path.basename(file.filename)
    temp_orig_path = os.path.join(temp_dir, f"{file_id}_{safe_filename}")
    temp_annot_path = os.path.join(temp_dir, f"{file_id}_annot_{safe_filename}")
    
    try:
        with open(temp_orig_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded image file.")

    try:
        # 3. Perform defect detection (YOLOv8 + OpenCV annotation)
        detections = detector.detect(temp_orig_path, temp_annot_path)
        
        # 4. Generate LLM explanations & suggested actions
        annotated_defects = await llm_service.explain_defects(detections)
        
        # 5. Upload original and annotated images
        orig_url, orig_provider = storage_service.upload_image(temp_orig_path, folder="originals")
        annot_url, annot_provider = storage_service.upload_image(temp_annot_path, folder="annotated")
        
        # 6. Determine overall inspection status
        # If no defects -> PASS
        # If any high-severity defect -> REJECT
        # Else -> REWORK
        if not annotated_defects:
            final_status = "pass"
            avg_confidence = 0.98  # Default high confidence for a pass
        else:
            has_high = any(d["severity"].lower() == "high" for d in annotated_defects)
            final_status = "reject" if has_high else "rework"
            avg_confidence = sum(d["confidence"] for d in annotated_defects) / len(annotated_defects)

        # 7. Persist records to database
        new_inspection = Inspection(
            product_id=product_id,
            production_line_id=production_line_id,
            inspector_id=current_user.id,
            status=final_status,
            shift=shift,
            avg_confidence=round(avg_confidence, 4),
            notes=notes or f"Inspection complete. Status: {final_status.upper()}."
        )
        db.add(new_inspection)
        await db.flush()  # Generate inspection ID
        
        # Save image details
        new_image = InspectionImage(
            inspection_id=new_inspection.id,
            original_url=orig_url,
            annotated_url=annot_url,
            storage_provider=orig_provider
        )
        db.add(new_image)
        
        # Save each defect
        for d in annotated_defects:
            new_defect = Defect(
                inspection_id=new_inspection.id,
                defect_type=d["type"],
                confidence=d["confidence"],
                severity=d["severity"],
                x_min=round(d["box"][0], 4) if d["box"] else None,
                y_min=round(d["box"][1], 4) if d["box"] else None,
                x_max=round(d["box"][2], 4) if d["box"] else None,
                y_max=round(d["box"][3], 4) if d["box"] else None,
                explanation=d["explanation"],
                suggested_action=d["suggested_action"]
            )
            db.add(new_defect)
            
        await db.commit()
        
        # Eager load relationships for return serialization
        result = await db.execute(
            select(Inspection)
            .where(Inspection.id == new_inspection.id)
            .options(
                selectinload(Inspection.product),
                selectinload(Inspection.production_line),
                selectinload(Inspection.inspector),
                selectinload(Inspection.image),
                selectinload(Inspection.defects)
            )
        )
        return result.scalars().first()

    except Exception as e:
        logger.exception(f"Inspection pipeline failure: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An error occurred during inspection execution: {str(e)}"
        )
        
    finally:
        # 8. Clean up temporary files
        if os.path.exists(temp_orig_path):
            try: os.remove(temp_orig_path)
            except Exception: pass
        if os.path.exists(temp_annot_path):
            try: os.remove(temp_annot_path)
            except Exception: pass


@router.get("", response_model=List[InspectionOut])
async def list_inspections(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    status: Optional[str] = None,
    production_line_id: Optional[str] = None,
    product_id: Optional[str] = None,
    shift: Optional[str] = None,
    inspector_id: Optional[str] = None,
    defect_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(Inspection).order_by(Inspection.created_at.desc())
    
    if start_date:
        query = query.where(Inspection.created_at >= start_date)
    if end_date:
        query = query.where(Inspection.created_at <= end_date)
    if status:
        query = query.where(Inspection.status == status)
    if production_line_id:
        query = query.where(Inspection.production_line_id == production_line_id)
    if product_id:
        query = query.where(Inspection.product_id == product_id)
    if shift:
        query = query.where(Inspection.shift == shift)
    if inspector_id:
        query = query.where(Inspection.inspector_id == inspector_id)
        
    if defect_type:
        query = query.join(Defect).where(Defect.defect_type == defect_type)
        
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{inspection_id}", response_model=InspectionDetailOut)
async def get_inspection_detail(
    inspection_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Inspection)
        .where(Inspection.id == inspection_id)
        .options(
            selectinload(Inspection.product),
            selectinload(Inspection.production_line),
            selectinload(Inspection.inspector),
            selectinload(Inspection.image),
            selectinload(Inspection.defects)
        )
    )
    inspection = result.scalars().first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    return inspection

