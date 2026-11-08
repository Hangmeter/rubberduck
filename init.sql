-- 1. Создаем перечисление для 10 психологических состояний от serlysenko
CREATE TYPE emotion_type AS ENUM (
    'ANXIETY',
    'GUILT',
    'SHAME',
    'FATIGUE',
    'CHAOS',
    'AVERSION',
    'APATHY',
    'IRRITATION',
    'FROZEN',
    'PERFECTIONISM'
);

-- 2. Базовая таблица сессий чекина
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Шаг 1: Фиксация состояния (Связь 1-к-1 с сессией)
CREATE TABLE session_states (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    emotion emotion_type[] NOT NULL, -- Жесткая проверка на уровне БД
    user_text TEXT,                -- Описание «что со мной происходит»
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Шаг 2: Поиск скрытого смысла / защитной функции (Связь 1-к-1)
CREATE TABLE session_insights (
    session_id INTEGER PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    avoided_fear TEXT NOT NULL,    -- Чего боимся / что избегаем
    protective_func TEXT NOT NULL, -- Как это состояние нас защищает
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Шаг 3: Микро-движения (Связь 1-ко-многим, можно запланировать несколько)
CREATE TABLE micro_actions (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    action_text TEXT NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Создаем индекс для быстрого поиска микро-действий конкретной сессии
CREATE INDEX idx_micro_actions_session ON micro_actions(session_id);
