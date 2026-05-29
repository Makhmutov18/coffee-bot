"""Test fixtures for Brew Lab API tests.

Создаёт in-memory SQLite БД, тестовых пользователей (owner/manager/barista/personal),
компанию, споты, привязки (user_spots) и рецепты. Вместо Telegram HMAC-аутентификации
использует заголовок X-Test-User-Id для инъекции тестового пользователя.
"""
import os

# Устанавливаем BOT_TOKEN ДО импорта app-модулей, чтобы auth.py не упал
os.environ["BOT_TOKEN"] = "test_bot_token_for_hmac"

import pytest
from aiohttp import web
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import (
    Base, User, Company, Spot, Recipe, user_spots,
    UserRole,
)
from app.api import setup_api_routes


# ═══════════════════════════════════════════════════════════════
# Database fixtures
# ═══════════════════════════════════════════════════════════════

@pytest.fixture(scope="session")
def test_engine():
    """Create an in-memory SQLite engine once per test session.

    Все таблицы создаются один раз и переиспользуются между тестами.
    Каждый тест работает в своей транзакции, которая откатывается в конце.
    """
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    return engine


@pytest.fixture
def db_session(test_engine):
    """Create a fresh transaction-backed session for each test function.

    После завершения теста транзакция откатывается — данные не засоряют
    следующие тесты. Также подменяет глобальный ``app.database._engine``,
    чтобы ``init_db()`` (если вдруг вызывается) использовал тестовый engine.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)

    # Подменяем глобальный engine, чтобы init_db() не создавал новый
    import app.database  # noqa: F811
    app.database._engine = test_engine

    yield session

    session.close()
    transaction.rollback()
    connection.close()


# ═══════════════════════════════════════════════════════════════
# Data fixtures (строятся друг на друге через dependency injection)
# ═══════════════════════════════════════════════════════════════

@pytest.fixture
def test_users(db_session):
    """Create four test users with different roles.

    Returns
    -------
    dict[str, User]
        Ключи: owner, manager, barista, personal
    """
    owner = User(
        telegram_id="100",
        name="Owner",
        username="owner_user",
        role=UserRole.owner.value,
    )
    manager = User(
        telegram_id="200",
        name="Manager",
        username="manager_user",
        role=UserRole.manager.value,
    )
    barista = User(
        telegram_id="300",
        name="Barista",
        username="barista_user",
        role=UserRole.barista.value,
    )
    personal = User(
        telegram_id="400",
        name="Personal",
        username="personal_user",
        role=UserRole.personal.value,
    )
    db_session.add_all([owner, manager, barista, personal])
    db_session.flush()
    return {"owner": owner, "manager": manager, "barista": barista, "personal": personal}


@pytest.fixture
def test_company(db_session, test_users):
    """Create a company owned by the owner user."""
    company = Company(name="Test Coffee Co", owner_id=test_users["owner"].id)
    db_session.add(company)
    db_session.flush()
    return company


@pytest.fixture
def test_spots(db_session, test_company):
    """Create two spots (Spot A, Spot B) within the test company."""
    spot_a = Spot(
        company_id=test_company.id,
        name="Spot A",
        address="Address A",
        water_ppm=70,
        grinder_model="Comandante C40",
    )
    spot_b = Spot(
        company_id=test_company.id,
        name="Spot B",
        address="Address B",
        water_ppm=80,
        grinder_model="EK43",
    )
    db_session.add_all([spot_a, spot_b])
    db_session.flush()
    return {"spot_a": spot_a, "spot_b": spot_b}


@pytest.fixture
def test_attachments(db_session, test_users, test_spots):
    """Attach manager → Spot A, barista → Spot B via user_spots M2M."""
    db_session.execute(
        user_spots.insert(),
        [
            {"user_id": test_users["manager"].id, "spot_id": test_spots["spot_a"].id},
            {"user_id": test_users["barista"].id, "spot_id": test_spots["spot_b"].id},
        ],
    )
    db_session.flush()
    return


@pytest.fixture
def test_recipes(db_session, test_users, test_spots):
    """Create four recipes: two on Spot A, one on Spot B, one personal."""
    recipe_spot_a_1 = Recipe(
        user_id=test_users["owner"].id,
        spot_id=test_spots["spot_a"].id,
        name="Recipe A1",
        bean_variety="Ethiopia",
        dose=15.0,
        dripper_type="V60",
        total_water=250.0,
    )
    recipe_spot_a_2 = Recipe(
        user_id=test_users["manager"].id,
        spot_id=test_spots["spot_a"].id,
        name="Recipe A2",
        bean_variety="Colombia",
        dose=18.0,
        dripper_type="Switch",
        total_water=300.0,
    )
    recipe_spot_b = Recipe(
        user_id=test_users["barista"].id,
        spot_id=test_spots["spot_b"].id,
        name="Recipe B1",
        bean_variety="Kenya",
        dose=20.0,
        dripper_type="V60",
        total_water=320.0,
    )
    recipe_personal = Recipe(
        user_id=test_users["personal"].id,
        name="Personal Recipe",
        bean_variety="Guatemala",
        dose=12.0,
        dripper_type="V60",
        total_water=200.0,
    )
    db_session.add_all([recipe_spot_a_1, recipe_spot_a_2, recipe_spot_b, recipe_personal])
    db_session.flush()
    return {
        "spot_a_1": recipe_spot_a_1,
        "spot_a_2": recipe_spot_a_2,
        "spot_b": recipe_spot_b,
        "personal": recipe_personal,
    }


# ═══════════════════════════════════════════════════════════════
# Mock auth middleware & aiohttp app
# ═══════════════════════════════════════════════════════════════

@web.middleware
async def mock_auth_middleware(request, handler):
    """Bypass Telegram HMAC verification.

    Вместо проверки подписи Telegram Init Data читает заголовок
    ``X-Test-User-Id`` и подставляет соответствующего пользователя
    из тестовой БД в ``request["current_user"]``.

    Без заголовка возвращает 401.
    """
    path = request.path
    if not path.startswith("/api/"):
        return await handler(request)
    if request.method == "OPTIONS":
        return await handler(request)

    test_user_id = request.headers.get("X-Test-User-Id")
    if not test_user_id:
        return web.json_response({"error": "Missing X-Test-User-Id header"}, status=401)

    session = request.app["test_db_session"]
    user = session.query(User).filter(User.id == int(test_user_id)).first()
    if not user:
        return web.json_response({"error": "Test user not found"}, status=401)

    request["current_user"] = user
    request["db_session"] = session
    return await handler(request)


@pytest.fixture
def app(test_engine, db_session):
    """Create aiohttp Application with mock auth and real API routes."""
    application = web.Application(middlewares=[mock_auth_middleware])
    setup_api_routes(application)
    application["test_db_session"] = db_session
    return application


@pytest.fixture
async def client(aiohttp_client, app):
    """Create aiohttp test client (from pytest-aiohttp)."""
    return await aiohttp_client(app)