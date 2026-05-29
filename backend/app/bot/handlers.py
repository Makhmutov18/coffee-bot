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
    s = init_db()
    try:
        existing = s.query(User).filter(User.telegram_id == telegram_id).first()
        if not existing:
            user = User(
                telegram_id=telegram_id,
                name=name,
                username=username,
                role=UserRole.personal.value,
            )
            s.add(user)
            s.commit()
            logger.info("New user registered: telegram_id=%s, name=%s", telegram_id, name)
    except Exception as e:
        s.rollback()
        logger.error("Error registering user: %s", e)
    finally:
        s.close()

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
        "☕ <b>Добро пожаловать в Brew Lab!</b>\n\n"
        "Вы открыли цифровую лабораторию для контроля заваривания кофе. "
        "Больше никаких блокнотов и разрозненных чатов — все ваши рецепты "
        "и техкарты теперь в одном месте.\n\n"
        "⚡ <b>Возможности Brew Lab:</b>\n"
        "• ⏱️ Запуск таймера заваривания в один тап по экрану.\n"
        "• 📊 Автоматический расчёт экстракции по системе Golden Cup.\n"
        "• 🗂️ Личный банк рецептов: сохраняйте сорта, профили помола, "
        "температуру и вливания (идеально для гиков кофе и участников "
        "чемпионатов!).\n"
        "• 📍 Коммерческий режим: переключение между точками вашей сети, "
        "управление бариста и единые техкарты для шефов.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение в удобном "
        "мобильном формате.",
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
    s = init_db()
    try:
        # Ищем спот по токену
        spot = s.query(Spot).filter(Spot.invite_token == token).first()
        if not spot:
            await message.answer(
                "❌ <b>Недействительная ссылка</b>\n\n"
                "Инвайт-токен не найден. Возможно, ссылка устарела или была отозвана. "
                "Обратитесь к владельцу сети за новой ссылкой.",
            )
            return

        # Загружаем компанию спота
        company = s.query(Company).filter(Company.id == spot.company_id).first()
        company_name = company.name if company else "Неизвестная сеть"

        # Находим или создаём пользователя
        user = s.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            user = User(
                telegram_id=telegram_id,
                name=name,
                username=username,
                role=UserRole.personal.value,
            )
            s.add(user)
            s.flush()

        # Проверяем, есть ли уже связь с этим спотом
        already_attached = (
            s.query(user_spots)
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
            conn = s.connection()
            conn.execute(
                user_spots.insert().values(user_id=user.id, spot_id=spot.id),
            )
            s.commit()
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
            conn = s.connection()
            conn.execute(
                user_spots.insert().values(user_id=user.id, spot_id=spot.id),
            )
        s.commit()

        await message.answer(
            f"🎉 <b>Успешно!</b>\n\n"
            f"Вы добавлены как <b>бариста</b> на точку "
            f"«{spot.name}» сети «{company_name}».\n\n"
            f"Откройте Brew Lab, и у вас автоматически появится доступ к коммерческим рецептам!",
        )

        # ── Уведомление владельца компании ──
        if company and company.owner_id:
            owner = s.query(User).filter(User.id == company.owner_id).first()
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
        s.rollback()
        logger.exception("Error processing invite for token=%s: %s", token, e)
        await message.answer(
            "❌ <b>Ошибка при обработке приглашения</b>\n\n"
            "Пожалуйста, попробуйте ещё раз или обратитесь к владельцу сети.",
        )
    finally:
        s.close()


# ──────────────────────────────────────────────
# Команда /help
# ──────────────────────────────────────────────

@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "📖 <b>Справка Brew Lab</b>\n\n"
        "<b>Команды:</b>\n"
        "• /start — приветствие и регистрация\n"
        "• /help — эта справка\n"
        "• /app — открыть Mini App с таймером и расчётами\n"
        "• /set_role — сменить роль (для отладки)\n\n"
        "<b>Формула экстракции (Golden Cup):</b>\n"
        "<code>Ext (%) = (Вес напитка × TDS) / Вес зерна</code>\n\n"
        "Рекомендуемый диапазон: 18–22%\n\n"
        "<b>Роли:</b>\n"
        "• <b>personal</b> — домашний пользователь (личные рецепты)\n"
        "• <b>personal_premium</b> — домашний пользователь с расширенными возможностями\n"
        "• <b>barista</b> — бариста на точке (только чтение рецептов)\n"
        "• <b>manager</b> — старший бариста (управление своими спотами)\n"
        "• <b>owner</b> — владелец сети (полный доступ)\n\n"
        "🔗 <b>Инвайт-ссылки:</b>\n"
        "Владелец сети может сгенерировать инвайт-ссылку в админ-панели Mini App. "
        "Перейдя по ней, бариста автоматически привязывается к точке.",
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
        "• 📊 Расчёт экстракции (Golden Cup)\n"
        "• 🔄 Конвертация кофемолок",
        reply_markup=webapp_kb,
    )


# ──────────────────────────────────────────────
# Команда /set_role — смена роли (отладка)
# ──────────────────────────────────────────────

@router.message(Command("set_role"))
async def cmd_set_role(message: Message, command: CommandObject) -> None:
    """Сменить роль пользователя в БД (для отладки)."""
    telegram_id = str(message.from_user.id)
    args = (command.args or "").strip().lower()

    if not args:
        await message.answer(
            "❌ <b>Укажите роль</b>\n\n"
            "Пример: <code>/set_role personal</code>\n\n"
            "Доступные роли:\n"
            "• <code>personal</code> — домашний пользователь\n"
            "• <code>personal_premium</code> — домашний с расширенными возможностями\n"
            "• <code>barista</code> — бариста\n"
            "• <code>manager</code> — старший бариста\n"
            "• <code>owner</code> — владелец сети",
        )
        return

    # Валидация роли
    valid_roles = {e.value for e in UserRole}
    if args not in valid_roles:
        await message.answer(
            f"❌ <b>Неизвестная роль «{args}»</b>\n\n"
            f"Доступные роли: {', '.join(sorted(valid_roles))}",
        )
        return

    s = init_db()
    try:
        user = s.query(User).filter(User.telegram_id == telegram_id).first()
        if not user:
            await message.answer(
                "❌ <b>Пользователь не найден</b>\n\n"
                "Сначала введите /start для регистрации.",
            )
            return

        old_role = user.role
        user.role = args
        s.commit()

        await message.answer(
            f"✅ <b>Роль изменена</b>\n\n"
            f"<code>{old_role}</code> → <code>{args}</code>\n\n"
            f"Откройте Mini App, чтобы увидеть изменения.",
        )
        logger.info(
            "Role changed: telegram_id=%s, %s -> %s",
            telegram_id, old_role, args,
        )
    except Exception as e:
        s.rollback()
        logger.error("Error changing role: %s", e)
        await message.answer("❌ <b>Ошибка при смене роли</b>")
    finally:
        s.close()