import os
import csv
import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from typing import List, Any
from datetime import datetime

from database.db import get_db
from database.models import Inspection, Report, User
from backend.schemas import ReportCreate, ReportOut
from backend.auth_utils import get_current_user

logger = logging.getLogger("factoryvision.reports")
router = APIRouter(prefix="/reports", tags=["Reports"])

# Ensure reports directory exists
REPORTS_DIR = os.path.join("backend", "static", "reports")
os.makedirs(REPORTS_DIR, exist_ok=True)

@router.get("", response_model=List[ReportOut])
async def list_reports(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    result = await db.execute(select(Report).order_by(Report.created_at.desc()))
    return result.scalars().all()

@router.post("/generate", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def generate_report(
    report_in: ReportCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Fetch inspections in the date range
    query = (
        select(Inspection)
        .where(
            and_(
                Inspection.created_at >= report_in.start_date,
                Inspection.created_at <= report_in.end_date
            )
        )
        .options(
            selectinload(Inspection.product),
            selectinload(Inspection.production_line),
            selectinload(Inspection.inspector),
            selectinload(Inspection.defects)
        )
        .order_by(Inspection.created_at.desc())
    )
    
    result = await db.execute(query)
    inspections = result.scalars().all()
    
    # 2. File generation config
    report_id = uuid.uuid4().hex
    file_extension = f".{report_in.file_format}"
    filename = f"report_{report_id}{file_extension}"
    file_path = os.path.join(REPORTS_DIR, filename)
    file_url = f"/static/reports/{filename}"

    try:
        if report_in.file_format.lower() == "csv":
            await generate_csv_report(file_path, inspections)
        else:
            # HTML printable report formatted as a PDF page for browser rendering
            await generate_html_report(file_path, inspections, report_in, current_user.username)
            
        # 3. Save report details in DB
        new_report = Report(
            id=report_id,
            name=report_in.name,
            report_type=report_in.report_type,
            file_format=report_in.file_format,
            file_url=file_url,
            created_by_id=current_user.id
        )
        db.add(new_report)
        await db.commit()
        await db.refresh(new_report)
        return new_report
        
    except Exception as e:
        logger.exception(f"Report generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate report: {str(e)}"
        )

async def generate_csv_report(file_path: str, inspections: List[Inspection]):
    """Generates a CSV spreadsheet of the inspection list."""
    with open(file_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        # Write headers
        writer.writerow([
            "Inspection ID", "Timestamp", "SKU", "Product Name", 
            "Production Line", "Shift", "Inspector", "Status", 
            "Avg Confidence", "Defects Count", "Defects Summary"
        ])
        
        for ins in inspections:
            defects_summary = "; ".join([
                f"{d.defect_type} ({d.severity})" for d in ins.defects
            ])
            writer.writerow([
                ins.id,
                ins.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                ins.product.sku,
                ins.product.name,
                ins.production_line.name,
                ins.shift.upper(),
                ins.inspector.username,
                ins.status.upper(),
                round(ins.avg_confidence, 4),
                len(ins.defects),
                defects_summary
            ])

async def generate_html_report(
    file_path: str, 
    inspections: List[Inspection], 
    meta: ReportCreate,
    creator_username: str
):
    """Generates an HTML report styled like a formal quality paper."""
    passed_count = sum(1 for x in inspections if x.status == "pass")
    rework_count = sum(1 for x in inspections if x.status == "rework")
    reject_count = sum(1 for x in inspections if x.status == "reject")
    total_count = len(inspections)
    
    pass_rate = round((passed_count / total_count) * 100, 2) if total_count > 0 else 100.0
    
    html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{meta.name}</title>
    <style>
        body {{ font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }}
        .header {{ border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px; }}
        .header h1 {{ margin: 0; color: #1e293b; font-size: 28px; }}
        .header p {{ margin: 5px 0 0 0; color: #64748b; font-size: 14px; }}
        .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }}
        .meta-box {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 6px; }}
        .meta-box h3 {{ margin: 0 0 10px 0; color: #475569; font-size: 14px; text-transform: uppercase; }}
        .meta-box p {{ margin: 3px 0; font-size: 15px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }}
        .stat-card {{ border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; text-align: center; }}
        .stat-card .value {{ font-size: 24px; font-weight: bold; margin-top: 5px; }}
        .stat-card.pass {{ border-left: 5px solid #22c55e; color: #15803d; }}
        .stat-card.rework {{ border-left: 5px solid #eab308; color: #a16207; }}
        .stat-card.reject {{ border-left: 5px solid #ef4444; color: #b91c1c; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
        th {{ background: #1e293b; color: white; text-align: left; padding: 10px; font-size: 13px; }}
        td {{ border-bottom: 1px solid #e2e8f0; padding: 10px; font-size: 13px; }}
        tr:nth-child(even) {{ background: #f8fafc; }}
        .badge {{ padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }}
        .badge.pass {{ background: #dcfce7; color: #166534; }}
        .badge.rework {{ background: #fef9c3; color: #854d0e; }}
        .badge.reject {{ background: #fee2e2; color: #991b1b; }}
        @media print {{
            body {{ margin: 0; }}
            button {{ display: none; }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>FactoryVision AI - Quality Inspection Report</h1>
        <p>System Generated Report: {meta.name}</p>
    </div>

    <div class="meta-grid">
        <div class="meta-box">
            <h3>Report Parameters</h3>
            <p><strong>Type:</strong> {meta.report_type.upper()} Report</p>
            <p><strong>Export Date:</strong> {datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")}</p>
            <p><strong>Generated By:</strong> {creator_username}</p>
        </div>
        <div class="meta-box">
            <h3>Date Coverage</h3>
            <p><strong>Start Date:</strong> {meta.start_date.strftime("%Y-%m-%d %H:%M")}</p>
            <p><strong>End Date:</strong> {meta.end_date.strftime("%Y-%m-%d %H:%M")}</p>
        </div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div>Total Inspections</div>
            <div class="value">{total_count}</div>
        </div>
        <div class="stat-card pass">
            <div>Passed</div>
            <div class="value">{passed_count} ({pass_rate}%)</div>
        </div>
        <div class="stat-card rework">
            <div>Rework Required</div>
            <div class="value">{rework_count}</div>
        </div>
        <div class="stat-card reject">
            <div>Rejected / Scrapped</div>
            <div class="value">{reject_count}</div>
        </div>
    </div>

    <h2>Inspection History Log</h2>
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Product SKU</th>
                <th>Product Name</th>
                <th>Production Line</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Defects Detected</th>
            </tr>
        </thead>
        <tbody>
    """
    
    for ins in inspections:
        defects_text = ", ".join([d.defect_type for d in ins.defects]) or "None"
        badge_class = ins.status.lower()
        
        html_content += f"""
            <tr>
                <td>{ins.created_at.strftime("%Y-%m-%d %H:%M")}</td>
                <td>{ins.product.sku}</td>
                <td>{ins.product.name}</td>
                <td>{ins.production_line.name}</td>
                <td>{ins.shift.upper()}</td>
                <td><span class="badge {badge_class}">{ins.status.upper()}</span></td>
                <td>{int(ins.avg_confidence * 100)}%</td>
                <td>{defects_text}</td>
            </tr>
        """
        
    html_content += """
        </tbody>
    </table>
    <div style="margin-top: 40px; text-align: center; color: #94a3b8; font-size: 12px;">
        FactoryVision AI Quality Control Platform &copy; 2026. All rights reserved.
    </div>
</body>
</html>
    """
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(html_content)
