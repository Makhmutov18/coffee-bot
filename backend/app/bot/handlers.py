"""
Хендлеры команд Telegram-бота для записи рецептов кофе.
"""

import logging
import os

from aiogram import Router
from aiogram.filters import Command, CommandObject
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from app.database import User, UserRole, Spot, Company, user_spots, init_db

# URL Mini App (берётся из переменной окружения или Railway URL по умолчанию)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://web-production-66155.up.railway.app")

logger = logging.getLogger(__name__)

router = Router()
session = init_db()


# ──────────────────────────────────────────────
# Команда /start
# ──────────────────────────────────────────────

@router.message(Command("start"))
async def cmd_start(message: Message, command: CommandObject) -> None:
    telegram_id = str(message.from_user.id)
    name = message.from_user.first_name
    username = message.from_user.username

    # ── Deep linking: проверяем аргументы команды ──
    args = command.args or ""
    logger.info("ARGS RECEIVED: telegram_id=%s, args='%s'", telegram_id, args)
    if args and "join_spot_" in args:
        token = args.replace("join_spot_", "")
        logger.info("JOIN SPOT TOKEN EXTRACTED: token='%s'", token)
        await _handle_join_spot(message, telegram_id, name, username, token)
        return

    # ── Стандартный /start (регистрация + приветствие) ──
    session = init_db()
    try:
        existing = session.query(User).filter(User.telegram_id == telegram_id).first()
        if not existing:
            user = User(
                telegram_id=telegram_id,
                name=name,
                username=username,
                role=UserRole.personal.value,
            )
            session.add(user)
            session.commit()
            logger.info("New user registered: telegram_id=%s, name=%s", telegram_id, name)
    except Exception as e:
        session.rollback()
        logger.error("Error registering user: %s", e)
    finally:
        session.close()

    # Кнопка Mini App
    webapp_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(
                text="🚀 Открыть Mini App",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )],
        ]
    )
    await message.answer(
        "☕ <b>Coffee Recipe Bot</b>\n\n"
        "Я помогу тебе записывать рецепты заваривания альтернативного кофе "
        "и рассчитывать экстракцию по системе Golden Cup.\n\n"
        "Доступные команды:\n"
        "• /start — показать это сообщение\n"
        "• /help — список команд\n"
        "• /app — открыть Mini App",
        reply_markup=webapp_kb,
    )


async def _handle_join_spot(
    message: Message,
    telegram_id: str,
    name: str,
    username: str | None,
    token: str,
) -> None:
    """Обработать инвайт-ссылку: найти спот по токену и добавить пользователя как бариста."""
    session = init_db()
    try:
        # Ищем спот по токену
        spot = session.query(Spot).filter(Spot.invite_token == token).first()
        if not spot:
            await message.answer(
                "❌ <b>Недействительная ссылка</b>\n\n"
                "Инвайт-токен не найден. Возможно, ссылка устарела или была отозвана. "
                "Обратитесь к владельцу сети за новой ссылкой.",
            )
            return

        # Загружаем компанию спота
        company = session.query(Company).filter(Company.id == spot.company_id).first()
        company_name = company.name if company else "Неизвестная сеть"

        # Находим или создаём пользователя
        user = session.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            user = User(
                telegram_id=telegram_id,
                name=name,
                username=username,
                role=UserRole.personal.value,
            )
            session.add(user)
            session.flush()

        # Проверяем, есть ли уже связь с этим спотом
        already_attached = (
            session.query(user_spots)
            .filter(
                user_spots.c.user_id == user.id,
                user_spots.c.spot_id == spot.id,
            )
            .first()
        )

        # ── Owner / Manager: не меняем роль, но привязываем к споту, если связи нет ──
        if user.role in (UserRole.owner.value, UserRole.manager.value):
            if already_attached:
                await message.answer(
                    f"✅ <b>Вы уже привязаны к этой точке</b>\n\n"
                    f"Точка «{spot.name}» сети «{company_name}» уже доступна вам "
                    f"как <b>{dict(UserRole.__members__).get(user.role.upper(), user.role)}</b>.",
                )
                return

            # Привязываем к споту без смены роли
            conn = session.connection()
            conn.execute(
                user_spots.insert().values(user_id=user.id, spot_id=spot.id),
            )
            session.commit()
            await message.answer(
                f"🔗 <b>Доступ к точке расширен</b>\n\n"
                f"Вы добавлены на точку «{spot.name}» сети «{company_name}».\n\n"
                f"Ваша роль <b>{dict(UserRole.__members__).get(user.role.upper(), user.role)}</b> сохранена. "
                f"Откройте Brew Lab, и у вас автоматически появится доступ к коммерческим рецептам!",
            )
            return

        # ── Barista: если уже привязан — сообщаем ──
        if user.role == UserRole.barista.value and already_attached:
            await message.answer(
                f"✅ <b>Вы уже добавлены на эту точку</b>\n\n"
                f"Вы числитесь как <b>бариста</b> на точке "
                f"«{spot.name}» сети «{company_name}».\n\n"
                f"Откройте Brew Lab, и у вас автоматически появится доступ к коммерческим рецептам!",
            )
            return

        # ── Personal (или barista без связи): меняем роль на barista и привязываем ──
        if user.role == UserRole.personal.value:
            user.role = UserRole.barista.value

        # Добавляем запись в user_spots (если ещё нет)
        if not already_attached:
            conn = session.connection()
            conn.execute(
                user_spots.insert().values(user_id=user.id, spot_id=spot.id),
            )
        session.commit()

        await message.answer(
            f"🎉 <b>Успешно!</b>\n\n"
            f"Вы добавлены как <b>бариста</b> на точку "
            f"«{spot.name}» сети «{company_name}».\n\n"
            f"Откройте Brew Lab, и у вас автоматически появится доступ к коммерческим рецептам!",
        )

        # ── Уведомление владельца компании ──
        if company and company.owner_id:
            owner = session.query(User).filter(User.id == company.owner_id).first()
            if owner and owner.telegram_id:
                barista_display = name or username or telegram_id
                barista_username = f" (@{username})" if username else ""
                try:
                    await message.bot.send_message(
                        chat_id=owner.telegram_id,
                        text=(
                            f"🔔 <b>Новый бариста в сети «{company_name}»</b>\n\n"
                            f"На точку «{spot.name}» принят новый бариста: "
                            f"<b>{barista_display}</b>{barista_username}."
                        ),
                    )
                except Exception as e:
                    logger.warning("Failed to notify owner %s: %s", owner.telegram_id, e)

    except Exception as e:
        session.rollback()
        logger.exception("Error processing invite for token=%s: %s", token, e)
        await message.answer(
            "❌ <b>Ошибка при обработке приглашения</b>\n\n"
            "Пожалуйста, попробуйте ещё раз или обратитесь к владельцу сети.",
        )
    finally:
        session.close()


# ──────────────────────────────────────────────
# Команда /help
# ──────────────────────────────────────────────

@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "📖 <b>Справка</b>\n\n"
        "<b>Команды:</b>\n"
        "• /start — приветствие\n"
        "• /help — эта справка\n"
        "• /app — открыть Mini App с таймером и расчётами\n\n"
        "<b>Формула экстракции (Golden Cup):</b>\n"
        "<code>Ext (%) = (Вес напитка × TDS) / Вес зерна</code>\n\n"
        "Рекомендуемый диапазон: 18–22%",
    )


# ──────────────────────────────────────────────
# Команда /app — открыть Mini App
# ──────────────────────────────────────────────

@router.message(Command("app"))
async def cmd_app(message: Message) -> None:
    """Открыть Telegram Mini App."""
    webapp_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(
                text="🚀 Открыть Coffee Recipe Mini App",
                web_app=WebAppInfo(url=WEBAPP_URL),
            )],
        ]
    )
    await message.answer(
        "☕ <b>Coffee Recipe Mini App</b>\n\n"
        "Нажми кнопку ниже, чтобы открыть Mini App:\n\n"
        "• 📝 Создать рецепт\n"
        "• ⏱️ Таймер заваривания\n"
        "• 📊 Расчёт экстракции (Golden Cup)",
        reply_markup=webapp_kb,
    )