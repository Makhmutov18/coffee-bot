#!/bin/bash
# ============================================================
# Скрипт деплоя Coffee Bot на Yandex Cloud VM
# Запускать после SSH-подключения к ВМ из Cloud Shell
# ============================================================

set -e

echo "=== 1. Устанавливаем Docker ==="
sudo apt update
sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER

# Применяем группу docker без перезахода
sudo chmod 666 /var/run/docker.sock

echo "=== 2. Создаём папку проекта ==="
mkdir -p ~/coffee-bot/app/bot
cd ~/coffee-bot

echo "=== 3. Создаём файлы проекта ==="

# --- database.py ---
cat > app/database.py << 'PYEOF'
"""
Модели SQLAlchemy для базы данных рецептов альтернативного кофе.
"""
import json
import os
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, Float, String, DateTime, ForeignKey, create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, Session

Base = declarative_base()
_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(_DB_DIR, exist_ok=True)


class Recipe(Base):
    __tablename__ = "recipes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    bean_variety = Column(String(255), nullable=False)
    bean_processing = Column(String(128), nullable=True)
    dose = Column(Float, nullable=False)
    dripper_type = Column(String(32), nullable=False)
    grinder_model = Column(String(128), nullable=True)
    grind_setting = Column(String(64), nullable=True)
    total_water = Column(Float, nullable=False)
    water_temp = Column(Float, nullable=True)
    water_tds = Column(Float, nullable=True)
    _pour_steps = Column("pour_steps", String, nullable=True)
    measurements = relationship("Measurement", back_populates="recipe", cascade="all, delete-orphan")

    @property
    def pour_steps(self) -> Optional[list[dict]]:
        if self._pour_steps is None:
            return None
        return json.loads(self._pour_steps)

    @pour_steps.setter
    def pour_steps(self, value: Optional[list[dict]]) -> None:
        if value is None:
            self._pour_steps = None
        else:
            self._pour_steps = json.dumps(value, ensure_ascii=False)


class Measurement(Base):
    __tablename__ = "measurements"
    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    beverage_weight = Column(Float, nullable=False)
    tds = Column(Float, nullable=False)
    extraction = Column(Float, nullable=False)
    recipe = relationship("Recipe", back_populates="measurements")


def calculate_extraction(beverage_weight: float, tds_percent: float, dose: float) -> float:
    if dose <= 0:
        raise ValueError("Вес сухого зерна (dose) должен быть > 0")
    if beverage_weight <= 0:
        raise ValueError("Вес напитка (beverage_weight) должен быть > 0")
    if tds_percent < 0:
        raise ValueError("TDS не может быть отрицательным")
    return round((beverage_weight * tds_percent) / dose, 2)


def init_db(db_path: str | None = None) -> Session:
    if db_path is None:
        db_path = os.path.join(_DB_DIR, "coffee.db")
    engine = create_engine(f"sqlite:///{db_path}", echo=False)
    Base.metadata.create_all(engine)
    return Session(bind=engine)
PYEOF

# --- handlers.py ---
cat > app/bot/handlers.py << 'PYEOF'
from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton, ReplyKeyboardRemove
from app.database import Recipe, Measurement, calculate_extraction, init_db

router = Router()
session = init_db("coffee.db")


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


dripper_kb = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text="V60"), KeyboardButton(text="Hario Switch")]],
    resize_keyboard=True, one_time_keyboard=True,
)
processing_kb = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text="Washed / Мытая")],
        [KeyboardButton(text="Natural / Натуральная")],
        [KeyboardButton(text="Honey / Хани")],
        [KeyboardButton(text="Anaerobic / Анэробная")],
        [KeyboardButton(text="Другое")],
    ],
    resize_keyboard=True, one_time_keyboard=True,
)


@router.message(CommandStart())
async def cmd_start(message: Message) -> None:
    await message.answer(
        "☕ <b>Coffee Recipe Bot</b>\n\n"
        "Я помогу тебе записывать рецепты заваривания альтернативного кофе "
        "и рассчитывать экстракцию по системе Golden Cup.\n\n"
        "Команды:\n"
        "• /start — приветствие\n"
        "• /help — справка\n"
        "• /add_recipe — добавить рецепт\n"
        "• /recipes — последние рецепты\n"
        "• /cancel — отмена"
    )


@router.message(Command("help"))
async def cmd_help(message: Message) -> None:
    await message.answer(
        "📖 <b>Справка</b>\n\n"
        "<b>Команды:</b>\n"
        "• /start — приветствие\n"
        "• /help — эта справка\n"
        "• /add_recipe — добавить новый рецепт (пошагово)\n"
        "• /recipes — показать последние 5 рецептов\n"
        "• /cancel — отменить добавление рецепта\n\n"
        "<b>Формула экстракции (Golden Cup):</b>\n"
        "<code>Ext (%) = (Вес напитка × TDS) / Вес зерна</code>\n\n"
        "Рекомендуемый диапазон: 18–22%"
    )


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext) -> None:
    current_state = await state.get_state()
    if current_state is None:
        await message.answer("Нет активного действия для отмены.")
        return
    await state.clear()
    await message.answer("❌ Добавление рецепта отменено.", reply_markup=ReplyKeyboardRemove())


@router.message(Command("add_recipe"))
async def cmd_add_recipe(message: Message, state: FSMContext) -> None:
    await state.set_state(AddRecipe.bean_variety)
    await message.answer(
        "☕ <b>Добавление нового рецепта</b>\n\n"
        "Шаг 1/12: Введи <b>сорт зерна</b> (например: Ethiopia Yirgacheffe)."
    )


@router.message(AddRecipe.bean_variety)
async def add_bean_variety(message: Message, state: FSMContext) -> None:
    await state.update_data(bean_variety=message.text.strip())
    await state.set_state(AddRecipe.bean_processing)
    await message.answer("Шаг 2/12: Выбери <b>обработку</b> зерна:", reply_markup=processing_kb)


@router.message(AddRecipe.bean_processing)
async def add_bean_processing(message: Message, state: FSMContext) -> None:
    await state.update_data(bean_processing=message.text.strip())
    await state.set_state(AddRecipe.dose)
    await message.answer("Шаг 3/12: Введи <b>вес сухого зерна</b> в граммах (например: 15).", reply_markup=ReplyKeyboardRemove())


@router.message(AddRecipe.dose)
async def add_dose(message: Message, state: FSMContext) -> None:
    try:
        dose = float(message.text.strip().replace(",", "."))
        if dose <= 0:
            raise ValueError
    except ValueError:
        await message.answer("❌ Введи число больше 0 (например: 15).")
        return
    await state.update_data(dose=dose)
    await state.set_state(AddRecipe.dripper_type)
    await message.answer("Шаг 4/12: Выбери <b>тип воронки</b>:", reply_markup=dripper_kb)


@router.message(AddRecipe.dripper_type)
async def add_dripper_type(message: Message, state: FSMContext) -> None:
    if message.text.strip() not in ("V60", "Hario Switch"):
        await message.answer("❌ Выбери V60 или Hario Switch на клавиатуре.")
        return
    await state.update_data(dripper_type=message.text.strip())
    await state.set_state(AddRecipe.grinder_model)
    await message.answer("Шаг 5/12: Введи <b>модель кофемолки</b> (или «-»).", reply_markup=ReplyKeyboardRemove())


@router.message(AddRecipe.grinder_model)
async def add_grinder_model(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    await state.update_data(grinder_model=None if val == "-" else val)
    await state.set_state(AddRecipe.grind_setting)
    await message.answer("Шаг 6/12: Введи <b>клик помола</b> (или «-»).")


@router.message(AddRecipe.grind_setting)
async def add_grind_setting(message: Message, state: FSMContext) -> None:
    val = message.text.strip()
    await state.update_data(grind_setting=None if val == "-" else val)
    await state.set_state(AddRecipe.total_water)
    await message.answer("Шаг 7/12: Введи <b>общий объём воды</b> в мл (например: 250).")


@router.message(AddRecipe.total_water)
async def add_total_water(message: Message, state: FSMContext) -> None:
    try:
        water = float(message.text.strip().replace(",", "."))
        if water <= 0:
            raise ValueError
    except ValueError:
        await message.answer("❌ Введи число больше 0 (например: 250).")
        return
    await state.update_data(total_water=water)
    await state.set_state(AddRecipe.water_temp)
    await message.answer("Шаг 8/12: Введи <b>температуру воды</b> в °C (или «-»).")


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
    await message.answer("Шаг 9/12: Введи <b>минерализацию воды</b> в ppm (или «-»).")


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
        "<code>время_сек:объём_мл; время:объём; ...</code>\n"
        "Пример: <code>0:50; 30:100; 60:100</code>\n"
        "Или отправь «-»."
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
                steps.append({"time": int(time_str.strip()), "volume": float(volume_str.strip().replace(",", "."))})
        except (ValueError, IndexError):
            await message.answer("❌ Неверный формат. Используй: <code>0:50; 30:100; 60:100</code>")
            return
        await state.update_data(pour_steps=steps)
    await state.set_state(AddRecipe.beverage_weight)
    await message.answer("Шаг 11/12: Введи <b>вес готового напитка</b> в граммах (например: 210).")


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
    await message.answer("Шаг 12/12: Введи <b>TDS</b> в процентах (например: 1.35).")


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
    extraction = calculate_extraction(beverage_weight, tds, dose)
    recipe = Recipe(
        bean_variety=data["bean_variety"], bean_processing=data["bean_processing"],
        dose=dose, dripper_type=data["dripper_type"],
        grinder_model=data.get("grinder_model"), grind_setting=data.get("grind_setting"),
        total_water=data["total_water"], water_temp=data.get("water_temp"),
        water_tds=data.get("water_tds"), pour_steps=data.get("pour_steps"),
    )
    session.add(recipe)
    session.flush()
    measurement = Measurement(recipe_id=recipe.id, beverage_weight=beverage_weight, tds=tds, extraction=extraction)
    session.add(measurement)
    session.commit()
    await state.clear()
    pour_info = ""
    if data.get("pour_steps"):
        pour_info = "\n<b>Вливания:</b>\n" + "\n".join(f"  • {s['time']}с — {s['volume']}мл" for s in data["pour_steps"])
    await message.answer(
        f"✅ <b>Рецепт сохранён!</b>\n\n"
        f"🆔 ID: {recipe.id}\n☕ Сорт: {data['bean_variety']}\n"
        f"🏭 Обработка: {data['bean_processing']}\n⚖️ Доза: {dose}г\n"
        f"🔻 Воронка: {data['dripper_type']}\n"
        f"💧 Вода: {data['total_water']}мл"
        + (f" @ {data['water_temp']}°C" if data.get('water_temp') else "")
        + (f", {data['water_tds']}ppm" if data.get('water_tds') else "")
        + pour_info
        + f"\n\n📊 <b>Замер:</b>\n  • Выход: {beverage_weight}г\n  • TDS: {tds}%\n  • <b>Экстракция: {extraction}%</b>\n\n"
        + ("✅ <i>Отличный результат! (18–22%)</i>" if 18 <= extraction <= 22 else "⚠️ <i>Выйди за пределы Golden Cup (18–22%)</i>"),
        reply_markup=ReplyKeyboardRemove(),
    )


@router.message(Command("recipes"))
async def cmd_recipes(message: Message) -> None:
    recipes = session.query(Recipe).order_by(Recipe.created_at.desc()).limit(5).all()
    if not recipes:
        await message.answer("📭 Пока нет рецептов. Добавь через /add_recipe!")
        return
    lines = ["📋 <b>Последние рецепты:</b>\n"]
    for r in recipes:
        meas = session.query(Measurement).filter_by(recipe_id=r.id).first()
        ext = f" | Ext: {meas.extraction}%" if meas else ""
        lines.append(f"🆔 {r.id} | {r.bean_variety} | {r.dripper_type} | {r.dose}г{ext}")
    await message.answer("\n".join(lines))
PYEOF

# --- __init__.py files ---
touch app/__init__.py app/bot/__init__.py

# --- main.py ---
cat > main.py << 'PYEOF'
import asyncio, logging, os
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from dotenv import load_dotenv
from app.bot.handlers import router

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

async def main():
    if not BOT_TOKEN or BOT_TOKEN == "your_telegram_bot_token_here":
        logger.error("BOT_TOKEN не задан! Укажи его в файле .env")
        return
    bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)
    logger.info("Бот запущен!")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
PYEOF

# --- requirements.txt ---
cat > requirements.txt << 'EOF'
aiogram==3.17.0
sqlalchemy==2.0.36
python-dotenv==1.0.1
EOF

# --- Dockerfile ---
cat > Dockerfile << 'DOCKEREOF'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
VOLUME ["/app/data"]
CMD ["python", "main.py"]
DOCKEREOF

# --- docker-compose.yml ---
cat > docker-compose.yml << 'YAMLEOF'
version: "3.9"
services:
  bot:
    build: .
    container_name: coffee-bot
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./data:/app/data
YAMLEOF

echo ""
echo "============================================"
echo "✅ Все файлы созданы!"
echo "============================================"
echo ""
echo "👉 СЕЙЧАС СДЕЛАЙ ТАК:"
echo ""
echo "1. Создай файл .env с токеном:"
echo "   nano .env"
echo "   Вставь: BOT_TOKEN=твой_токен_от_BotFather"
echo ""
echo "2. Запусти бота:"
echo "   docker compose up -d --build"
echo ""
echo "3. Проверь логи:"
echo "   docker compose logs -f"
echo ""
echo "============================================"