const fastify = require('fastify')({ logger: true });
const path = require('path');

// Регистрация плагина для раздачи статики фронтенда (HTML/JS/CSS)
fastify.register(require('@fastify/static'), {
  root: path.join(__dirname, 'public'),
  prefix: '/', 
});

// Тестовый эндпоинт проверки статуса
fastify.get('/api/health', async (request, reply) => {
  return { status: 'OK', message: 'Aikiduck backend is running' };
});

// Запуск сервера
const start = async () => {
  try {
    const port = process.env.PORT || 8080;
    await fastify.listen({ port: parseInt(port), host: '0.0.0.0' });
    fastify.log.info(`Сервер запущен на порту ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
