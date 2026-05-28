# Используем официальный Python-образ
FROM python:3.12-slim

# Устанавливаем Node.js для сборки фронтенда
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем и устанавливаем зависимости Python
# (build context = корень репозитория, поэтому пути с backend/)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь исходный код бэкенда (включая фронтенд)
COPY backend/ .

# Собираем фронтенд
RUN cd frontend && npm install && node node_modules/vite/bin/vite.js build && echo "=== VITE BUILD COMPLETE ===" && ls -la dist/

# Запускаем бота
CMD ["python", "main.py"]