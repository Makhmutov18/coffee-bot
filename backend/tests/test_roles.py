"""Tests for POST /api/companies/change-role — логика смены ролей."""
import pytest


class TestChangeRole:
    """Проверка эндпоинта POST /api/companies/change-role."""

    # ── Успешные сценарии ──

    @pytest.mark.asyncio
    async def test_owner_changes_barista_to_manager(
        self, client, test_users, test_company, test_spots, test_attachments,
    ):
        """Owner успешно меняет роль бариста на 'manager' на Spot B."""
        barista = test_users["barista"]
        spot_b = test_spots["spot_b"]

        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={
                "user_id": barista.id,
                "spot_id": spot_b.id,
                "new_role": "manager",
            },
        )
        assert resp.status == 200
        data = await resp.json()
        assert data["new_role"] == "manager"
        assert data["user_id"] == barista.id
        assert data["old_role"] == "barista"

    @pytest.mark.asyncio
    async def test_owner_changes_manager_to_barista(
        self, client, test_users, test_company, test_spots, test_attachments,
    ):
        """Owner успешно меняет роль менеджера обратно на 'barista' на Spot A."""
        manager = test_users["manager"]
        spot_a = test_spots["spot_a"]

        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={
                "user_id": manager.id,
                "spot_id": spot_a.id,
                "new_role": "barista",
            },
        )
        assert resp.status == 200
        data = await resp.json()
        assert data["new_role"] == "barista"
        assert data["user_id"] == manager.id

    # ── Ошибки доступа ──

    @pytest.mark.asyncio
    async def test_barista_cannot_change_role(
        self, client, test_users, test_spots, test_attachments,
    ):
        """Бариста пытается сменить роль — получает 403."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["barista"].id)},
            json={
                "user_id": test_users["manager"].id,
                "spot_id": test_spots["spot_a"].id,
                "new_role": "barista",
            },
        )
        assert resp.status == 403
        data = await resp.json()
        assert "error" in data

    @pytest.mark.asyncio
    async def test_manager_cannot_change_role(
        self, client, test_users, test_spots, test_attachments,
    ):
        """Менеджер пытается сменить роль — получает 403."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["manager"].id)},
            json={
                "user_id": test_users["barista"].id,
                "spot_id": test_spots["spot_b"].id,
                "new_role": "manager",
            },
        )
        assert resp.status == 403

    @pytest.mark.asyncio
    async def test_personal_cannot_change_role(
        self, client, test_users, test_spots,
    ):
        """Personal пытается сменить роль — получает 403."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["personal"].id)},
            json={
                "user_id": test_users["owner"].id,
                "spot_id": test_spots["spot_a"].id,
                "new_role": "barista",
            },
        )
        assert resp.status == 403

    @pytest.mark.asyncio
    async def test_owner_cannot_change_role_on_foreign_spot(
        self, client, test_users, test_company, test_spots, test_attachments, db_session,
    ):
        """Owner пытается сменить роль на споте, не принадлежащем его компании → 403.

        Создаём другую компанию с другим спотом и пытаемся сменить роль там.
        """
        from app.database import Company, Spot

        other_company = Company(name="Other Co", owner_id=test_users["personal"].id)
        db_session.add(other_company)
        db_session.flush()

        other_spot = Spot(company_id=other_company.id, name="Other Spot")
        db_session.add(other_spot)
        db_session.flush()

        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={
                "user_id": test_users["barista"].id,
                "spot_id": other_spot.id,
                "new_role": "manager",
            },
        )
        assert resp.status == 403

    # ── Валидация ──

    @pytest.mark.asyncio
    async def test_missing_fields_returns_400(
        self, client, test_users,
    ):
        """Запрос без обязательных полей → 400."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={"user_id": 1},
        )
        assert resp.status == 400

    @pytest.mark.asyncio
    async def test_invalid_role_returns_400(
        self, client, test_users, test_spots,
    ):
        """Запрос с невалидной ролью → 400."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={
                "user_id": test_users["barista"].id,
                "spot_id": test_spots["spot_a"].id,
                "new_role": "superadmin",
            },
        )
        assert resp.status == 400

    @pytest.mark.asyncio
    async def test_nonexistent_user_returns_404(
        self, client, test_users, test_spots,
    ):
        """Смена роли несуществующему пользователю → 404."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={
                "user_id": 99999,
                "spot_id": test_spots["spot_a"].id,
                "new_role": "manager",
            },
        )
        assert resp.status == 404

    @pytest.mark.asyncio
    async def test_unattached_user_returns_400(
        self, client, test_users, test_company, test_spots,
    ):
        """Смена роли пользователю, не привязанному к споту → 400."""
        resp = await client.post(
            "/api/companies/change-role",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
            json={
                "user_id": test_users["personal"].id,
                "spot_id": test_spots["spot_a"].id,
                "new_role": "manager",
            },
        )
        assert resp.status == 400