"""
Хендлеры команд Telegram-бота для записи рецептов кофе.
"""

import os

from aiogram import Router, F
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    Message,
    ReplyKeyboardMarkup,
    KeyboardButton,
    ReplyKeyboardRemove,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
)

from app.database import Recipe, Measurement, User, UserRole, Spot, Company, user_spots, calculate_extraction, init_db

# URL Mini App (берётся из переменной окружения или Railway URL по умолчанию)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://web-production-66155.up.railway.app")

router = Router()
session = init_db()


# ──────────────────────────────────────────────
# FSM — состояния для добавления рецепта
# ──────────────────────────────────────────────

class AddRecipe(StatesGroup):
    bean_variety = State()
    bean_processing = State()
    dose = State()
    dripper_type = State()
    grinder_model = State()
    grind_setting = State()
    total_water = State()
    water_temp = State()
    water_tds = State()
    pour_steps = State()
    beverage_weight = State()
    tds = State()


# ──────────────────────────────────────────────
# Клавиатуры
# ──────────────────────────────────────────────

dripper_kb = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="V60"), KeyboardButton(text="Hario Switch")],
    ],
    resize_keyboard=True,
    one_time_keyboard=True,
)

processing_kb = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="Washed / Мытая")],
        [KeyboardButton(text="Natural / Натуральная")],
        [KeyboardButton(text="Honey / Хани")],
        [KeyboardButton(text="Anaerobic / Анэробная")],
        [KeyboardButton(text="Другое")],
    ],
    resize_keyboard=True,
    one_time_keyboard=True,
)

yes_no_kb = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="Да"), KeyboardButton(text="Нет")],
    ],
    resize_keyboard=True,
    one_time_keyboard=True,
)


# ──────────────────────────────────────────────
# Команда /start
# ──────────────────────────────────────────────

@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    telegram_id = str(message.from_user.id)
    name = message.from_user.first_name
    username = message.from_user.username

    # ── Deep linking: проверяем аргументы команды ──
    args = message.get_args()
    if args:
        # Ожидаем формат: join_spot_<token>
        if args.startswith("join_spot_"):
            token = args[len("join_spot_"):]
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
        "• /app — открыть Mini App\n"
        "• /add_recipe — добавить новый рецепт\n"
        "• /recipes — список последних рецептов\n"
        "• /cancel — отменить текущее действие",
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

    except Exception as e:
        session.rollback()
        logger.error("Error processing invite: %s", e)
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
        "• /app — открыть Mini App с таймером и расчётами\n"
        "• /add_recipe — добавить новый рецепт (пошагово)\n"
        "• /recipes — показать последние 5 рецептов\n"
        "• /cancel — отменить добавление рецепта\n\n"
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


# ──────────────────────────────────────────────
# Команда /cancel
# ──────────────────────────────────────────────

@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    current_state = await state.get_state()
    if current_state is None:
        await message.answer("Нет активного действия для отмены.")
        return
    await state.clear()
    await message.answer(
        "❌ Добавление рецепта отменено.",
        reply_markup=ReplyKeyboardRemove(),
    )


# ──────────────────────────────────────────────
# Команда /add_recipe — начало FSM
# ──────────────────────────────────────────────

@router.message(Command("add_recipe"))
async def cmd_add_recipe(message: Message, state: FSMContext) -> None:
    await state.set_state(AddRecipe.bean_variety)
    await message.answer(
        "☕ <b>Добавление нового рецепта</b>\n\n"
        "Шаг 1/12: Введи <b>сорт зерна</b> (например: Ethiopia Yirgacheffe, Colombia Supremo).",
    )


@router.message(AddRecipe.bean_variety)
async def add_bean_variety(message: Message, state: FSMContext) -> None:
    await state.update_data(bean_variety=message.text.strip())
    await state.set_state(AddRecipe.bean_processing)
    await message.answer(
        "Шаг 2/12: Выбери <b>обработку</b> зерна:",
        reply_markup=processing_kb,
    )


@router.message(AddRecipe.bean_processing)
async def add_bean_processing(message: Message, state: FSMContext) -> None:
    await state.update_data(bean_processing=message.text.strip())
    await state.set_state(AddRecipe.dose)
    await message.answer(
        "Шаг 3/12: Введи <b>вес сухого зерна</b> в граммах (например: 15).",
        reply_markup=ReplyKeyboardRemove(),
    )


@router.message(AddRecipe.dose)
async def add_dose(message: Message, state: FSMContext) -> None:
    try:
        dose = float(message.text.strip().replace(",", "."))
        if dose <= 0:
            raise ValueError
    except ValueError:
        await message.answer("❌ Пожалуйста, введи число больше 0 (например: 15).")
        return
    await state.update_data(dose=dose)
    await state.set_state(AddRecipe.dripper_type)
    await message.answer(
        "Шаг 4/12: Выбери <b>тип воронки</b>:",
        reply_markup=dripper_kb,
    )


@router.message(AddRecipe.dripper_type)
async def add_dripper_type(message: Message, state: FSMContext) -> None:
    if message.text.strip() not in ("V60", "Hario Switch"):
        await message.answer("❌ Пожалуйста, выбери V60 или Hario Switch на клавиатуре.")
        return
    await state.update_data(dripper_type=message.text.strip())
    await state.set_state(AddRecipe.grinder_model)
    await message.answer(
        "Шаг 5/12: Введи <b>модель кофемолки</b> (например: Comandante C40, или отправь «-» если не знаешь).",
        reply_markup=ReplyKeyboardRemove(),
    )


@router.message(AddRecipe.grinder_model)
async def add_grinder_model(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    await state.update_data(grinder_model=None if val == "-" else val)
    await state.set_state(AddRecipe.grind_setting)
    await message.answer(
        "Шаг 6/12: Введи <b>клик / номер помола</b> (например: 22 clicks, или отправь «-»).",
    )


@router.message(AddRecipe.grind_setting)
async def add_grind_setting(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    await state.update_data(grind_setting=None if val == "-" else val)
    await state.set_state(AddRecipe.total_water)
    await message.answer(
        "Шаг 7/12: Введи <b>общий объём воды</b> в мл (например: 250).",
    )


@router.message(AddRecipe.total_water)
async def add_total_water(message: Message, state: FSMContext) -> None:
    try:
        water = float(message.text.strip().replace(",", "."))
        if water <= 0:
            raise ValueError
    except ValueError:
        await message.answer("❌ Пожалуйста, введи число больше 0 (например: 250).")
        return
    await state.update_data(total_water=water)
    await state.set_state(AddRecipe.water_temp)
    await message.answer(
        "Шаг 8/12: Введи <b>температуру воды</b> в °C (например: 92, или отправь «-»).",
    )


@router.message(AddRecipe.water_temp)
async def add_water_temp(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    if val == "-":
        await state.update_data(water_temp=None)
    else:
        try:
            await state.update_data(water_temp=float(val.replace(",", ".")))
        except ValueError:
            await message.answer("❌ Введи число или «-».")
            return
    await state.set_state(AddRecipe.water_tds)
    await message.answer(
        "Шаг 9/12: Введи <b>минерализацию воды</b> в ppm (например: 50, или отправь «-»).",
    )


@router.message(AddRecipe.water_tds)
async def add_water_tds(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    if val == "-":
        await state.update_data(water_tds=None)
    else:
        try:
            await state.update_data(water_tds=float(val.replace(",", ".")))
        except ValueError:
            await message.answer("❌ Введи число или «-».")
            return
    await state.set_state(AddRecipe.pour_steps)
    await message.answer(
        "Шаг 10/12: Введи <b>шаги вливаний</b> в формате:\n"
        "<code>время_сек:объём_мл; время:объём; ...</code>\n\n"
        "Пример: <code>0:50; 30:100; 60:100</code>\n"
        "Или отправь «-», чтобы пропустить.",
    )


@router.message(AddRecipe.pour_steps)
async def add_pour_steps(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    if val == "-":
        await state.update_data(pour_steps=None)
    else:
        steps = []
        try:
            for part in val.split(";"):
                part = part.strip()
                if not part:
                    continue
                time_str, volume_str = part.split(":")
                steps.append({
                    "time": int(time_str.strip()),
                    "volume": float(volume_str.strip().replace(",", ".")),
                })
        except (ValueError, IndexError):
            await message.answer(
                "❌ Неверный формат. Используй: <code>0:50; 30:100; 60:100</code>",
            )
            return
        await state.update_data(pour_steps=steps)
    await state.set_state(AddRecipe.beverage_weight)
    await message.answer(
        "Шаг 11/12: Введи <b>вес готового напитка</b> на выходе в граммах (например: 210).",
    )


@router.message(AddRecipe.beverage_weight)
async def add_beverage_weight(message: Message, state: FSMContext) -> None:
    try:
        bw = float(message.text.strip().replace(",", "."))
        if bw <= 0:
            raise ValueError
    except ValueError:
        await message.answer("❌ Введи число больше 0 (например: 210).")
        return
    await state.update_data(beverage_weight=bw)
    await state.set_state(AddRecipe.tds)
    await message.answer(
        "Шаг 12/12: Введи <b>TDS</b> в процентах (например: 1.35).",
    )


@router.message(AddRecipe.tds)
async def add_tds(message: Message, state: FSMContext) -> None:
    try:
        tds = float(message.text.strip().replace(",", "."))
        if tds < 0:
            raise ValueError
    except ValueError:
        await message.answer("❌ Введи число (например: 1.35).")
        return

    data = await state.get_data()
    dose = data["dose"]
    beverage_weight = data["beverage_weight"]

    # Расчёт экстракции
    extraction = calculate_extraction(beverage_weight, tds, dose)

    # Сохраняем рецепт в БД
    recipe = Recipe(
        bean_variety=data["bean_variety"],
        bean_processing=data["bean_processing"],
        dose=dose,
        dripper_type=data["dripper_type"],
        grinder_model=data.get("grinder_model"),
        grind_setting=data.get("grind_setting"),
        total_water=data["total_water"],
        water_temp=data.get("water_temp"),
        water_tds=data.get("water_tds"),
        pour_steps=data.get("pour_steps"),
    )
    session.add(recipe)
    session.flush()  # чтобы получить recipe.id

    # Сохраняем замер
    measurement = Measurement(
        recipe_id=recipe.id,
        beverage_weight=beverage_weight,
        tds=tds,
        extraction=extraction,
    )
    session.add(measurement)
    session.commit()

    await state.clear()

    # Формируем красивый ответ
    pour_info = ""
    if data.get("pour_steps"):
        pour_info = "\n<b>Вливания:</b>\n" + "\n".join(
            f"  • {s['time']}с — {s['volume']}мл"
            for s in data["pour_steps"]
        )

    await message.answer(
        f"✅ <b>Рецепт сохранён!</b>\n\n"
        f"🆔 ID: {recipe.id}\n"
        f"☕ Сорт: {data['bean_variety']}\n"
        f"🏭 Обработка: {data['bean_processing']}\n"
        f"⚖️ Доза: {dose}г\n"
        f"🔻 Воронка: {data['dripper_type']}\n"
        f"🛠 Кофемолка: {data.get('grinder_model') or '—'}\n"
        f"⚙️ Помол: {data.get('grind_setting') or '—'}\n"
        f"💧 Вода: {data['total_water']}мл"
        + (f" @ {data['water_temp']}°C" if data.get('water_temp') else "")
        + (f", {data['water_tds']}ppm" if data.get('water_tds') else "")
        + "\n"
        + pour_info
        + f"\n\n📊 <b>Замер:</b>\n"
        f"  • Выход: {beverage_weight}г\n"
        f"  • TDS: {tds}%\n"
        f"  • <b>Экстракция: {extraction}%</b>\n\n"
        + (
            "✅ <i>Отличный результат! (18–22%)</i>"
            if 18 <= extraction <= 22
            else "⚠️ <i>Выйди за пределы Golden Cup (18–22%)</i>"
        ),
        reply_markup=ReplyKeyboardRemove(),
    )


# ──────────────────────────────────────────────
# Команда /recipes — список последних рецептов
# ──────────────────────────────────────────────

@router.message(Command("recipes"))
async def cmd_recipes(message: Message) -> None:
    recipes = (
        session.query(Recipe)
        .order_by(Recipe.created_at.desc())
        .limit(5)
        .all()
    )

    if not recipes:
        await message.answer("📭 Пока нет ни одного рецепта. Добавь первый через /add_recipe!")
        return

    lines = ["📋 <b>Последние рецепты:</b>\n"]
    for r in recipes:
        meas = session.query(Measurement).filter_by(recipe_id=r.id).first()
        ext = f" | Ext: {meas.extraction}%" if meas else ""
        lines.append(
            f"🆔 {r.id} | {r.bean_variety} | {r.dripper_type} | {r.dose}г{ext}"
        )

    await message.answer("\n".join(lines))