// Устанавливаем часовой пояс Екатеринбурга
process.env.TZ = 'Asia/Yekaterinburg';
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use(express.static('public'));

// API routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Статические страницы (docs)
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'privacy.html'));
});

app.get('/offer', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'offer.html'));
});
app.get('/docs/privacy.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'privacy.html'));
});

app.get('/docs/terms.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'terms.html'));
});
// Главная страница
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Отдаем index.html для любого неизвестного маршрута (для SPA-роутинга)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
// Запуск сервера
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('✂️ Ножницы & One — Веб-сервер запущен!');
  console.log(`🌐 Сайт: http://localhost:${PORT}`);
  console.log(`📱 API:  http://localhost:${PORT}/api`);
  console.log('='.repeat(50) + '\n');
});
