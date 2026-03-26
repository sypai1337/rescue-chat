import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio

async def test_register(client: AsyncClient):
    response = await client.post("/api/v1/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "hashed_password" not in data

async def test_register_duplicate_email(client: AsyncClient):
    payload = {"username": "user1", "email": "dup@example.com", "password": "pass"}
    await client.post("/api/v1/auth/register", json=payload)

    payload["username"] = "user2"
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 400

async def test_login(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "username": "loginuser",
        "email": "login@example.com",
        "password": "password123",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "login@example.com",
        "password": "password123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()

async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "username": "user3",
        "email": "user3@example.com",
        "password": "correctpass",
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "user3@example.com",
        "password": "wrongpass",
    })
    assert response.status_code == 401

async def test_get_me(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "username": "meuser",
        "email": "me@example.com",
        "password": "password123",
    })
    login = await client.post("/api/v1/auth/login", json={
        "email": "me@example.com",
        "password": "password123",
    })
    token = login.json()["access_token"]

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"