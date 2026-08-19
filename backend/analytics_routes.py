from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date, and_, case
from sqlalchemy.future import select
from typing import List, Dict, Any
from datetime import datetime, timedelta

from database.db import get_db
from database.models import Inspection, Defect, ProductionLine, Product
from backend.auth_utils import get_current_user

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard_analytics(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    # Calculate cutoff date
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    # 1. Fetch KPI Totals
    kpi_query = select(
        func.count(Inspection.id).label("total"),
        func.sum(case((Inspection.status == "pass", 1), else_=0)).label("passed"),
        func.sum(case((Inspection.status == "rework", 1), else_=0)).label("rework"),
        func.sum(case((Inspection.status == "reject", 1), else_=0)).label("rejected"),
        func.avg(Inspection.avg_confidence).label("avg_conf")
    ).where(Inspection.created_at >= cutoff_date)
    
    kpi_res = await db.execute(kpi_query)
    kpis = kpi_res.first()
    
    total = kpis.total or 0
    passed = kpis.passed or 0
    rework = kpis.rework or 0
    rejected = kpis.rejected or 0
    avg_conf = kpis.avg_conf or 0.0
    
    pass_rate = round((passed / total) * 100, 2) if total > 0 else 100.0
    fail_rate = round(((rework + rejected) / total) * 100, 2) if total > 0 else 0.0
    rework_rate = round((rework / total) * 100, 2) if total > 0 else 0.0
    reject_rate = round((rejected / total) * 100, 2) if total > 0 else 0.0
    
    # 2. Defect Type Distribution
    defect_query = select(
        Defect.defect_type,
        func.count(Defect.id).label("count")
    ).join(Inspection).where(
        Inspection.created_at >= cutoff_date
    ).group_by(Defect.defect_type).order_by(func.count(Defect.id).desc())
    
    defect_res = await db.execute(defect_query)
    defect_dist = [{"type": row.defect_type, "count": row.count} for row in defect_res]
    
    daily_query = select(
        func.date(Inspection.created_at).label("day"),
        func.count(Inspection.id).label("total"),
        func.sum(case((Inspection.status == "pass", 1), else_=0)).label("passed"),
        func.sum(case((Inspection.status == "rework", 1), else_=0)).label("rework"),
        func.sum(case((Inspection.status == "reject", 1), else_=0)).label("rejected")
    ).where(
        Inspection.created_at >= cutoff_date
    ).group_by(func.date(Inspection.created_at)).order_by(func.date(Inspection.created_at))
    
    daily_res = await db.execute(daily_query)
    production_trends = []
    for row in daily_res:
        t = row.total or 0
        p = row.passed or 0
        rw = row.rework or 0
        rj = row.rejected or 0
        production_trends.append({
            "date": str(row.day),
            "total": t,
            "passed": p,
            "rework": rw,
            "rejected": rj,
            "pass_rate": round((p / t) * 100, 2) if t > 0 else 100.0
        })
        
    # 4. Production Line Performance
    line_query = select(
        ProductionLine.name.label("line_name"),
        func.count(Inspection.id).label("total"),
        func.sum(case((Inspection.status == "pass", 1), else_=0)).label("passed")
    ).join(
        Inspection, Inspection.production_line_id == ProductionLine.id
    ).where(
        Inspection.created_at >= cutoff_date
    ).group_by(ProductionLine.name)
    
    line_res = await db.execute(line_query)
    line_performance = []
    for row in line_res:
        t = row.total or 0
        p = row.passed or 0
        line_performance.append({
            "line_name": row.line_name,
            "total": t,
            "pass_rate": round((p / t) * 100, 2) if t > 0 else 100.0,
            "fail_rate": round(((t - p) / t) * 100, 2) if t > 0 else 0.0
        })
        
    shift_query = select(
        Inspection.shift,
        func.count(Inspection.id).label("total"),
        func.sum(case((Inspection.status != "pass", 1), else_=0)).label("defects_count")
    ).where(
        Inspection.created_at >= cutoff_date
    ).group_by(Inspection.shift)
    
    shift_res = await db.execute(shift_query)
    shift_performance = {}
    for row in shift_res:
        shift_performance[row.shift] = {
            "total": row.total,
            "defects": row.defects_count or 0
        }
    
    # Fill in shifts that might have zero data
    for s in ["morning", "afternoon", "night"]:
        if s not in shift_performance:
            shift_performance[s] = {"total": 0, "defects": 0}

    return {
        "kpis": {
            "total_inspections": total,
            "pass_rate": pass_rate,
            "fail_rate": fail_rate,
            "rework_rate": rework_rate,
            "reject_rate": reject_rate,
            "avg_confidence": round(avg_conf, 4)
        },
        "defect_distribution": defect_dist,
        "production_trends": production_trends,
        "line_performance": line_performance,
        "shift_performance": shift_performance
    }

@router.get("/heatmap")
async def get_heatmap_data(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """
    Returns matrix data of Production Line vs Defect Type.
    Useful for production managers to identify bottleneck lines and specific tooling errors.
    """
    # Get all active lines
    lines_res = await db.execute(select(ProductionLine).where(ProductionLine.status == "active"))
    lines = lines_res.scalars().all()
    
    # Get defect count grouped by line and defect type
    heatmap_query = select(
        ProductionLine.name.label("line_name"),
        Defect.defect_type,
        func.count(Defect.id).label("count")
    ).join(
        Inspection, Inspection.production_line_id == ProductionLine.id
    ).join(
        Defect, Defect.inspection_id == Inspection.id
    ).group_by(
        ProductionLine.name, Defect.defect_type
    )
    
    heatmap_res = await db.execute(heatmap_query)
    raw_counts = {}
    
    for row in heatmap_res:
        if row.line_name not in raw_counts:
            raw_counts[row.line_name] = {}
        raw_counts[row.line_name][row.defect_type] = row.count
        
    defect_types = ["scratch", "dent", "crack", "paint defect", "misalignment", "missing component", "rust", "anomaly"]
    
    matrix = []
    for line in lines:
        line_data = {"line_name": line.name}
        for d_type in defect_types:
            count = raw_counts.get(line.name, {}).get(d_type, 0)
            line_data[d_type] = count
        matrix.append(line_data)
        
    return {
        "defect_types": defect_types,
        "matrix": matrix
    }
