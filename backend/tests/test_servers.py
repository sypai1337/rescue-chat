import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def _register_and_login(client: AsyncClient, username: str, email: str) -> str:
    await client.post("/api/v1/auth/register", json={
        "username": username,
        "email": email,
        "password": "password123",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "password123",
    })
    return response.json()["access_token"]

async def test_create_server(client: AsyncClient):
    token = await _register_and_login(client, "owner", "owner@example.com")
    response = await client.post(
        "/api/v1/servers",
        json={"name": "My Server"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 201
    assert response.json()["name"] == "My Server"

async def test_list_servers(client: AsyncClient):
    token = await _register_and_login(client, "owner2", "owner2@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    await client.post("/api/v1/servers", json={"name": "Server 1"}, headers=headers)
    await client.post("/api/v1/servers", json={"name": "Server 2"}, headers=headers)

    response = await client.get("/api/v1/servers", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2

async def test_delete_server(client: AsyncClient):
    token = await _register_and_login(client, "owner3", "owner3@example.com")
    headers = {"Authorization": f"Bearer {token}"}

    server = await client.post(
        "/api/v1/servers", json={"name": "To Delete"}, headers=headers
    )
    server_id = server.json()["id"]

    response = await client.delete(f"/api/v1/servers/{server_id}", headers=headers)
    assert response.status_code == 204

async def test_delete_server_not_owner(client: AsyncClient):
    owner_token = await _register_and_login(client, "owner4", "owner4@example.com")
    other_token = await _register_and_login(client, "other", "other@example.com")

    server = await client.post(
        "/api/v1/servers",
        json={"name": "Protected"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    server_id = server.json()["id"]

    response = await client.delete(
        f"/api/v1/servers/{server_id}",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert response.status_code == 403