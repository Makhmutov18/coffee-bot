"""
Модели SQLAlchemy для базы данных рецептов альтернативного кофе.
Таблицы:
  - users: пользователи (личные / бариста / владельцы)
  - companies: компании (кофейни / сети)
  - spots: точки заваривания (споты кофейни)
  - user_spots: связь бариста с точками (M2M)
  - recipes: рецепты заваривания (личные и коммерческие)
  - measurements: замеры TDS и экстракции

Поддерживает SQLite (локально) и PostgreSQL (Railway / продакшн).
"""

import json
import logging
import os
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column,
    Integer,
    Float,
    String,
    DateTime,
    ForeignKey,
    Table,
    create_engine,
    text,
)
from sqlalchemy.orm import declarative_base, relationship, Session

logger = logging.getLogger(__name__)

Base = declarative_base()

# Папка для хранения SQLite БД (только для локальной разработки)
_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(_DB_DIR, exist_ok=True)


# ──────────────────────────────────────────────
# B2B: Роли пользователей
# ──────────────────────────────────────────────

class UserRole(str, enum.Enum):
    """Роли пользователей в системе."""
    personal = "personal"  # Варит для себя дома
    personal_premium = "personal_premium"  # Домашний с расширенными возможностями
    barista = "barista"    # Бариста на точке
    manager = "manager"    # Старший бариста спота
    owner = "owner"        # Шеф-бариста сети


# Промежуточная таблица для связи "Многие ко многим" (Бариста <-> Точки)
user_spots = Table(
    "user_spots",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("spot_id", Integer, ForeignKey("spots.id", ondelete="CASCADE"), primary_key=True),
)


# ──────────────────────────────────────────────
# B2B: Пользователь
# ──────────────────────────────────────────────

class User(Base):
    """Пользователь системы: может быть домашним, бариста или владельцем."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=True)
    username = Column(String, nullable=True)
    role = Column(String, default=UserRole.personal.value, nullable=False)

    # Если юзер — владелец, у него есть компания
    company = relationship("Company", back_populates="owner", uselist=False)

    # Точки, к которым у бариста есть доступ
    accessible_spots = relationship("Spot", secondary=user_spots, back_populates="staff")

    # Личные рецепты домашнего пользователя
    personal_recipes = relationship("Recipe", back_populates="user")

    def __repr__(self) -> str:
        return (
            f"<User(id={self.id}, telegram_id='{self.telegram_id}', "
            f"role='{self.role}')>"
        )


# ──────────────────────────────────────────────
# B2B: Компания
# ──────────────────────────────────────────────

class Company(Base):
    """Компания (кофейня / сеть кофеен)."""

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Например, "Смородина"
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="company")
    spots = relationship("Spot", back_populates="company", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Company(id={self.id}, name='{self.name}')>"


# ──────────────────────────────────────────────
# B2B: Спот (точка заваривания)
# ──────────────────────────────────────────────

class Spot(Base):
    """Точка заваривания внутри компании (конкретная кофейня)."""

    __tablename__ = "spots"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)  # Например, "Спот на Ленина"
    address = Column(String, nullable=True)
    water_ppm = Column(Integer, default=70)  # Дефолтная минерализация воды на точке
    grinder_model = Column(String, nullable=True)  # Основная кофемолка на точке
    invite_token = Column(String, nullable=True, unique=True)  # Токен для инвайт-ссылки

    company = relationship("Company", back_populates="spots")
    staff = relationship("User", secondary=user_spots, back_populates="accessible_spots")

    # Рецепты, созданные специально под этот спот
    recipes = relationship("Recipe", back_populates="spot")

    def __repr__(self) -> str:
        return f"<Spot(id={self.id}, name='{self.name}', company_id={self.company_id})>"


# ──────────────────────────────────────────────
# Рецепт заваривания
# ──────────────────────────────────────────────

class Recipe(Base):
    """Рецепт заваривания альтернативного кофе.

    Может быть:
    - личным (user_id задан, spot_id = None)
    - коммерческим (spot_id задан, привязан к конкретной точке)
    """

    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # B2B: привязка к пользователю и/или споту
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="ID пользователя (для личных рецептов)")
    spot_id = Column(Integer, ForeignKey("spots.id"), nullable=True, comment="ID спота (для коммерческих рецептов)")

    # Название рецепта
    name = Column(String(255), nullable=True, comment="Название рецепта")

    # Зерно
    roaster = Column(String(255), nullable=True, comment="Обжарщик")
    bean_variety = Column(String(255), nullable=False, comment="Сорт зерна")
    bean_processing = Column(String(128), nullable=True, comment="Обработка (мытая / натуральная / хани / анэробная и т.д.)")
    dose = Column(Float, nullable=False, comment="Вес сухого зерна, г")

    # Оборудование
    dripper_type = Column(String(32), nullable=False, comment="Тип воронки: V60 / Switch")
    grinder_model = Column(String(128), nullable=True, comment="Модель кофемолки")
    grind_setting = Column(String(64), nullable=True, comment="Клик / номер помола")

    # Вода
    total_water = Column(Float, nullable=False, comment="Общий объём воды, мл")
    water_temp = Column(Float, nullable=True, comment="Температура воды, °C")
    water_tds = Column(Float, nullable=True, comment="Минерализация воды, ppm")

    # Общее время заваривания (секунды)
    brew_time = Column(Integer, nullable=True, comment="Общее время заваривания в секундах")

    # Шаги вливаний (JSON-массив)
    _pour_steps = Column("pour_steps", String, nullable=True, comment="Массив шагов вливаний в JSON")

    # Дегустационный профиль (JSON)
    _tasting_notes = Column("tasting_notes", String, nullable=True, comment="Дегустационный профиль в JSON")

    # Связи
    measurements = relationship("Measurement", back_populates="recipe", cascade="all, delete-orphan")
    user = relationship("User", back_populates="personal_recipes")
    spot = relationship("Spot", back_populates="recipes")

    @property
    def pour_steps(self) -> Optional[list[dict]]:
        """Десериализовать pour_steps из JSON."""
        if self._pour_steps is None:
            return None
        return json.loads(self._pour_steps)

    @pour_steps.setter
    def pour_steps(self, value: Optional[list[dict]]) -> None:
        """Сериализовать pour_steps в JSON."""
        if value is None:
            self._pour_steps = None
        else:
            self._pour_steps = json.dumps(value, ensure_ascii=False)

    @property
    def tasting_notes(self) -> Optional[dict]:
        """Десериализовать tasting_notes из JSON."""
        if self._tasting_notes is None:
            return None
        return json.loads(self._tasting_notes)

    @tasting_notes.setter
    def tasting_notes(self, value: Optional[dict]) -> None:
        """Сериализовать tasting_notes в JSON."""
        if value is None:
            self._tasting_notes = None
        else:
            self._tasting_notes = json.dumps(value, ensure_ascii=False)

    def __repr__(self) -> str:
        return (
            f"<Recipe(id={self.id}, bean='{self.bean_variety}', "
            f"dripper='{self.dripper_type}', dose={self.dose}g)>"
        )


# ──────────────────────────────────────────────
# Замеры TDS и экстракции
# ──────────────────────────────────────────────

class Measurement(Base):
    """Замеры TDS и расчёт экстракции для рецепта."""

    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)

    beverage_weight = Column(Float, nullable=False, comment="Вес готового напитка на выходе, г")
    tds = Column(Float, nullable=False, comment="TDS, %")
    extraction = Column(Float, nullable=False, comment="Рассчитанная экстракция, %")

    recipe = relationship("Recipe", back_populates="measurements")

    def __repr__(self) -> str:
        return (
            f"<Measurement(id={self.id}, recipe_id={self.recipe_id}, "
            f"beverage={self.beverage_weight}g, TDS={self.tds}%, Ext={self.extraction}%)>"
        )


# ──────────────────────────────────────────────
# Ситовый анализ (конвертация кофемолок по фракциям)
# ──────────────────────────────────────────────

class GrinderMapping(Base):
    """
    Динамическая таблица соответствия помолов между кофемолками.

    Каждая строка — значение одной кофемолки для одного диапазона микрон.
    Колонки:
      - micron_range: диапазон микрон (например, '550-600')
      - method: метод заваривания (например, 'Воронка V60 / Калита (Стандарт)')
      - grinder_name: название кофемолки (например, 'comandante_c40_mk3_mk4')
      - clicks_value: значение помола (например, '19-20 clicks' или 'не рекомендуется')

    Алгоритм конвертации: найти micron_range, где значение на исходной кофемолке
    попадает в диапазон clicks_value, и вернуть clicks_value целевой кофемолки
    из того же micron_range.
    """

    __tablename__ = "grinder_data"

    id = Column(Integer, primary_key=True, autoincrement=True)
    micron_range = Column(String(32), nullable=False, index=True, comment="Диапазон микрон (например, '550-600')")
    method = Column(String(128), nullable=False, comment="Метод заваривания (например, 'Воронка V60 / Калита (Стандарт)')")
    grinder_name = Column(String(64), nullable=False, index=True, comment="Название кофемолки (например, 'comandante_c40_mk3_mk4')")
    clicks_value = Column(String(32), nullable=False, comment="Значение помола (например, '19-20 clicks' или 'не рекомендуется')")

    def __repr__(self) -> str:
        return f"<GrinderMapping(grinder='{self.grinder_name}', micron='{self.micron_range}')>"


# ──────────────────────────────────────────────
# Функция расчёта экстракции (Golden Cup)
# ──────────────────────────────────────────────

def calculate_extraction(
    beverage_weight: float,
    tds_percent: float,
    dose: float,
) -> float:
    """
    Рассчитать экстракцию по формуле Golden Cup.

    Ext (%) = (Вес напитка (г) × TDS (%)) / Вес сухого зерна (г)

    Параметры
    ---------
    beverage_weight : float
        Вес готового напитка на выходе, г.
    tds_percent : float
        TDS в процентах (например, 1.35 означает 1.35%).
    dose : float
        Вес сухого зерна, г.

    Возвращает
    ----------
    float
        Процент экстракции (например, 19.5 означает 19.5%).
    """
    if dose <= 0:
        raise ValueError("Вес сухого зерна (dose) должен быть > 0")
    if beverage_weight <= 0:
        raise ValueError("Вес напитка (beverage_weight) должен быть > 0")
    if tds_percent < 0:
        raise ValueError("TDS не может быть отрицательным")

    return round((beverage_weight * tds_percent) / dose, 2)


# ──────────────────────────────────────────────
# Глобальный engine (создаётся один раз при старте)
# ──────────────────────────────────────────────

_engine = None


def get_database_url() -> str:
    """
    Определить URL базы данных.
    Приоритет:
      1. DATABASE_URL (переменная окружения — Railway / продакшн)
      2. SQLite fallback (локальная разработка)
    """
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        # Railway PostgreSQL может присылать postgres:// вместо postgresql://
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        return db_url
    # Локальный SQLite fallback
    db_path = os.path.join(_DB_DIR, "coffee.db")
    return f"sqlite:///{db_path}"


def init_engine():
    """
    Создать и вернуть глобальный engine (вызывается один раз при старте приложения).

    Настройки пула:
      - pool_pre_ping=True  — проверять соединение перед использованием
      - pool_recycle=300    — пересоздавать соединения каждые 5 минут
      - pool_size=5         — 5 постоянных соединений в пуле
      - max_overflow=10     — до 10 дополнительных соединений при пике
    """
    global _engine
    if _engine is not None:
        return _engine
    database_url = get_database_url()
    _engine = create_engine(
        database_url,
        echo=False,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )
    logger.info(
        "Database engine created (pool_pre_ping=True, pool_recycle=300, "
        "pool_size=5, max_overflow=10)"
    )
    return _engine


def close_engine() -> None:
    """Закрыть глобальный engine при graceful shutdown."""
    global _engine
    if _engine is not None:
        _engine.dispose()
        logger.info("Database engine disposed")
        _engine = None


def _run_migration(engine, table: str, column: str, col_type: str) -> None:
    """Безопасно добавить колонку в существующую таблицу (если её ещё нет)."""
    try:
        with engine.connect() as conn:
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}"))
            conn.commit()
            logger.info("Migration: added %s.%s (%s)", table, column, col_type)
    except Exception:
        # Колонка уже существует — это нормально
        pass


def _migrate_existing_tables(engine) -> None:
    """Миграции для добавления новых колонок в существующие таблицы."""
    _run_migration(engine, "recipes", "brew_time", "INTEGER")
    _run_migration(engine, "recipes", "user_id", "INTEGER")
    _run_migration(engine, "recipes", "spot_id", "INTEGER")
    _run_migration(engine, "spots", "invite_token", "VARCHAR")


def _seed_grinder_mappings(engine) -> None:
    """
    Полная перезаливка таблицы grinder_data из JSON-файла grinders_data.json.

    Нормализация: каждая строка JSON (один диапазон микрон) превращается
    в N строк БД — по одной на каждую кофемолку в этом диапазоне.

    При каждом старте:
      1. Удаляет ВСЕ старые записи (DELETE).
      2. Вставляет нормализованные данные.
    """
    candidates = [
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "newfile", "grinders_data.json"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "newfile", "grinders_data.json"),
        os.path.join(os.getcwd(), "newfile", "grinders_data.json"),
    ]
    json_path = None
    for p in candidates:
        if os.path.exists(p):
            json_path = p
            break

    if json_path is None:
        logger.warning("grinders_data.json not found (tried %s), skipping seed", candidates)
        return

    with open(json_path, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    # Определяем все ключи кофемолок (все ключи, кроме micron_range и method)
    grinder_keys = set()
    for row in seed_data:
        for k in row:
            if k not in ("micron_range", "method"):
                grinder_keys.add(k)
    grinder_keys = sorted(grinder_keys)

    with Session(bind=engine) as s:
        try:
            deleted = s.query(GrinderMapping).delete()
            s.flush()
            logger.info("GrinderMapping: deleted %d old rows", deleted)

            count = 0
            for row in seed_data:
                micron_range = row.get("micron_range", "")
                method = row.get("method", "")
                for gk in grinder_keys:
                    clicks_value = row.get(gk, "")
                    if not clicks_value:
                        continue
                    entry = GrinderMapping(
                        micron_range=micron_range,
                        method=method,
                        grinder_name=gk,
                        clicks_value=clicks_value,
                    )
                    s.add(entry)
                    count += 1
            s.commit()
            logger.info(
                "GrinderMapping seeded with %d rows (%d grinders) from %s",
                count, len(grinder_keys), json_path,
            )
        except Exception:
            s.rollback()
            logger.exception("GrinderMapping seed failed")
            raise


def _parse_range_value(s: str) -> tuple[float, float] | None:
    """
    Парсит строковое значение настройки кофемолки в числовой диапазон.

    Поддерживает форматы:
      - "19-22 clicks" → (19.0, 22.0)
      - "5.6-7.2"      → (5.6, 7.2)
      - "17 clicks"    → (17.0, 17.0)
      - "33+ clicks"   → (33.0, float('inf'))
      - "29+"          → (29.0, float('inf'))
      - "не рекомендуется" → None
      - ""             → None
    """
    if not s or not s.strip():
        return None
    s_lower = s.strip().lower()

    if "не рекомендуется" in s_lower:
        return None

    # Удаляем суффикс " clicks" если есть
    suffix = " clicks"
    idx = s_lower.find(suffix)
    if idx != -1:
        s_lower = s_lower[:idx].strip()

    # "+" → (число, inf)
    if s_lower.endswith("+"):
        try:
            val = float(s_lower[:-1].strip())
            return (val, float("inf"))
        except ValueError:
            return None

    # "число-число" → (min, max)
    if "-" in s_lower:
        parts = s_lower.split("-", 1)
        try:
            lo = float(parts[0].strip())
            hi = float(parts[1].strip())
            return (lo, hi)
        except ValueError:
            return None

    # Одиночное число → (число, число)
    try:
        val = float(s_lower)
        return (val, val)
    except ValueError:
        return None


def list_grinder_models() -> list[str]:
    """
    Вернуть список всех уникальных названий кофемолок из таблицы grinder_data.

    СИНХРОННАЯ функция — создаёт свою сессию.
    Должна вызываться через asyncio.to_thread() из async-хендлера.
    """
    engine = init_engine()
    with Session(bind=engine) as s:
        try:
            rows = (
                s.query(GrinderMapping.grinder_name)
                .distinct()
                .order_by(GrinderMapping.grinder_name)
                .all()
            )
            return [r[0] for r in rows]
        finally:
            s.close()


def convert_grinder_value(
    from_grinder: str,
    to_grinder: str,
    value: str,
) -> dict:
    """
    Конвертировать значение помола между кофемолками.

    Алгоритм:
      1. Парсит переданное value как число (замена запятой на точку для iOS).
      2. Ищет micron_range, где clicks_value исходной кофемолки образует
         диапазон, в который попадает value.
      3. Возвращает clicks_value целевой кофемолки из того же micron_range.

    Если value не попадает ни в один диапазон — возвращает
    {"result": "Не рекомендуется / Вне лимитов", "method": "—", "micron_range": "—"}.

    СИНХРОННАЯ функция — ВСЕГДА создаёт свою сессию.
    Должна вызываться через asyncio.to_thread() из async-хендлера.
    """
    engine = init_engine()
    with Session(bind=engine) as s:
        try:
            # Парсим введённое значение как число (замена запятой на точку)
            cleaned = value.strip().replace(",", ".")
            try:
                input_val = float(cleaned)
            except (ValueError, AttributeError):
                return {
                    "result": "Не рекомендуется / Вне лимитов",
                    "method": "—",
                    "micron_range": "—",
                }

            # Ищем все строки для исходной кофемолки
            from_rows = (
                s.query(GrinderMapping)
                .filter(GrinderMapping.grinder_name == from_grinder)
                .all()
            )
            if not from_rows:
                return {
                    "result": "Не рекомендуется / Вне лимитов",
                    "method": "—",
                    "micron_range": "—",
                }

            # Ищем micron_range, где input_val попадает в clicks_value
            matched_micron_range = None
            matched_method = None
            for row in from_rows:
                rng = _parse_range_value(row.clicks_value)
                if rng is None:
                    continue
                lo, hi = rng
                if lo <= input_val <= hi:
                    matched_micron_range = row.micron_range
                    matched_method = row.method
                    break

            if matched_micron_range is None:
                return {
                    "result": "Не рекомендуется / Вне лимитов",
                    "method": "—",
                    "micron_range": "—",
                }

            # Ищем значение для целевой кофемолки в том же micron_range
            to_row = (
                s.query(GrinderMapping)
                .filter(
                    GrinderMapping.grinder_name == to_grinder,
                    GrinderMapping.micron_range == matched_micron_range,
                )
                .first()
            )
            if to_row is None:
                return {
                    "result": "Не рекомендуется / Вне лимитов",
                    "method": "—",
                    "micron_range": "—",
                }

            to_rng = _parse_range_value(to_row.clicks_value)
            if to_rng is None:
                to_value = "Не рекомендуется"
            else:
                lo, hi = to_rng
                if hi == float("inf"):
                    to_value = f"{lo}+"
                elif lo == hi:
                    to_value = str(int(lo) if lo == int(lo) else lo)
                else:
                    to_value = f"{lo}-{hi}"

            # Форматируем from_value для отображения
            from_rng = _parse_range_value(
                next(
                    r.clicks_value for r in from_rows
                    if r.micron_range == matched_micron_range
                )
            )
            if from_rng is not None:
                flo, fhi = from_rng
                if fhi == float("inf"):
                    from_value = f"{flo}+"
                elif flo == fhi:
                    from_value = str(int(flo) if flo == int(flo) else flo)
                else:
                    from_value = f"{flo}-{fhi}"
            else:
                from_value = to_row.clicks_value

            return {
                "from_grinder": from_grinder,
                "to_grinder": to_grinder,
                "from_value": from_value,
                "to_value": to_value,
                "micron_range": matched_micron_range,
                "method": matched_method,
            }
        finally:
            s.close()


def init_database() -> None:
    """
    Инициализировать базу данных: создать глобальный engine, таблицы и миграции.
    Вызывается ОДИН РАЗ при старте приложения (в main.py).
    """
    engine = init_engine()
    Base.metadata.create_all(engine)
    _migrate_existing_tables(engine)
    _seed_grinder_mappings(engine)
    logger.info("Database tables created/verified")


def init_db() -> Session:
    """
    Создать новую сессию, привязанную к глобальному engine.

    В отличие от предыдущей версии, НЕ создаёт новый engine и НЕ вызывает
    create_all() — это делается один раз в init_database().

    Возвращает
    ----------
    sqlalchemy.orm.Session
    """
    engine = init_engine()  # возвращает уже существующий _engine
    return Session(bind=engine)


# ──────────────────────────────────────────────
# Точка входа для тестового запуска
# ──────────────────────────────────────────────

if __name__ == "__main__":
    # Быстрая проверка: создаём БД, добавляем тестовые данные
    session = init_db()

    # Создаём пользователя
    user = User(
        telegram_id="123456789",
        name="Тестовый пользователь",
        username="test_user",
        role=UserRole.personal.value,
    )
    session.add(user)
    session.flush()

    # Создаём рецепт
    recipe = Recipe(
        user_id=user.id,
        bean_variety="Ethiopia Yirgacheffe",
        bean_processing="washed",
        dose=15.0,
        dripper_type="V60",
        grinder_model="Comandante C40",
        grind_setting="22 clicks",
        total_water=250.0,
        water_temp=92.0,
        water_tds=50.0,
        brew_time=180,
        pour_steps=[
            {"time": 0, "volume": 50, "action": "bloom"},
            {"time": 30, "volume": 100, "action": "main pour"},
            {"time": 60, "volume": 100, "action": "final pour"},
        ],
    )
    session.add(recipe)
    session.commit()

    # Рассчитываем экстракцию
    ext = calculate_extraction(
        beverage_weight=210.0,
        tds_percent=1.35,
        dose=recipe.dose,
    )
    print(f"Рассчитанная экстракция: {ext}%")

    measurement = Measurement(
        recipe_id=recipe.id,
        beverage_weight=210.0,
        tds=1.35,
        extraction=ext,
    )
    session.add(measurement)
    session.commit()

    print(f"Создан пользователь: {user}")
    print(f"Создан рецепт: {recipe}")
    print(f"Создан замер: {measurement}")
    print("База данных успешно инициализирована!")

    session.close()