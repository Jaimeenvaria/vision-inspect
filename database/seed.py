import asyncio
import random
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt

from database.db import Base, engine, AsyncSessionLocal
from database.models import User, Product, ProductionLine, Inspection, Defect, InspectionImage

# Helper to hash passwords
def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

# Sample Data Config
PRODUCTS_DATA = [
    {"sku": "TSLA-PANEL-M3", "name": "Model 3 Door Panel", "description": "Stamped aluminum exterior side door panel for Tesla Model 3."},
    {"sku": "TSLA-BAT-4680", "name": "4680 Battery Cell", "description": "High-density cylindrical battery cell for structural battery packs."},
    {"sku": "TSLA-CHAS-MY", "name": "Model Y Rear Underbody Casting", "description": "Giga-casted single-piece rear structural underbody."},
    {"sku": "TSLA-ROOF-MS", "name": "Model S Glass Roof Panel", "description": "Panoramic tempered glass panel with UV/IR protection layer."}
]

LINES_DATA = [
    {"name": "Body Assembly Line A", "location": "Sector 4, Gigafactory Texas", "status": "active"},
    {"name": "Cell Manufacturing Line B", "location": "Sector 2, Gigafactory Nevada", "status": "active"},
    {"name": "Stamping Press Line C", "location": "Sector 1, Gigafactory Berlin", "status": "active"},
    {"name": "Final Assembly Line D", "location": "Sector 5, Gigafactory Shanghai", "status": "maintenance"}
]

USERS_DATA = [
    {"username": "admin", "email": "admin@factoryvision.ai", "password_hash": hash_password("admin123"), "role": "admin"},
    {"username": "supervisor_john", "email": "john.s@factoryvision.ai", "password_hash": hash_password("supervisor123"), "role": "supervisor"},
    {"username": "inspector_sarah", "email": "sarah.i@factoryvision.ai", "password_hash": hash_password("inspector123"), "role": "inspector"},
    {"username": "inspector_mike", "email": "mike.i@factoryvision.ai", "password_hash": hash_password("inspector123"), "role": "inspector"}
]

DEFECT_TYPES = [
    {"type": "scratch", "severity": "low", "explanation": "Surface scratch detected. Clear coat is lightly scratched.", "action": "REWORK: Direct to paint buffer station."},
    {"type": "dent", "severity": "medium", "explanation": "Minor dent detected. Deviation exceeds 1.5mm tolerance.", "action": "REWORK: Direct to manual dent correction station."},
    {"type": "crack", "severity": "high", "explanation": "Structural crack detected in die-cast junction. Safety integrity compromised.", "action": "REJECT: Scrap part immediately."},
    {"type": "paint defect", "severity": "low", "explanation": "Paint run / drip detected on edge flange.", "action": "REWORK: Send to sanding and touch-up line."},
    {"type": "misalignment", "severity": "medium", "explanation": "Component alignment out of specification by 2.4mm.", "action": "REWORK: Send to robot recalibration or manual adjustment."},
    {"type": "missing component", "severity": "high", "explanation": "Fastener bolt missing from secondary bracket.", "action": "REWORK: Send back to assembly station B for bolt insertion."},
    {"type": "rust", "severity": "high", "explanation": "Oxidation corrosion detected on exposed steel bracket.", "action": "REJECT: Scrap component due to rust contamination."},
    {"type": "anomaly", "severity": "medium", "explanation": "Unknown surface discoloration or material inclusion.", "action": "REWORK: Send to quality supervisor desk for manual review."}
]

SHIFTS = ["morning", "afternoon", "night"]

# Base mock image URLs
MOCK_ORIGINAL_URLS = [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&auto=format&fit=crop", # factory machine/part
    "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&auto=format&fit=crop", # steel sheet
    "https://images.unsplash.com/photo-1537462715879-360eeb61a0bc?w=800&auto=format&fit=crop", # mechanical part
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&auto=format&fit=crop"  # metal construction
]

async def seed_database():
    print("Connecting to database and dropping existing tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating database tables...")
        await conn.run_sync(Base.metadata.create_all)

    print("Tables created successfully.")
    
    async with AsyncSessionLocal() as session:
        # 1. Seed Users
        users = []
        for user_info in USERS_DATA:
            user = User(**user_info)
            session.add(user)
            users.append(user)
        
        # 2. Seed Products
        products = []
        for prod_info in PRODUCTS_DATA:
            product = Product(**prod_info)
            session.add(product)
            products.append(product)
            
        # 3. Seed Production Lines
        lines = []
        for line_info in LINES_DATA:
            line = ProductionLine(**line_info)
            session.add(line)
            lines.append(line)
            
        await session.commit()
        
        # Refresh to get IDs
        for u in users: await session.refresh(u)
        for p in products: await session.refresh(p)
        for l in lines: await session.refresh(l)
        
        inspectors = [u for u in users if u.role in ["inspector", "supervisor"]]
        active_lines = [l for l in lines if l.status == "active"]

        print(f"Users, Products, and Production Lines seeded. Starting inspection logs seeding...")
        
        # 4. Generate inspections for the last 30 days
        start_date = datetime.datetime.utcnow() - datetime.timedelta(days=30)
        now = datetime.datetime.utcnow()
        
        total_inspections = 0
        total_defects = 0
        
        current_date = start_date
        while current_date <= now:
            # 8 to 15 inspections per day
            inspections_today = random.randint(8, 15)
            for _ in range(inspections_today):
                product = random.choice(products)
                line = random.choice(active_lines)
                inspector = random.choice(inspectors)
                shift = random.choice(SHIFTS)
                
                # Determine status
                # 82% Pass, 12% Rework, 6% Reject
                rand = random.random()
                if rand < 0.82:
                    status = "pass"
                    avg_confidence = random.uniform(0.92, 0.99)
                elif rand < 0.94:
                    status = "rework"
                    avg_confidence = random.uniform(0.72, 0.88)
                else:
                    status = "reject"
                    avg_confidence = random.uniform(0.60, 0.85)
                
                # Set specific timestamp spread across the day
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                second = random.randint(0, 59)
                inspection_time = current_date.replace(hour=hour, minute=minute, second=second)
                
                notes = f"Routine inspection completed during {shift} shift."
                if status != "pass":
                    notes = f"Defect detected during {shift} shift inspection. Action required."
                
                inspection = Inspection(
                    product_id=product.id,
                    production_line_id=line.id,
                    inspector_id=inspector.id,
                    status=status,
                    shift=shift,
                    avg_confidence=avg_confidence,
                    notes=notes,
                    created_at=inspection_time
                )
                session.add(inspection)
                await session.flush() # Generate inspection ID
                total_inspections += 1
                
                # Create corresponding Image
                img_url = random.choice(MOCK_ORIGINAL_URLS)
                image = InspectionImage(
                    inspection_id=inspection.id,
                    original_url=img_url,
                    annotated_url=img_url, # Simulating annotated as original for historical seed data
                    storage_provider="local",
                    created_at=inspection_time
                )
                session.add(image)
                
                # If Rework or Reject, add defects
                if status != "pass":
                    num_defects = 1 if status == "rework" else random.randint(1, 3)
                    for _ in range(num_defects):
                        defect_meta = random.choice(DEFECT_TYPES)
                        
                        # Adjust defect configuration based on status
                        defect_type = defect_meta["type"]
                        severity = defect_meta["severity"]
                        
                        # High severity triggers rejection
                        if status == "reject" and random.random() < 0.7:
                            severity = "high"
                        elif status == "rework":
                            severity = random.choice(["low", "medium"])
                            
                        # Bounding box coordinates
                        x_min = random.uniform(0.05, 0.6)
                        y_min = random.uniform(0.05, 0.6)
                        x_max = x_min + random.uniform(0.1, 0.3)
                        y_max = y_min + random.uniform(0.1, 0.3)
                        
                        confidence = random.uniform(0.65, 0.95)
                        
                        defect = Defect(
                            inspection_id=inspection.id,
                            defect_type=defect_type,
                            confidence=confidence,
                            severity=severity,
                            x_min=round(x_min, 4),
                            y_min=round(y_min, 4),
                            x_max=round(x_max, 4),
                            y_max=round(y_max, 4),
                            explanation=defect_meta["explanation"],
                            suggested_action=defect_meta["action"],
                            created_at=inspection_time
                        )
                        session.add(defect)
                        total_defects += 1
            
            current_date += datetime.timedelta(days=1)
            
        await session.commit()
        print(f"Successfully seeded {total_inspections} inspections and {total_defects} defects!")

if __name__ == "__main__":
    asyncio.run(seed_database())
