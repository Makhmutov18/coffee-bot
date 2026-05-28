# ☕ Coffee Recipe Bot

Telegram-бот для записи рецептов альтернативного кофе (V60, Hario Switch) с расчётом экстракции по системе Golden Cup.

## 🚀 Деплой на Yandex Cloud

### Шаг 1. Создать виртуальную машину (VM)

1. Зайди в [Yandex Cloud Console](https://console.cloud.yandex.ru)
2. Создай каталог (если нет)
3. Перейди в **Compute Cloud → Виртуальные машины**
4. Нажми **Создать ВМ**
   - **Имя:** `coffee-bot`
   - **Платформа:** Intel Ice Lake
   - **Образ:** Ubuntu 22.04 LTS
   - **Тип:** `s2.micro` (2 vCPU, 4 GB RAM) — хватит с запасом
   - **Диск:** 15 GB HDD
   - **Сеть:** Публичный IP (автоматически)
   - **Доступ:** Укажи SSH-ключ (сгенерируй через `ssh-keygen`)

### Шаг 2. Подключиться к серверу

```bash
ssh -i ~/.ssh/id_rsa yc-user@<IP-адрес-ВМ>
```

### Шаг 3. Установить Docker

```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2
sudo usermod -aG docker $USER
# Выйди и зайди заново (или выполни: newgrp docker)
```

### Шаг 4. Скопировать проект на сервер

**Вариант A — через Git (рекомендую):**
```bash
# Создай репозиторий на GitHub/GitLab, запушь код, затем на сервере:
git clone <URL-твоего-репозитория> coffee-bot
cd coffee-bot/backend
```

**Вариант B — через SCP (с локальной машины):**
```bash
# На локальной машине:
cd coffee-bot
scp -r backend yc-user@<IP-адрес-ВМ>:~/
```

### Шаг 5. Создать .env с токеном

```bash
cd ~/backend
nano .env
```

Вставь:
```
BOT_TOKEN=твой_токен_от_BotFather
```

### Шаг 6. Запустить бота

```bash
docker compose up -d --build
```

Проверить логи:
```bash
docker compose logs -f
```

### Шаг 7. Настроить автозапуск (systemd)

Если ВМ перезагрузится, Docker автоматически запустит контейнер (`restart: unless-stopped`).

---

## 🛠 Локальный запуск (без Docker)

```bash
cd backend
pip install -r requirements.txt
# Укажи токен в .env
python main.py
```

## 📁 Структура проекта

```
coffee-bot/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── database.py          # Модели SQLAlchemy + функция расчёта экстракции
│   │   └── bot/
│   │       ├── __init__.py
│   │       └── handlers.py      # Хендлеры команд бота
│   ├── data/                    # SQLite БД (создаётся автоматически)
│   ├── main.py                  # Точка входа
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   └── .env                     # Токен бота
└── frontend/                    # React Mini App (будет позже)
    ├── public/
    └── src/
        ├── components/
        ├── pages/
        └── api/
```

## 📋 Команды бота

- `/start` — приветствие
- `/help` — справка
- `/add_recipe` — добавить новый рецепт (пошагово)
- `/recipes` — список последних 5 рецептов
- `/cancel` — отменить добавление