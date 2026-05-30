"""
Модели SQLAlchemy для базы данных рецептов альтернативного кофе.
Таблицы:
  - users: пользователи (личные / бариста / владельцы)
  - companies: компании (кофейни / сети)
  - spots: точки заваривания (споты кофейни)
  - user_spots: связь бариста с точками (M2M)
  - recipes: рецепты заваривания (личные и коммерческие)
  - measurements: замеры TDS и экстракции
  - brew_history: история заваров пользователя

Поддерживает SQLite (локально) и PostgreSQL (Railway / продакшн).
"""

import json
import logging
import os
import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
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
    is_beta_tester = Column(Boolean, default=False)

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

    # Метод заваривания
    method = Column(String(16), nullable=True, comment="Метод заваривания: pourover / batch / espresso")

    # Избранное
    is_favorite = Column(Boolean, default=False, nullable=False, comment="Отмечен как избранный")

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
# История заваров
# ──────────────────────────────────────────────

class BrewHistory(Base):
    """История завершённых заваров пользователя."""

    __tablename__ = "brew_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="ID пользователя")
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True, comment="ID рецепта (если завар по рецепту)")

    coffee_beans = Column(String(255), nullable=False, comment="Название зерна / сорта")
    brew_method = Column(String(64), nullable=False, comment="Метод заваривания (V60 / Switch / AeroPress и т.д.)")
    weight_in = Column(Float, nullable=False, comment="Вес закладки, г")
    weight_out = Column(Float, nullable=False, comment="Вес напитка на выходе, г")
    brew_time = Column(Integer, nullable=False, comment="Общее время заваривания, сек")
    temperature = Column(Float, nullable=True, comment="Температура воды, °C")
    status = Column(String(32), nullable=False, default="within_spec", comment="Статус: within_spec / out_of_limits")
    extraction = Column(Float, nullable=True, comment="Рассчитанная экстракция, %")
    tds = Column(Float, nullable=True, comment="TDS, %")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", backref="brew_history")
    recipe = relationship("Recipe", backref="brew_history")

    def __repr__(self) -> str:
        return (
            f"<BrewHistory(id={self.id}, user_id={self.user_id}, "
            f"beans='{self.coffee_beans}', method='{self.brew_method}', "
            f"status='{self.status}')>"
        )


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
    _run_migration(engine, "recipes", "is_favorite", "BOOLEAN DEFAULT FALSE")
    _run_migration(engine, "recipes", "method", "VARCHAR(16)")
    _run_migration(engine, "spots", "invite_token", "VARCHAR")
    _run_migration(engine, "users", "is_beta_tester", "BOOLEAN DEFAULT FALSE")


def init_database() -> None:
    """
    Инициализировать базу данных: создать глобальный engine, таблицы и миграции.
    Вызывается ОДИН РАЗ при старте приложения (в main.py).
    """
    engine = init_engine()
    Base.metadata.create_all(engine)
    _migrate_existing_tables(engine)
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