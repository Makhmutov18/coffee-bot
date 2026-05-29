"""Tests for GET /api/recipes — доступ к рецептам по ролям."""
import pytest


class TestListRecipesAccess:
    """Проверка эндпоинта GET /api/recipes с разными ролями."""

    # ── Owner ──

    @pytest.mark.asyncio
    async def test_owner_sees_all_company_recipes_by_spot(
        self, client, test_users, test_spots, test_recipes, test_attachments,
    ):
        """Owner запрашивает рецепты Spot A — видит оба рецепта (A1 и A2)."""
        resp = await client.get(
            f"/api/recipes?spotId={test_spots['spot_a'].id}",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        recipe_names = {r["name"] for r in data}
        assert "Recipe A1" in recipe_names
        assert "Recipe A2" in recipe_names
        assert "Recipe B1" not in recipe_names  # Spot B не запрашивали

    @pytest.mark.asyncio
    async def test_owner_sees_own_recipes_without_spot_id(
        self, client, test_users, test_recipes, test_attachments,
    ):
        """Owner без spotId видит рецепты, где user_id == owner.id (Recipe A1)."""
        resp = await client.get(
            "/api/recipes",
            headers={"X-Test-User-Id": str(test_users["owner"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        # Owner создал Recipe A1 (user_id=owner.id) — он показывается как "личный"
        assert len(data) == 1
        assert data[0]["name"] == "Recipe A1"

    # ── Manager ──

    @pytest.mark.asyncio
    async def test_manager_sees_recipes_of_attached_spot(
        self, client, test_users, test_spots, test_recipes, test_attachments,
    ):
        """Manager (привязан к Spot A) видит рецепты Spot A (A1 и A2)."""
        resp = await client.get(
            f"/api/recipes?spotId={test_spots['spot_a'].id}",
            headers={"X-Test-User-Id": str(test_users["manager"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        recipe_names = {r["name"] for r in data}
        assert "Recipe A1" in recipe_names
        assert "Recipe A2" in recipe_names

    @pytest.mark.asyncio
    async def test_manager_cannot_see_other_spot_recipes(
        self, client, test_users, test_spots, test_recipes, test_attachments,
    ):
        """Manager (привязан к Spot A) запрашивает рецепты Spot B → 403."""
        resp = await client.get(
            f"/api/recipes?spotId={test_spots['spot_b'].id}",
            headers={"X-Test-User-Id": str(test_users["manager"].id)},
        )
        assert resp.status == 403
        data = await resp.json()
        assert "error" in data

    @pytest.mark.asyncio
    async def test_manager_sees_personal_and_attached_spot_without_spot_id(
        self, client, test_users, test_spots, test_recipes, test_attachments, db_session,
    ):
        """Manager без spotId видит личные рецепты + рецепты привязанных спотов.

        Создаём личный рецепт для manager, чтобы проверить.
        """
        from app.database import Recipe

        personal_recipe = Recipe(
            user_id=test_users["manager"].id,
            name="Manager Personal",
            bean_variety="Test",
            dose=15.0,
            dripper_type="V60",
            total_water=250.0,
        )
        db_session.add(personal_recipe)
        db_session.flush()

        resp = await client.get(
            "/api/recipes",
            headers={"X-Test-User-Id": str(test_users["manager"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        recipe_names = {r["name"] for r in data}
        assert "Manager Personal" in recipe_names
        assert "Recipe A1" in recipe_names
        assert "Recipe A2" in recipe_names
        assert "Recipe B1" not in recipe_names  # Spot B — не его спот

    # ── Barista ──

    @pytest.mark.asyncio
    async def test_barista_sees_recipes_of_attached_spot(
        self, client, test_users, test_spots, test_recipes, test_attachments,
    ):
        """Barista (привязан к Spot B) видит рецепты Spot B."""
        resp = await client.get(
            f"/api/recipes?spotId={test_spots['spot_b'].id}",
            headers={"X-Test-User-Id": str(test_users["barista"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        recipe_names = {r["name"] for r in data}
        assert "Recipe B1" in recipe_names
        assert "Recipe A1" not in recipe_names

    @pytest.mark.asyncio
    async def test_barista_can_see_any_spot_recipes_by_spot_id(
        self, client, test_users, test_spots, test_recipes, test_attachments,
    ):
        """Barista запрашивает рецепты Spot A по spotId — видит их.

        Текущая реализация не проверяет привязку barista к споту при фильтре по spotId.
        """
        resp = await client.get(
            f"/api/recipes?spotId={test_spots['spot_a'].id}",
            headers={"X-Test-User-Id": str(test_users["barista"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        # Barista видит рецепты Spot A (A1 и A2) — привязка не проверяется
        recipe_names = {r["name"] for r in data}
        assert "Recipe A1" in recipe_names
        assert "Recipe A2" in recipe_names

    # ── Personal ──

    @pytest.mark.asyncio
    async def test_personal_sees_only_own_recipes(
        self, client, test_users, test_recipes, test_attachments,
    ):
        """Personal видит только свои личные рецепты."""
        resp = await client.get(
            "/api/recipes",
            headers={"X-Test-User-Id": str(test_users["personal"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        assert len(data) == 1
        assert data[0]["name"] == "Personal Recipe"

    @pytest.mark.asyncio
    async def test_personal_ignores_spot_id_param(
        self, client, test_users, test_spots, test_recipes, test_attachments,
    ):
        """Personal с spotId всё равно видит только свои рецепты (spotId игнорируется)."""
        resp = await client.get(
            f"/api/recipes?spotId={test_spots['spot_a'].id}",
            headers={"X-Test-User-Id": str(test_users["personal"].id)},
        )
        assert resp.status == 200
        data = await resp.json()
        # Personal всегда фильтрует по user_id, spotId игнорируется
        assert len(data) == 1
        assert data[0]["name"] == "Personal Recipe"

    # ── Без аутентификации ──

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_401(self, client):
        """Запрос без X-Test-User-Id → 401."""
        resp = await client.get("/api/recipes")
        assert resp.status == 401