const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) throw new Error('Укажите DATABASE_URL отдельной тестовой базы');
const app = require('../server');
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const ids = [];

after(async () => {
  await db.query('DELETE FROM sessions WHERE id = ANY($1::integer[])', [ids]);
  await db.end();
  await app.close();
});

test('чекин сохраняется в PostgreSQL и повторный запрос обновляет одну запись', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/sessions' });
  assert.equal(created.statusCode, 201);
  const { id } = created.json();
  ids.push(id);
  const text = "Не могу начать; '); DROP TABLE sessions; --";
  const url = `/api/sessions/${id}/state`;
  let response = await app.inject({ method: 'POST', url, payload: {
    emotions: ['ANXIETY', 'CHAOS', 'GUILT', 'FATIGUE'], user_text: text,
  } });
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().user_text, text);
  let result = await db.query('SELECT emotion::text[] AS emotion, user_text FROM session_states WHERE session_id = $1', [id]);
  assert.deepEqual(result.rows[0].emotion, ['ANXIETY', 'CHAOS', 'GUILT', 'FATIGUE']);
  assert.equal(result.rows[0].user_text, text);
  response = await app.inject({ method: 'POST', url, payload: { emotions: ['FROZEN'] } });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json().emotions, ['FROZEN']);
  assert.equal(response.json().user_text, '');
  result = await db.query('SELECT count(*)::int AS count FROM session_states WHERE session_id = $1', [id]);
  assert.equal(result.rows[0].count, 1);
});

test('JSON Schema отклоняет некорректный выбор до записи в базу', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/sessions' });
  const { id } = created.json(); ids.push(id);
  for (const payload of [
    {}, { emotions: [] }, { emotions: ['UNKNOWN'] },
    { emotions: ['ANXIETY', 'ANXIETY'] }, { emotions: 'ANXIETY' },
    { emotions: ['ANXIETY', 'CHAOS', 'GUILT', 'FATIGUE', 'FROZEN'] },
    { emotions: ['ANXIETY'], user_text: 'x'.repeat(1001) },
  ]) {
    const response = await app.inject({ method: 'POST', url: `/api/sessions/${id}/state`, payload });
    assert.equal(response.statusCode, 400, JSON.stringify(payload));
  }
  const result = await db.query('SELECT count(*)::int AS count FROM session_states WHERE session_id = $1', [id]);
  assert.equal(result.rows[0].count, 0);
  for (const invalid of ['0', '-1', 'abc', '2147483648']) {
    const response = await app.inject({ method: 'POST', url: `/api/sessions/${invalid}/state`, payload: { emotions: ['SHAME'] } });
    assert.equal(response.statusCode, 400);
  }
});

test('отсутствующая сессия возвращает 404', async () => {
  const created = await app.inject({ method: 'POST', url: '/api/sessions' });
  const { id } = created.json();
  await db.query('DELETE FROM sessions WHERE id = $1', [id]);
  const response = await app.inject({ method: 'POST', url: `/api/sessions/${id}/state`, payload: { emotions: ['SHAME'] } });
  assert.equal(response.statusCode, 404);
});
