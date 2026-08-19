from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from database.db import get_db
from database.models import Product, ProductionLine, User
from backend.schemas import ProductCreate, ProductOut, ProductionLineCreate, ProductionLineOut
from backend.auth_utils import RoleChecker, get_current_user

router = APIRouter(tags=["Metadata"])

# Role guard shortcuts
require_supervisor_or_admin = Depends(RoleChecker(["supervisor", "admin"]))

@router.get("/products", response_model=List[ProductOut])
async def get_products(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Product).order_by(Product.name))
    return result.scalars().all()

@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_supervisor_or_admin
):
    # Check duplicate SKU
    sku_check = await db.execute(select(Product).where(Product.sku == product_in.sku))
    if sku_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="SKU already exists"
        )
        
    new_product = Product(
        sku=product_in.sku,
        name=product_in.name,
        description=product_in.description
    )
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)
    return new_product

@router.get("/production-lines", response_model=List[ProductionLineOut])
async def get_production_lines(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(ProductionLine).order_by(ProductionLine.name))
    return result.scalars().all()

@router.post("/production-lines", response_model=ProductionLineOut, status_code=status.HTTP_201_CREATED)
async def create_production_line(
    line_in: ProductionLineCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = require_supervisor_or_admin
):
    # Check duplicate name
    name_check = await db.execute(select(ProductionLine).where(ProductionLine.name == line_in.name))
    if name_check.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Production line name already exists"
        )
        
    new_line = ProductionLine(
        name=line_in.name,
        location=line_in.location,
        status=line_in.status
    )
    db.add(new_line)
    await db.commit()
    await db.refresh(new_line)
    return new_line
