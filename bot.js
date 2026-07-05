// ========== ПОДКЛЮЧЕНИЕ БИБЛИОТЕК ==========
const { Bot, Keyboard } = require('@maxhub/max-bot-api');
require('dotenv').config();

// ========== ИМПОРТ МОДУЛЕЙ ==========
const { getUserId } = require('./utils/getUserId');
const { userStates } = require('./services/states');
const { showWelcome } = require('./handlers/client/welcome');
const { showMasters } = require('./handlers/client/masters');
const { showServices } = require('./handlers/client/services');
const { showCalendar } = require('./handlers/client/calendar');
const { showTimeSlots } = require('./handlers/client/time');

// ========== СОЗДАНИЕ БОТА ==========
const BOT_TOKEN = process.env.MAX_BOT_API_TOKEN;
const bot = new Bot(BOT_TOKEN, {
  apiBaseUrl: process.env.MAX_API_BASE_URL || 'https://platform-api2.max.ru',
});

// ========== ОБРАБОТЧИКИ СОБЫТИЙ ==========

// Стартовое событие
bot.on('bot_started', async (ctx) => {
  const userId = getUserId(ctx);
  console.log(`\n🚀 bot_started | userId: ${userId}`);
  await showWelcome(ctx, userId, userStates);
});

// Команда /start
bot.command('start', async (ctx) => {
  const userId = getUserId(ctx);
  console.log(`\n🚀 /start | userId: ${userId}`);
  await showWelcome(ctx, userId, userStates);
});

// Callback-кнопки
bot.on('message_callback', async (ctx) => {
  const data = ctx.callback.payload;
  const userId = getUserId(ctx);

  console.log(`\n🔘 КНОПКА: ${data} | userId: ${userId}`);

  if (!userId) return;

  // Возврат в главное меню
  if (data === 'start') {
    await showWelcome(ctx, userId, userStates);
    return;
  }

  // Выбор филиала
  if (data.startsWith('branch_')) {
    const branchId = parseInt(data.replace('branch_', ''));
    console.log(`📍 Выбран филиал: ${branchId}`);

    const { showMasters } = require('./handlers/client/masters');
    await showMasters(ctx, userId, userStates, branchId);
    return;
  }
  // Выбор мастера
  if (data.startsWith('master_')) {
    const masterId = parseInt(data.replace('master_', ''));
    console.log(`💇 Выбран мастер: ${masterId}`);
    await showServices(ctx, userId, userStates, masterId);
    return;
  }
  // Выбор услуги
  if (data.startsWith('service_')) {
    const serviceId = parseInt(data.replace('service_', ''));
    console.log(`💈 Выбрана услуга: ${serviceId}`);

    // Сохраняем услугу в состоянии
    const state = userStates.get(userId) || {};
    state.service_id = serviceId;
    userStates.set(userId, state);

    // Показываем календарь
    await showCalendar(ctx, userId, userStates);
    return;
  }
  // Выбор даты
  if (data.startsWith('date_')) {
    const dateStr = data.replace('date_', '');
    console.log(`📅 Выбрана дата: ${dateStr}`);
    await showTimeSlots(ctx, userId, userStates, dateStr);
    return;
  }
  // Возврат к календарю
  if (data === 'back_to_calendar') {
    console.log(`📅 Возврат к календарю`);
    await showCalendar(ctx, userId, userStates);
    return;
  }
  // Заглушка для категорий (не кликабельные)
  if (data === 'noop') {
    return;
  }
  // Мои записи
  if (data === 'my_bookings') {
    console.log(`📋 Запрос моих записей`);
    await ctx.reply(
      `📋 *Мои записи*\n\nУ вас пока нет активных записей.\n\nЗапишитесь в один из наших салонов!`,
      {
        attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'start')]])],
      }
    );
    return;
  }

  // О салоне
  if (data === 'about') {
    await ctx.reply(
      `ℹ️ *О салоне "Ножницы&Ко"*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Мы — сеть салонов красоты в Екатеринбурге.\n\n` +
        `✨ *Наши преимущества:*\n` +
        `• Опытные мастера (от 4 до 10 лет)\n` +
        `• Премиальная косметика\n` +
        `• 3 удобных филиала в разных районах\n` +
        `• Онлайн-запись 24/7\n` +
        `• Программа лояльности\n\n` +
        `📞 *Контакты:*\n` +
        `• Центральный: +7 (343) 100-10-10\n` +
        `• Северный: +7 (343) 200-20-20\n` +
        `• Южный: +7 (343) 300-30-30\n\n` +
        `💚 Ждём вас!`,
      {
        attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'start')]])],
      }
    );
    return;
  }

  // По умолчанию — назад в меню
  await ctx.reply('Команда не распознана.', {
    attachments: [
      Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В главное меню', 'start')]]),
    ],
  });
});

// Текстовые сообщения
bot.on('message_created', async (ctx) => {
  const text = ctx.message?.body?.text || '';
  const userId = getUserId(ctx);

  console.log(`\n📩 СООБЩЕНИЕ: "${text}" | userId: ${userId}`);

  if (text.startsWith('/')) return;
  if (!userId) return;

  await ctx.reply('Я понимаю только команды из меню. Выберите действие:', {
    attachments: [
      Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
    ],
  });
});

// ========== ЗАПУСК ==========
bot.start();
console.log('\n' + '='.repeat(50));
console.log('✂️ Ножницы&Ко — бот запущен!');
console.log('='.repeat(50));
