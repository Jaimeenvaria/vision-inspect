import pytest
from io import BytesIO
from PIL import Image
from httpx import AsyncClient

def create_dummy_image_bytes(name: str = "test.jpg") -> tuple[bytes, str]:
    file = BytesIO()
    image = Image.new('RGB', (200, 200), color='blue')
    image.save(file, 'jpeg')
    file.seek(0)
    return file.read(), name

@pytest.mark.asyncio
async def test_inspect_and_query_flow(client: AsyncClient):
    # 1. Register and login Inspector
    user_payload = {
        "username": "inspect_operator",
        "email": "operator@test.com",
        "password": "securepassword123",
        "role": "inspector"
    }
    await client.post("/api/auth/register", json=user_payload)
    login_res = await client.post("/api/auth/login", data={"username": "inspect_operator", "password": "securepassword123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create product & line (needs supervisor/admin login first)
    admin_payload = {
        "username": "inspect_admin",
        "email": "admin_i@test.com",
        "password": "securepassword123",
        "role": "admin"
    }
    await client.post("/api/auth/register", json=admin_payload)
    admin_login = await client.post("/api/auth/login", data={"username": "inspect_admin", "password": "securepassword123"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Create Product
    prod_res = await client.post("/api/products", json={
        "sku": "TSLA-BAT-4680-T",
        "name": "Test Battery Cell",
        "description": "Test battery cell model."
    }, headers=admin_headers)
    assert prod_res.status_code == 201
    prod_id = prod_res.json()["id"]

    # Create Production Line
    line_res = await client.post("/api/production-lines", json={
        "name": "Test Line T1",
        "location": "Sector 99",
        "status": "active"
    }, headers=admin_headers)
    assert line_res.status_code == 201
    line_id = line_res.json()["id"]

    # 3. Perform image inspection (upload mock image containing 'scratch' in filename to trigger mock scratch)
    img_bytes, img_name = create_dummy_image_bytes(name="scratch_part.jpg")
    
    # Prepare files and form data
    files = {"file": (img_name, img_bytes, "image/jpeg")}
    data = {
        "product_id": prod_id,
        "production_line_id": line_id,
        "shift": "morning",
        "notes": "Testing automated defect detection"
    }

    # Trigger inspection
    inspect_res = await client.post(
        "/api/inspections/inspect",
        data=data,
        files=files,
        headers=headers
    )
    assert inspect_res.status_code == 201
    inspect_data = inspect_res.json()
    assert inspect_data["status"] == "rework" # Scratch is low/medium severity, so status should be 'rework'
    assert inspect_data["shift"] == "morning"
    assert len(inspect_data["defects"]) == 1
    assert inspect_data["defects"][0]["defect_type"] == "scratch"
    assert "explanation" in inspect_data["defects"][0]
    assert "suggested_action" in inspect_data["defects"][0]
    assert inspect_data["image"]["original_url"] != ""
    assert inspect_data["image"]["annotated_url"] != ""

    # 4. Fetch inspection by ID
    inspection_id = inspect_data["id"]
    detail_res = await client.get(f"/api/inspections/{inspection_id}", headers=headers)
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == inspection_id
    assert detail_data["product"]["sku"] == "TSLA-BAT-4680-T"
    assert detail_data["production_line"]["name"] == "Test Line T1"
    assert detail_data["inspector"]["username"] == "inspect_operator"

    # 5. Search / List inspections
    list_res = await client.get("/api/inspections", headers=headers)
    assert list_res.status_code == 200
    inspections_list = list_res.json()
    assert len(inspections_list) >= 1
    assert inspections_list[0]["id"] == inspection_id

    # Filtered List
    list_filt_res = await client.get(f"/api/inspections?status=rework&shift=morning&product_id={prod_id}", headers=headers)
    assert list_filt_res.status_code == 200
    assert len(list_filt_res.json()) >= 1

    # Filtered List with mismatch (should return 0)
    list_empty_res = await client.get(f"/api/inspections?status=reject", headers=headers)
    assert list_empty_res.status_code == 200
    assert len(list_empty_res.json()) == 0
