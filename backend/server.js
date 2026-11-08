// Сохраняем преобразование id в число, но не превращаем одиночную строку в массив.
const fastify = require('fastify')({ logger: true, ajv: { customOptions: { coerceTypes: true } } });
const path = require('path');
const { Pool } = require('pg');

// Один пул переиспользуется всеми запросами и закрывается вместе с сервером.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
fastify.addHook('onClose', async () => pool.end());

fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/',
});

fastify.get('/api/health', async () => {
  return { status: 'OK', message: 'Aikiduck backend is running' };
});

const emotions = [
  'ANXIETY', 'GUILT', 'SHAME', 'FATIGUE', 'CHAOS',
  'AVERSION', 'APATHY', 'IRRITATION', 'FROZEN', 'PERFECTIONISM',
];

fastify.post('/api/sessions', async (request, reply) => {
  const { rows } = await pool.query('INSERT INTO sessions DEFAULT VALUES RETURNING id');
  return reply.code(201).send(rows[0]);
});

// JSON Schema проверяет выбор до обращения к БД; pg передаёт массив параметром.
fastify.post('/api/sessions/:id/state', {
  schema: {
    params: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer', minimum: 1, maximum: 2147483647 } },
    },
    body: {
      type: 'object',
      required: ['emotions'],
      properties: {
        emotions: {
          type: 'array', minItems: 1, maxItems: 4, uniqueItems: true,
          items: { type: 'string', enum: emotions },
        },
        user_text: { type: 'string', maxLength: 1000, default: '' },
      },
    },
  },
}, async (request, reply) => {
  const { id } = request.params;
  const { emotions: selected, user_text } = request.body;
  try {
    // Повторный запрос безопасно заменяет состояние, например при повторе после сетевой ошибки.
    // text[] в RETURNING позволяет pg вернуть JSON-массив для пользовательского ENUM.
    const { rows } = await pool.query(`
      INSERT INTO session_states (session_id, emotion, user_text)
      VALUES ($1, $2::emotion_type[], $3)
      ON CONFLICT (session_id) DO UPDATE
      SET emotion = EXCLUDED.emotion, user_text = EXCLUDED.user_text,
          updated_at = CURRENT_TIMESTAMP
      RETURNING session_id, emotion::text[] AS emotions, user_text
    `, [id, selected, user_text]);
    return rows[0];
  } catch (err) {
    // FK проверяет существование сессии атомарно с записью состояния.
    if (err.code === '23503') {
      return reply.code(404).send({ message: 'Сессия не найдена' });
    }
    throw err;
  }
});

// Не возвращаем клиенту SQL и детали подключения при ошибках базы данных.
fastify.setErrorHandler((err, request, reply) => {
  if (err.statusCode && err.statusCode < 500) {
    return reply.code(err.statusCode).send({ message: err.message });
  }
  request.log.error(err);
  return reply.code(500).send({ message: 'Не удалось сохранить данные. Попробуйте ещё раз.' });
});

const start = async () => {
  try {
    const port = process.env.PORT || 8080;
    await fastify.listen({ port: parseInt(port), host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (require.main === module) start();
module.exports = fastify;
