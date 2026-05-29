"""
Точка входа Telegram-бота для записи рецептов кофе.
"""

import asyncio
import logging
import os
import signal

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiohttp import web
from dotenv import load_dotenv

from app.api import setup_api_routes
from app.auth import tg_auth_middleware
from app.bot.handlers import router

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Флаг для graceful shutdown
_shutdown = asyncio.Event()


async def handle_health(request: web.Request) -> web.Response:
    """Health check для Railway."""
    return web.Response(text="OK")


async def handle_frontend(request: web.Request) -> web.Response:
    """Отдать index.html фронтенда."""
    frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    frontend_dist = os.path.normpath(frontend_dist)
    index_path = os.path.join(frontend_dist, "index.html")
    if os.path.isfile(index_path):
        return web.FileResponse(index_path)
    return web.Response(text="Frontend not built", status=503)


@web.middleware
async def cors_middleware(request: web.Request, handler) -> web.Response:
    """Добавить CORS-заголовки для запросов из Mini App."""
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        response = await handler(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS, DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-TG-Init-Data"
    return response


async def run_health_server() -> None:
    """Запустить HTTP-сервер для health check, API и статики фронтенда."""
    port = int(os.getenv("PORT", 8080))
    app = web.Application(middlewares=[cors_middleware, tg_auth_middleware])

    # Health check
    app.router.add_get("/health", handle_health)

    # API
    setup_api_routes(app)

    # Static frontend (built React app)
    frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
    frontend_dist = os.path.normpath(frontend_dist)
    logger.info("Looking for frontend dist at: %s", frontend_dist)
    logger.info("os.path.isdir(%s) = %s", frontend_dist, os.path.isdir(frontend_dist))
    if os.path.isdir(frontend_dist):
        assets_path = os.path.join(frontend_dist, "assets")
        logger.info("Assets path: %s, isdir=%s", assets_path, os.path.isdir(assets_path))
        if os.path.isdir(assets_path):
            assets_files = os.listdir(assets_path)
            logger.info("Assets files: %s", assets_files)
        app.router.add_static("/assets/", path=os.path.join(frontend_dist, "assets"))
        app.router.add_get("/", handle_frontend)
        logger.info("Frontend static files served from %s", frontend_dist)
    else:
        logger.warning("Frontend dist not found at %s", frontend_dist)
        # Проверим, что есть в frontend/
        frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
        if os.path.isdir(frontend_dir):
            logger.info("Contents of frontend/: %s", os.listdir(frontend_dir))
        app.router.add_get("/", handle_health)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info("Health check server running on port %s", port)

    # Ждём сигнала на завершение
    await _shutdown.wait()

    # Graceful shutdown health check сервера
    await site.stop()
    await runner.cleanup()
    logger.info("Health check server stopped")


async def run_polling(bot: Bot, dp: Dispatcher) -> None:
    """Запустить polling с обработкой ошибок и перезапуском."""
    # Задержка при старте — даём старому контейнеру завершиться
    startup_delay = int(os.getenv("STARTUP_DELAY", "8"))
    logger.info("Waiting %d seconds before starting polling (rolling deploy delay)...", startup_delay)
    await asyncio.sleep(startup_delay)

    while not _shutdown.is_set():
        try:
            logger.info("Starting polling...")
            await dp.start_polling(bot)
        except Exception as e:
            if _shutdown.is_set():
                break
            logger.error("Polling error: %s. Restarting in 3 seconds...", e)
            await asyncio.sleep(3)

    logger.info("Polling stopped")


def handle_sigterm() -> None:
    """Обработчик SIGTERM — сигнал к graceful shutdown."""
    logger.info("Received SIGTERM signal, shutting down gracefully...")
    _shutdown.set()


async def main() -> None:
    if not BOT_TOKEN or BOT_TOKEN == "your_telegram_bot_token_here":
        logger.error(
            "BOT_TOKEN не задан! Укажи его в переменной окружения."
        )
        return

    # Регистрируем обработчик SIGTERM
    loop = asyncio.get_running_loop()
    loop.add_signal_handler(signal.SIGTERM, handle_sigterm)

    bot = Bot(
        token=BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML),
    )
    dp = Dispatcher()
    dp.include_router(router)

    logger.info("Бот запущен и готов к работе!")

    # Запускаем polling и health check параллельно
    await asyncio.gather(
        run_polling(bot, dp),
        run_health_server(),
    )

    logger.info("Shutdown complete")


if __name__ == "__main__":
    asyncio.run(main())