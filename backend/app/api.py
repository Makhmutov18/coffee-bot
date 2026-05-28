"""
API-эндпоинты для Telegram Mini App.
"""

import json
import logging

from aiohttp import web

from app.database import init_db, Recipe, Measurement, calculate_extraction

logger = logging.getLogger(__name__)


async def handle_save_recipe(request: web.Request) -> web.Response:
    """Сохранить рецепт и замер из Mini App."""
    try:
        data = await request.json()
    except json.JSONDecodeError:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    session = init_db()

    try:
        recipe = Recipe(
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


def setup_api_routes(app: web.Application) -> None:
    """Подключить API-маршруты к aiohttp приложению."""
    app.router.add_post("/api/recipes", handle_save_recipe)
    app.router.add_post("/api/calculate", handle_calculate)
    logger.info("API routes registered: POST /api/recipes, POST /api/calculate")