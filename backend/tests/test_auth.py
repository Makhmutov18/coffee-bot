"""Tests for GET /api/user/me — авторизация и данные текущего пользователя."""
import pytest


class TestGetCurrentUser:
    """Проверка эндпоинта GET /api/user/me."""

    @pytest.mark.asyncio
    async def test_returns_current_user_data(self, client, test_users):
        """Owner запрашивает свои данные — получает id, telegramId, name, username, role."""
        resp = await client.get(
            "/api/user/me",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        assert data["id"] == test_users["owner"].id
        assert data["telegramId"] == "100"
        assert data["name"] == "Owner"
        assert data["username"] == "owner_user"
        assert data["role"] == "owner"

    @pytest.mark.asyncio
    async def test_returns_401_without_auth_header(self, client):
        """Запрос без X-Test-User-Id → 401."""
        resp = await client.get("/api/user/me")
        assert resp.status == 401
        data = await resp.json()
        assert "error" in data

    @pytest.mark.asyncio
    async def test_returns_401_with_invalid_user_id(self, client):
        """Запрос с несуществующим user_id → 401."""
        resp = await client.get(
            "/api/user/me",
            headers={"X-Test-User-Id": "99999"},
        )
        assert resp.status == 401

    @pytest.mark.asyncio
    async def test_barista_returns_own_data(self, client, test_users):
        """Бариста запрашивает свои данные — получает role='barista'."""
        resp = await client.get(
            "/api/user/me",
            headers={"X-Test-User-Id": str(test_users["barista"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        assert data["role"] == "barista"
        assert data["telegramId"] == "300"

    @pytest.mark.asyncio
    async def test_personal_returns_own_data(self, client, test_users):
        """Personal запрашивает свои данные — получает role='personal'."""
        resp = await client.get(
            "/api/user/me",
            headers={"X-Test-User-Id": str(test_users["personal"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        assert data["role"] == "personal"
        assert data["telegramId"] == "400"