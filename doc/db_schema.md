# 🗄️ Схема данных PostgreSQL (Aikiduck)

## Перечисления (ENUM)
* `emotion_type`: Ограниченный список 10 психологических состояний сессии (`ANXIETY`, `GUILT`, `SHAME`, `FATIGUE`, `CHAOS`, `AVERSION`, `APATHY`, `IRRITATION`, `FROZEN`, `PERFECTIONISM`).

## Таблицы

### `sessions`
Базовая таблица для инициации чекинов.
* `id` (SERIAL, PK): Уникальный идентификатор сессии.
* `created_at` (TIMESTAMP): Время старта сессии.
