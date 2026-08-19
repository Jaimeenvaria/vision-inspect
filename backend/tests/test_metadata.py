import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_metadata_operations(client: AsyncClient):
    # 1. Register test users (Inspector & Supervisor)
    inspector_payload = {
        "username": "metadata_inspector",
        "email": "m_inspector@test.com",
        "password": "securepassword123",
        "role": "inspector"
    }
    await client.post("/api/auth/register", json=inspector_payload)
    
    supervisor_payload = {
        "username": "metadata_supervisor",
        "email": "m_supervisor@test.com",
        "password": "securepassword123",
        "role": "supervisor"
    }
    await client.post("/api/auth/register", json=supervisor_payload)

    # Log in both users to obtain tokens
    inspector_login = await client.post("/api/auth/login", data={"username": "metadata_inspector", "password": "securepassword123"})
    inspector_token = inspector_login.json()["access_token"]
    inspector_headers = {"Authorization": f"Bearer {inspector_token}"}

    supervisor_login = await client.post("/api/auth/login", data={"username": "metadata_supervisor", "password": "securepassword123"})
    supervisor_token = supervisor_login.json()["access_token"]
    supervisor_headers = {"Authorization": f"Bearer {supervisor_token}"}

    # 2. Query products without auth (should fail with 401)
    unauth_products = await client.get("/api/products")
    assert unauth_products.status_code == 401

    # 3. Create product with Inspector token (should fail with 403)
    new_product_payload = {
        "sku": "TSLA-BAT-2170",
        "name": "2170 Battery Cell",
        "description": "Standard high energy density cell used in Model 3/Y."
    }
    inspect_create_prod = await client.post("/api/products", json=new_product_payload, headers=inspector_headers)
    assert inspect_create_prod.status_code == 403

    # 4. Create product with Supervisor token (should succeed with 201)
    super_create_prod = await client.post("/api/products", json=new_product_payload, headers=supervisor_headers)
    assert super_create_prod.status_code == 201
    prod_data = super_create_prod.json()
    assert prod_data["sku"] == "TSLA-BAT-2170"
    assert prod_data["name"] == "2170 Battery Cell"

    # 5. Create duplicate SKU with Supervisor token (should fail with 400)
    super_create_dup = await client.post("/api/products", json=new_product_payload, headers=supervisor_headers)
    assert super_create_dup.status_code == 400

    # 6. List products with Inspector token (should succeed with 200)
    inspect_list_prod = await client.get("/api/products", headers=inspector_headers)
    assert inspect_list_prod.status_code == 200
    products = inspect_list_prod.json()
    assert len(products) >= 1
    assert products[0]["sku"] == "TSLA-BAT-2170"

    # 7. Create production line with Inspector token (should fail with 403)
    new_line_payload = {
        "name": "Paint Booth Line 3",
        "location": "Sector 9",
        "status": "active"
    }
    inspect_create_line = await client.post("/api/production-lines", json=new_line_payload, headers=inspector_headers)
    assert inspect_create_line.status_code == 403

    # 8. Create production line with Supervisor token (should succeed with 201)
    super_create_line = await client.post("/api/production-lines", json=new_line_payload, headers=supervisor_headers)
    assert super_create_line.status_code == 201
    line_data = super_create_line.json()
    assert line_data["name"] == "Paint Booth Line 3"

    # 9. List production lines with Inspector token (should succeed with 200)
    inspect_list_lines = await client.get("/api/production-lines", headers=inspector_headers)
    assert inspect_list_lines.status_code == 200
    lines = inspect_list_lines.json()
    assert len(lines) >= 1
    assert lines[0]["name"] == "Paint Booth Line 3"
