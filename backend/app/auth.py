"""
Telegram Mini App аутентификация для aiohttp.

Валидация X-TG-Init-Data по HMAC-SHA256 подписи Telegram.
Извлекает telegram_id, находит/создаёт пользователя в БД.
"""

import hashlib
import hmac
import json
import logging
import os
from urllib.parse import parse_qs, unquote

from aiohttp import web

from app.database import init_db, User, UserRole

logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("BOT_TOKEN", "")


def _verify_telegram_init_data(init_data: str) -> dict | None:
    """
    Проверить подпись Telegram Init Data и вернуть распарсенные данные.

    Алгоритм:
      1. Парсим query string в dict.
      2. Извлекаем поле 'hash'.
      3. Сортируем остальные поля по ключу.
      4. Формируем строку для проверки: key=value\\nkey=value...
      5. Создаём secret_key = HMAC-SHA256(bot_token, "WebAppData").
      6. Создаём signature = HMAC-SHA256(secret_key, data_check_string).
      7. Сравниваем signature с hash (constant-time).

    Возвращает dict с данными пользователя или None при ошибке.
    """
    if not init_data:
        return None

    parsed = parse_qs(init_data, keep_blank_values=True)
    # parse_qs возвращает списки значений, берём первое
    data = {k: v[0] for k, v in parsed.items()}

    received_hash = data.pop("hash", None)
    if not received_hash:
        logger.warning("X-TG-Init-Data: hash not found")
        return None

    # Сортируем ключи и формируем data_check_string
    sorted_keys = sorted(data.keys())
    data_check_parts = []
    for key in sorted_keys:
        value = data[key]
        # Telegram URL-decodes values
        decoded = unquote(value)
        data_check_parts.append(f"{key}={decoded}")
    data_check_string = "\n".join(data_check_parts)

    # Создаём secret_key из BOT_TOKEN
    secret_key = hmac.new(
        key=b"WebAppData",
        msg=BOT_TOKEN.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).digest()

    # Вычисляем ожидаемую подпись
    expected_hash = hmac.new(
        key=secret_key,
        msg=data_check_string.encode("utf-8"),
        digestmod=hashlib.sha256,
    ).hexdigest()

    # Constant-time сравнение
    if not hmac.compare_digest(expected_hash, received_hash):
        logger.warning("X-TG-Init-Data: invalid signature")
        return None

    # Парсим поле user (это JSON-строка)
    user_str = data.get("user")
    if user_str:
        try:
            data["user"] = json.loads(unquote(user_str))
        except (json.JSONDecodeError, TypeError):
            logger.warning("X-TG-Init-Data: failed to parse user JSON")
            return None

    return data


async def get_current_user(request: web.Request) -> User:
    """
    Извлечь и вернуть текущего пользователя из запроса.

    Вызывается из эндпоинтов: request['current_user'].
    Если пользователь не аутентифицирован — выбрасывает 401.
    """
    user = request.get("current_user")
    if user is None:
        raise web.HTTPUnauthorized(reason="Not authenticated")
    return user


@web.middleware
async def tg_auth_middleware(request: web.Request, handler) -> web.Response:
    """
    Middleware для проверки X-TG-Init-Data и подстановки current_user.

    Пропускает запросы, не начинающиеся с /api/ (статику, health).
    Для /api/* проверяет заголовок X-TG-Init-Data.
    """
    path = request.path

    # Пропускаем не-API запросы
    if not path.startswith("/api/"):
        return await handler(request)

    # OPTIONS (CORS preflight) пропускаем
    if request.method == "OPTIONS":
        return await handler(request)

    init_data = request.headers.get("X-TG-Init-Data")
    if not init_data:
        logger.warning("Missing X-TG-Init-Data header for %s", path)
        return web.json_response(
            {"error": "Missing X-TG-Init-Data header"},
            status=401,
        )

    # Валидируем подпись
    tg_data = _verify_telegram_init_data(init_data)
    if tg_data is None:
        return web.json_response(
            {"error": "Invalid Telegram authentication"},
            status=401,
        )

    # Извлекаем telegram_id
    user_info = tg_data.get("user", {})
    telegram_id = str(user_info.get("id", tg_data.get("id")))
    if not telegram_id:
        return web.json_response(
            {"error": "Cannot extract user ID from init data"},
            status=401,
        )

    # Находим или создаём пользователя в БД
    session = init_db()
    try:
        user = session.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            name = user_info.get("first_name", "")
            username = user_info.get("username")
            user = User(
                telegram_id=telegram_id,
                name=name,
                username=username,
                role=UserRole.personal.value,
            )
            session.add(user)
            session.commit()
            logger.info("Auth: auto-created user telegram_id=%s", telegram_id)

        # Кладём пользователя в request
        request["current_user"] = user
        request["db_session"] = session

        response = await handler(request)

        return response
    except Exception as e:
        session.rollback()
        logger.error("Auth middleware error: %s", e)
        return web.json_response(
            {"error": "Internal authentication error"},
            status=500,
        )
    finally:
        session.close()