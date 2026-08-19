import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_analytics_endpoints(client: AsyncClient):
    # 1. Register and login Inspector
    user_payload = {
        "username": "analytics_operator",
        "email": "analytics@test.com",
        "password": "securepassword123",
        "role": "inspector"
    }
    await client.post("/api/auth/register", json=user_payload)
    login_res = await client.post("/api/auth/login", data={"username": "analytics_operator", "password": "securepassword123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Query Dashboard Analytics (should return structure even if empty)
    dash_res = await client.get("/api/analytics/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "kpis" in dash_data
    assert "defect_distribution" in dash_data
    assert "production_trends" in dash_data
    assert "line_performance" in dash_data
    assert "shift_performance" in dash_data
    
    # Check default KPI types
    kpis = dash_data["kpis"]
    assert kpis["total_inspections"] >= 0
    assert kpis["pass_rate"] <= 100.0
    assert kpis["fail_rate"] >= 0.0

    # 3. Query Heatmap Matrix
    heat_res = await client.get("/api/analytics/heatmap", headers=headers)
    assert heat_res.status_code == 200
    heat_data = heat_res.json()
    assert "defect_types" in heat_data
    assert "matrix" in heat_data
    assert isinstance(heat_data["defect_types"], list)
    assert isinstance(heat_data["matrix"], list)
