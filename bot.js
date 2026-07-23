// ========== ПОДКЛЮЧЕНИЕ БИБЛИОТЕК ==========
require('dotenv').config();
const { Bot, Keyboard } = require('@maxhub/max-bot-api');

// ========== ИМПОРТ МОДУЛЕЙ ==========
const { getUserId } = require('./utils/getUserId');
const { userStates } = require('./services/states');
const { isAdmin } = require('./utils/isAdmin');

// ========== СОЗДАНИЕ БОТА ==========
const bot = new Bot(process.env.MAX_BOT_API_TOKEN, {
  apiBaseUrl: process.env.MAX_API_BASE_URL || 'https://platform-api2.max.ru',
});

// ========== ОБЩИЕ ЗАВИСИМОСТИ ==========
const deps = { getUserId, userStates, isAdmin };

// ========== ПОДКЛЮЧЕНИЕ РОУТЕРОВ ==========
require('./routes/commands').register(bot, deps);

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

// Callback-кнопки — делегируем роутерам
bot.on('message_callback', async (ctx) => {
  const data = ctx.callback.payload;
  const userId = getUserId(ctx);

  console.log(`\n🔘 КНОПКА: ${data} | userId: ${userId}`);

  if (!userId) return;

  // Пытаемся обработать в админке
  if (await require('./routes/admin').handleCallback(ctx, data, userId, deps)) return;

  // Пытаемся обработать в клиентской части
  if (await require('./routes/client').handleCallback(ctx, data, userId, deps)) return;

  // Fallback
  await ctx.reply('Команда не распознана.', {
    attachments: [
      Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В главное меню', 'start')]]),
    ],
  });
});

// Текстовые сообщения — делегируем роутеру
bot.on('message_created', async (ctx) => {
  const text = ctx.message?.body?.text || '';
  const userId = getUserId(ctx);

  console.log(`\n📩 СООБЩЕНИЕ: "${text}" | userId: ${userId}`);

  if (!userId) return;

  await require('./routes/messages').handleMessage(ctx, text, userId, deps);
});
// ========== АВТООЧИСТКА СТАРЫХ СОСТОЯНИЙ ==========
const { cleanupOldStates } = require('./services/states');

// Очистка при старте
cleanupOldStates();

// Периодическая очистка (каждый час)
setInterval(
  () => {
    cleanupOldStates();
  },
  60 * 60 * 1000
);
// ========== ЗАПУСК ПЛАНИРОВЩИКА НАПОМИНАНИЙ ==========
const { startReminderScheduler } = require('./services/reminders');
startReminderScheduler(bot);
// ========== ЗАПУСК ==========
bot.start();
console.log('\n' + '='.repeat(50));
console.log('✂️ Ножницы & One — бот запущен!');
console.log('='.repeat(50));
