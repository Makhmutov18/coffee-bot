"""
API-эндпоинты для Telegram Mini App.
"""

import json
import logging
import secrets

from aiohttp import web

from app.database import (
    init_db, Recipe, Measurement, Spot, Company, UserRole, User,
    user_spots, calculate_extraction,
)
from app.auth import get_current_user

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Вспомогательные функции
# ──────────────────────────────────────────────

def _serialize_recipe(r):
    """Сериализовать рецепт в dict для JSON-ответа."""
    last_measurement = None
    if r.measurements:
        m = r.measurements[-1]
        last_measurement = {
            "beverageWeight": m.beverage_weight,
            "tds": m.tds,
            "extraction": m.extraction,
        }
    return {
        "id": r.id,
        "createdAt": r.created_at.isoformat() if r.created_at else None,
        "name": r.name,
        "roaster": r.roaster,
        "beanVariety": r.bean_variety,
        "beanProcessing": r.bean_processing,
        "dose": r.dose,
        "dripperType": r.dripper_type,
        "grinderModel": r.grinder_model,
        "grindSetting": r.grind_setting,
        "totalWater": r.total_water,
        "waterTemp": r.water_temp,
        "waterTds": r.water_tds,
        "brewTime": r.brew_time,
        "pourSteps": r.pour_steps,
        "tastingNotes": r.tasting_notes,
        "lastMeasurement": last_measurement,
        "spotId": r.spot_id,
    }


def _check_spot_write_permission(user, spot_id, session):
    """
    Проверить, может ли пользователь создавать/изменять/удалять
    рецепты в указанном споте.

    Возвращает True, если:
    - user.role == 'owner' (шеф-бариста может всё)
    - user.role == 'manager' И пользователь привязан к spot_id через user_spots

    Возвращает False для barista и personal.
    """
    if user.role == UserRole.owner.value:
        return True

    if user.role == UserRole.manager.value:
        # Проверяем, есть ли запись в user_spots для этого пользователя и спота
        exists = (
            session.query(user_spots)
            .filter(
                user_spots.c.user_id == user.id,
                user_spots.c.spot_id == spot_id,
            )
            .first()
        )
        return exists is not None

    return False




# ──────────────────────────────────────────────
# GET /api/user/me — информация о текущем пользователе
# ──────────────────────────────────────────────

async def handle_get_current_user(request: web.Request) -> web.Response:
    """Вернуть информацию о текущем пользователе (роль, имя, username)."""
    user = await get_current_user(request)
    return web.json_response({
        "id": user.id,
        "telegramId": user.telegram_id,
        "name": user.name,
        "username": user.username,
        "role": user.role,
    })


# ──────────────────────────────────────────────
# GET /api/user/spots — список доступных точек
# ──────────────────────────────────────────────

async def handle_list_user_spots(request: web.Request) -> web.Response:
    """Вернуть список кофейных точек, доступных current_user."""
    user = await get_current_user(request)

    if user.role == UserRole.personal.value:
        return web.json_response([])

    if user.role == UserRole.owner.value and user.company:
        spots = user.company.spots
    elif user.role in (UserRole.barista.value, UserRole.manager.value):
        spots = user.accessible_spots
    else:
        spots = []

    result = [
        {
            "id": s.id,
            "name": s.name,
            "address": s.address,
            "waterPpm": s.water_ppm,
            "grinderModel": s.grinder_model,
            "companyId": s.company_id,
        }
        for s in spots
    ]
    return web.json_response(result)


# ──────────────────────────────────────────────
# POST /api/spots — создать новую точку (только owner)
# ──────────────────────────────────────────────

async def handle_create_spot(request: web.Request) -> web.Response:
    """Создать новую кофейную точку. Только для владельца (owner)."""
    user = await get_current_user(request)

    if user.role != UserRole.owner.value:
        return web.json_response(
            {"error": "Только владелец сети может создавать точки"},
            status=403,
        )

    if not user.company:
        return web.json_response(
            {"error": "У вас нет компании. Сначала создайте компанию."},
            status=400,
        )

    try:
        data = await request.json()
    except json.JSONDecodeError:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    session = init_db()
    try:
        spot = Spot(
            company_id=user.company.id,
            name=data.get("name", ""),
            address=data.get("address"),
            water_ppm=data.get("waterPpm", 70),
            grinder_model=data.get("grinderModel"),
        )
        session.add(spot)
        session.commit()

        return web.json_response({
            "id": spot.id,
            "name": spot.name,
            "address": spot.address,
            "waterPpm": spot.water_ppm,
            "grinderModel": spot.grinder_model,
            "companyId": spot.company_id,
            "message": "Точка создана!",
        }, status=201)
    except Exception as e:
        session.rollback()
        logger.error("Error creating spot: %s", e)
        return web.json_response({"error": str(e)}, status=500)
    finally:
        session.close()


# ──────────────────────────────────────────────
# POST /api/spots/{id}/invite — сгенерировать инвайт-ссылку (только owner)
# ──────────────────────────────────────────────

async def handle_generate_invite(request: web.Request) -> web.Response:
    """Сгенерировать инвайт-токен для добавления бариста/менеджера на точку.
    Только для владельца (owner)."""
    user = await get_current_user(request)

    if user.role != UserRole.owner.value:
        return web.json_response(
            {"error": "Только владелец сети может генерировать инвайты"},
            status=403,
        )

    spot_id = request.match_info.get("id")
    session = init_db()
    try:
        spot = session.query(Spot).filter(Spot.id == int(spot_id)).first()
        if not spot:
            return web.json_response({"error": "Точка не найдена"}, status=404)

        # Проверяем, что спот принадлежит компании владельца
        if not user.company or spot.company_id != user.company.id:
            return web.json_response(
                {"error": "Эта точка не принадлежит вашей компании"},
                status=403,
            )

        # Генерируем уникальный токен
        token = secrets.token_urlsafe(32)

        # Сохраняем токен (можно в отдельную таблицу или в поле Spot)
        # Пока сохраняем в простом поле — расширим при необходимости
        spot.invite_token = token
        session.commit()

        invite_link = f"https://t.me/{(await get_bot_username())}?start=join_spot_{token}"

        return web.json_response({
            "token": token,
            "inviteLink": invite_link,
            "spotId": spot.id,
            "spotName": spot.name,
        })
    except Exception as e:
        session.rollback()
        logger.error("Error generating invite: %s", e)
        return web.json_response({"error": str(e)}, status=500)
    finally:
        session.close()


async def get_bot_username():
    """Вернуть username бота для формирования инвайт-ссылки."""
    # Можно вынести в конфиг или переменную окружения
    import os
    return os.getenv("BOT_USERNAME", "your_bot_username")


# ──────────────────────────────────────────────
# POST /api/recipes — сохранить рецепт
# ──────────────────────────────────────────────

async def handle_save_recipe(request: web.Request) -> web.Response:
    """Сохранить рецепт и замер из Mini App."""
    user = await get_current_user(request)

    try:
        data = await request.json()
    except json.JSONDecodeError:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    session = init_db()

    try:
        spot_id = data.get("spotId")

        # ── Личный рецепт (personal или без spotId) ──
        if user.role == UserRole.personal.value or not spot_id:
            recipe = Recipe(
                user_id=user.id,
                name=data.get("name"),
                roaster=data.get("roaster"),
                bean_variety=data.get("beanVariety", ""),
                bean_processing=data.get("beanProcessing"),
                dose=float(data.get("dose", 0)),
                dripper_type=data.get("dripperType", "V60"),
                grinder_model=data.get("grinderModel"),
                grind_setting=data.get("grindSetting"),
                total_water=float(data.get("totalWater", 0)),
                water_temp=float(data["waterTemp"]) if data.get("waterTemp") else None,
                water_tds=float(data["waterTds"]) if data.get("waterTds") else None,
                pour_steps=data.get("pourSteps", []),
                tasting_notes=data.get("tastingNotes"),
                brew_time=data.get("brewTime"),
            )
        else:
            # ── Коммерческий рецепт — проверяем права на запись ──
            if not _check_spot_write_permission(user, int(spot_id), session):
                return web.json_response(
                    {"error": "У вас нет прав на создание рецептов для этой точки"},
                    status=403,
                )

            recipe = Recipe(
                user_id=user.id,
                spot_id=spot_id,
                name=data.get("name"),
                roaster=data.get("roaster"),
                bean_variety=data.get("beanVariety", ""),
                bean_processing=data.get("beanProcessing"),
                dose=float(data.get("dose", 0)),
                dripper_type=data.get("dripperType", "V60"),
                grinder_model=data.get("grinderModel"),
                grind_setting=data.get("grindSetting"),
                total_water=float(data.get("totalWater", 0)),
                water_temp=float(data["waterTemp"]) if data.get("waterTemp") else None,
                water_tds=float(data["waterTds"]) if data.get("waterTds") else None,
                pour_steps=data.get("pourSteps", []),
                tasting_notes=data.get("tastingNotes"),
                brew_time=data.get("brewTime"),
            )

        session.add(recipe)
        session.flush()

        # Create measurement if provided
        beverage_weight = data.get("beverageWeight")
        tds = data.get("tds")
        extraction = data.get("extraction")

        if beverage_weight and tds is not None:
            measurement = Measurement(
                recipe_id=recipe.id,
                beverage_weight=float(beverage_weight),
                tds=float(tds),
                extraction=float(extraction) if extraction else 0,
            )
            session.add(measurement)

        session.commit()

        return web.json_response({
            "id": recipe.id,
            "message": "Рецепт сохранён!",
        }, status=201)

    except Exception as e:
        session.rollback()
        logger.error("Error saving recipe: %s", e)
        return web.json_response({"error": str(e)}, status=500)
    finally:
        session.close()


# ──────────────────────────────────────────────
# GET /api/recipes — список рецептов
# ──────────────────────────────────────────────

async def handle_list_recipes(request: web.Request) -> web.Response:
    """Получить список рецептов (личных или по споту)."""
    user = await get_current_user(request)
    spot_id = request.query.get("spotId")

    session = init_db()
    try:
        query = session.query(Recipe)

        # Если роль personal или spot_id не передан — личные рецепты
        if user.role == UserRole.personal.value or not spot_id:
            query = query.filter(Recipe.user_id == user.id)
        else:
            # Коммерческие рецепты по споту
            # barista может только читать — это разрешено
            query = query.filter(Recipe.spot_id == int(spot_id))

        recipes = query.order_by(Recipe.created_at.desc()).all()
        result = [_serialize_recipe(r) for r in recipes]
        return web.json_response(result)
    except Exception as e:
        logger.error("Error listing recipes: %s", e)
        return web.json_response({"error": str(e)}, status=500)
    finally:
        session.close()


# ──────────────────────────────────────────────
# GET /api/recipes/{id} — детали рецепта
# ──────────────────────────────────────────────

async def handle_get_recipe(request: web.Request) -> web.Response:
    """Получить рецепт по ID."""
    recipe_id = request.match_info.get("id")
    session = init_db()
    try:
        r = session.query(Recipe).filter(Recipe.id == int(recipe_id)).first()
        if not r:
            return web.json_response({"error": "Рецепт не найден"}, status=404)

        measurements = []
        for m in r.measurements:
            measurements.append({
                "id": m.id,
                "beverageWeight": m.beverage_weight,
                "tds": m.tds,
                "extraction": m.extraction,
            })

        return web.json_response({
            "id": r.id,
            "createdAt": r.created_at.isoformat() if r.created_at else None,
            "name": r.name,
            "roaster": r.roaster,
            "beanVariety": r.bean_variety,
            "beanProcessing": r.bean_processing,
            "dose": r.dose,
            "dripperType": r.dripper_type,
            "grinderModel": r.grinder_model,
            "grindSetting": r.grind_setting,
            "totalWater": r.total_water,
            "waterTemp": r.water_temp,
            "waterTds": r.water_tds,
            "brewTime": r.brew_time,
            "pourSteps": r.pour_steps,
            "tastingNotes": r.tasting_notes,
            "measurements": measurements,
            "spotId": r.spot_id,
        })
    except Exception as e:
        logger.error("Error getting recipe: %s", e)
        return web.json_response({"error": str(e)}, status=500)
    finally:
        session.close()


# ──────────────────────────────────────────────
# DELETE /api/recipes/{id} — удалить рецепт
# ──────────────────────────────────────────────

async def handle_delete_recipe(request: web.Request) -> web.Response:
    """Удалить рецепт по ID."""
    user = await get_current_user(request)
    recipe_id = request.match_info.get("id")

    session = init_db()
    try:
        r = session.query(Recipe).filter(Recipe.id == int(recipe_id)).first()
        if not r:
            return web.json_response({"error": "Рецепт не найден"}, status=404)

        # ── Личный рецепт ──
        if not r.spot_id:
            # Только владелец рецепта может его удалить
            if r.user_id != user.id:
                return web.json_response(
                    {"error": "Вы не можете удалить чужой рецепт"},
                    status=403,
                )
        else:
            # ── Коммерческий рецепт — проверяем права на запись ──
            if not _check_spot_write_permission(user, r.spot_id, session):
                return web.json_response(
                    {"error": "У вас нет прав на удаление рецептов этой точки"},
                    status=403,
                )

        session.delete(r)
        session.commit()

        return web.json_response({"message": "Рецепт удалён"})
    except Exception as e:
        session.rollback()
        logger.error("Error deleting recipe: %s", e)
        return web.json_response({"error": str(e)}, status=500)
    finally:
        session.close()


# ──────────────────────────────────────────────
# POST /api/calculate — расчёт экстракции
# ──────────────────────────────────────────────

async def handle_calculate(request: web.Request) -> web.Response:
    """Рассчитать экстракцию по формуле Golden Cup."""
    try:
        data = await request.json()
    except json.JSONDecodeError:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    try:
        beverage_weight = float(data.get("beverageWeight", 0))
        tds_percent = float(data.get("tds", 0))
        dose = float(data.get("dose", 0))

        extraction = calculate_extraction(beverage_weight, tds_percent, dose)

        return web.json_response({
            "extraction": extraction,
            "formula": "(Вес напитка × TDS) / Доза",
        })
    except ValueError as e:
        return web.json_response({"error": str(e)}, status=400)
    except Exception as e:
        logger.error("Error calculating extraction: %s", e)
        return web.json_response({"error": str(e)}, status=500)


# ──────────────────────────────────────────────
# Регистрация маршрутов
# ──────────────────────────────────────────────

def setup_api_routes(app: web.Application) -> None:
    """Подключить API-маршруты к aiohttp приложению."""
    app.router.add_get("/api/user/me", handle_get_current_user)
    app.router.add_get("/api/user/spots", handle_list_user_spots)
    app.router.add_post("/api/spots", handle_create_spot)
    app.router.add_post("/api/spots/{id}/invite", handle_generate_invite)
    app.router.add_post("/api/recipes", handle_save_recipe)
    app.router.add_get("/api/recipes", handle_list_recipes)
    app.router.add_get("/api/recipes/{id}", handle_get_recipe)
    app.router.add_delete("/api/recipes/{id}", handle_delete_recipe)
    app.router.add_post("/api/calculate", handle_calculate)
    logger.info(
        "API routes registered: "
        "GET /api/user/me, GET /api/user/spots, "
        "POST /api/spots, POST /api/spots/{id}/invite, "
        "POST/GET /api/recipes, GET/DELETE /api/recipes/{id}, "
        "POST /api/calculate"
    )