import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta

@pytest.mark.asyncio
async def test_report_generation_and_history(client: AsyncClient):
    # 1. Register and login Admin
    user_payload = {
        "username": "report_admin",
        "email": "reports@test.com",
        "password": "securepassword123",
        "role": "admin"
    }
    await client.post("/api/auth/register", json=user_payload)
    login_res = await client.post("/api/auth/login", data={"username": "report_admin", "password": "securepassword123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Trigger CSV Report Generation
    start_date = (datetime.utcnow() - timedelta(days=5)).isoformat()
    end_date = datetime.utcnow().isoformat()
    
    csv_payload = {
        "name": "Five-Day Production Review (CSV)",
        "report_type": "daily",
        "file_format": "csv",
        "start_date": start_date,
        "end_date": end_date
    }
    
    csv_res = await client.post("/api/reports/generate", json=csv_payload, headers=headers)
    assert csv_res.status_code == 201
    csv_data = csv_res.json()
    assert csv_data["name"] == "Five-Day Production Review (CSV)"
    assert csv_data["file_format"] == "csv"
    assert csv_data["file_url"].endswith(".csv")

    # 3. Trigger HTML (Printable PDF style) Report Generation
    pdf_payload = {
        "name": "Five-Day Production Review (PDF)",
        "report_type": "daily",
        "file_format": "pdf",
        "start_date": start_date,
        "end_date": end_date
    }
    
    pdf_res = await client.post("/api/reports/generate", json=pdf_payload, headers=headers)
    assert pdf_res.status_code == 201
    pdf_data = pdf_res.json()
    assert pdf_data["name"] == "Five-Day Production Review (PDF)"
    assert pdf_data["file_format"] == "pdf"
    assert pdf_data["file_url"].endswith(".pdf")  # Generated as PDF extension but holds HTML template for printing

    # 4. List Reports History
    history_res = await client.get("/api/reports", headers=headers)
    assert history_res.status_code == 200
    reports_list = history_res.json()
    assert len(reports_list) >= 2
    assert reports_list[0]["name"] in ["Five-Day Production Review (PDF)", "Five-Day Production Review (CSV)"]
