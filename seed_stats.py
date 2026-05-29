"""
Скрипт для генерации тестовых данных BrewHistory.

Генерирует 35 записей за последние 7 дней со случайными,
но реалистичными кофейными данными для проверки вкладки "Статистика".

Запуск:
    cd coffee-bot && python seed_stats.py
"""

import sys
import os
import random
from datetime import datetime, timedelta

# Добавляем backend/ в sys.path, чтобы импортировать app.database
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from app.database import (
    init_engine, init_database, init_db, BrewHistory, User,
)

# ── Конфигурация ──

COFFEE_BEANS = ["Эфиопия Гуджи", "Кения Ньери", "Колумбия Супремо"]
BREW_METHODS = ["V60", "Эспрессо", "Аэропресс"]

# Вес закладки в зависимости от метода
WEIGHT_IN_MAP = {
    "V60": (15.0, 16.0),
    "Эспрессо": (18.0, 18.5),
    "Аэропресс": (14.0, 15.0),
}

# Вес напитка на выходе (примерные пропорции)
WEIGHT_OUT_MAP = {
    "V60": (240, 260),
    "Эспрессо": (36, 45),
    "Аэропресс": (200, 220),
}

# Время заваривания (сек)
BREW_TIME_MAP = {
    "V60": (150, 210),
    "Эспрессо": (25, 35),
    "Аэропресс": (90, 150),
}

# Температура воды
TEMP_MAP = {
    "V60": (90, 96),
    "Эспрессо": (90, 94),
    "Аэропресс": (85, 92),
}

# TDS и экстракция для within_spec (18-22% экстракции)
# и для out_of_limits (< 18% или > 22%)
TDS_WITHIN_SPEC = (1.30, 1.45)
TDS_OUT_OF_LIMITS_LOW = (1.0, 1.15)   # недоэкстракция
TDS_OUT_OF_LIMITS_HIGH = (1.6, 1.8)   # переэкстракция

TOTAL_RECORDS = 35
WITHIN_SPEC_RATIO = 0.85  # 85% в рамках техкарты


def random_float(low, high):
    """Случайное число с плавающей точкой в диапазоне [low, high]."""
    return round(random.uniform(low, high), 1)


def generate_brew_history(user_id: int) -> list[dict]:
    """Сгенерировать 35 записей BrewHistory для указанного пользователя."""
    records = []
    now = datetime.utcnow()

    for i in range(TOTAL_RECORDS):
        # Дата: равномерно распределяем по последним 7 дням
        days_ago = random.uniform(0, 7)
        hours_offset = random.uniform(0, 24)
        created_at = now - timedelta(days=days_ago, hours=hours_offset)

        # Случайный метод и зерно
        method = random.choice(BREW_METHODS)
        beans = random.choice(COFFEE_BEANS)

        # Вес закладки
        w_in_range = WEIGHT_IN_MAP[method]
        weight_in = round(random.uniform(*w_in_range), 1)

        # Вес напитка
        w_out_range = WEIGHT_OUT_MAP[method]
        weight_out = round(random.uniform(*w_out_range), 1)

        # Время
        time_range = BREW_TIME_MAP[method]
        brew_time = int(random.uniform(*time_range))

        # Температура
        temp_range = TEMP_MAP[method]
        temperature = random_float(*temp_range)

        # Статус: 85% within_spec, 15% out_of_limits
        is_within_spec = random.random() < WITHIN_SPEC_RATIO

        if is_within_spec:
            status = "within_spec"
            tds = round(random.uniform(*TDS_WITHIN_SPEC), 2)
            # Экстракция = (weight_out * tds) / weight_in
            extraction = round((weight_out * tds) / weight_in, 2)
            # Гарантируем, что extraction в 18-22%
            extraction = max(18.0, min(22.0, extraction))
        else:
            status = "out_of_limits"
            # Чередуем недо- и переэкстракцию
            if random.random() < 0.5:
                tds = round(random.uniform(*TDS_OUT_OF_LIMITS_LOW), 2)
            else:
                tds = round(random.uniform(*TDS_OUT_OF_LIMITS_HIGH), 2)
            extraction = round((weight_out * tds) / weight_in, 2)

        records.append({
            "user_id": user_id,
            "recipe_id": None,
            "coffee_beans": beans,
            "brew_method": method,
            "weight_in": weight_in,
            "weight_out": weight_out,
            "brew_time": brew_time,
            "temperature": temperature,
            "status": status,
            "extraction": extraction,
            "tds": tds,
            "created_at": created_at,
        })

    return records


def main():
    print("🔌 Инициализация базы данных...")
    init_database()
    session = init_db()

    try:
        # Ищем пользователя по telegram_id
        TARGET_TELEGRAM_ID = "7673563218"
        user = session.query(User).filter(
            User.telegram_id == TARGET_TELEGRAM_ID
        ).first()
        if not user:
            print(f"👤 Пользователь с telegram_id={TARGET_TELEGRAM_ID} не найден. Создаю...")
            user = User(
                telegram_id=TARGET_TELEGRAM_ID,
                name="Тестовый пользователь",
                username="test_user",
                role="personal",
            )
            session.add(user)
            session.flush()
            print(f"✅ Создан пользователь: id={user.id}, telegram_id={user.telegram_id}")

        print(f"👤 Найден пользователь: {user.name or user.telegram_id} (id={user.id})")

        # Удаляем старые тестовые данные BrewHistory для этого пользователя
        deleted = session.query(BrewHistory).filter(
            BrewHistory.user_id == user.id
        ).delete()
        if deleted:
            print(f"🗑️ Удалено старых записей: {deleted}")
        session.commit()

        # Генерируем новые
        records = generate_brew_history(user.id)
        print(f"📝 Генерация {len(records)} записей...")

        for data in records:
            record = BrewHistory(**data)
            session.add(record)

        session.commit()
        print(f"✅ Успешно добавлено {len(records)} записей в BrewHistory")

        # Статистика для проверки
        total = session.query(BrewHistory).filter(
            BrewHistory.user_id == user.id
        ).count()
        within = session.query(BrewHistory).filter(
            BrewHistory.user_id == user.id,
            BrewHistory.status == "within_spec",
        ).count()
        out_of = session.query(BrewHistory).filter(
            BrewHistory.user_id == user.id,
            BrewHistory.status == "out_of_limits",
        ).count()

        print(f"\n📊 Итоговая статистика для пользователя id={user.id}:")
        print(f"   Всего записей: {total}")
        print(f"   В рамках техкарты: {within} ({round(within/total*100)}%)")
        print(f"   Выход за лимиты: {out_of} ({round(out_of/total*100)}%)")
        print(f"   Стабильность: {round(within/total*100)}%")

        # Проверка GET /api/history
        print(f"\n🔍 Проверка: первые 3 записи из истории:")
        recent = (
            session.query(BrewHistory)
            .filter(BrewHistory.user_id == user.id)
            .order_by(BrewHistory.created_at.desc())
            .limit(3)
            .all()
        )
        for r in recent:
            print(f"   [{r.created_at.strftime('%d.%m %H:%M')}] "
                  f"{r.coffee_beans} | {r.brew_method} | "
                  f"{r.weight_in}г→{r.weight_out}г | "
                  f"{r.brew_time}с | {r.temperature}°C | "
                  f"Ext: {r.extraction}% | {r.status}")

    except Exception as e:
        session.rollback()
        print(f"❌ Ошибка: {e}")
        raise
    finally:
        session.close()

    print("\n✨ Готово! Эндпоинт GET /api/history теперь возвращает заполненные данные.")


if __name__ == "__main__":
    main()