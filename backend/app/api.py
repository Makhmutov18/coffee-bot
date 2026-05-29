"""
API-эндпоинты для Telegram Mini App.
"""

import json
import logging

from aiohttp import web

from app.database import init_db, Recipe, Measurement, Spot, UserRole, calculate_extraction
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
    elif user.role == UserRole.barista.value:
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

        # Если роль personal или spot_id не передан — личный рецепт
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
            # Коммерческий рецепт — привязан к споту
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
    recipe_id = request.match_info.get("id")
    session = init_db()
    try:
        r = session.query(Recipe).filter(Recipe.id == int(recipe_id)).first()
        if not r:
            return web.json_response({"error": "Рецепт не найден"}, status=404)

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
    app.router.add_get("/api/user/spots", handle_list_user_spots)
    app.router.add_post("/api/recipes", handle_save_recipe)
    app.router.add_get("/api/recipes", handle_list_recipes)
    app.router.add_get("/api/recipes/{id}", handle_get_recipe)
    app.router.add_delete("/api/recipes/{id}", handle_delete_recipe)
    app.router.add_post("/api/calculate", handle_calculate)
    logger.info(
        "API routes registered: GET /api/user/spots, "
        "POST/GET /api/recipes, GET/DELETE /api/recipes/{id}, POST /api/calculate"
    )