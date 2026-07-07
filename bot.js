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
const {
  showBookingConfirmation,
  confirmBooking,
  requestContact,
} = require('./handlers/client/booking');
const {
  showMyBookings,
  showCancelConfirmation,
  confirmCancelBooking,
} = require('./handlers/client/my-bookings');
const { isAdmin } = require('./utils/isAdmin');
const { showAdminMenu } = require('./handlers/admin/index');
const { showTodayBookings } = require('./handlers/admin/today-bookings');
const { showStats } = require('./handlers/admin/stats');
const { showAllBookings } = require('./handlers/admin/all-bookings');
const {
  showBookingDetails,
  applyStatusChange,
  startReschedule,
  showRescheduleTime,
  applyReschedule,
} = require('./handlers/admin/booking-details');

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
  // Админ-меню
  if (data === 'admin_menu') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    await showAdminMenu(ctx, userId);
    return;
  }

  // Записи на сегодня
  if (data === 'admin_today') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`📅 Админ: записи на сегодня`);
    await showTodayBookings(ctx, userId);
    return;
  }

  // Статистика
  if (data === 'admin_stats') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`📊 Админ: статистика`);
    await showStats(ctx, userId);
    return;
  }
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
  // Выбор времени
  if (data.startsWith('time_')) {
    const time = data.replace('time_', '');
    console.log(`🕐 Выбрано время: ${time}`);
    await showBookingConfirmation(ctx, userId, userStates, time);
    return;
  }

  // Согласие с политикой конфиденциальности
  if (data === 'privacy_agree') {
    console.log(`🔒 Согласие с политикой конфиденциальности`);
    const state = userStates.get(userId) || {};
    state.privacy_agreed = true;
    userStates.set(userId, state);
    await requestContact(ctx, userId, userStates);
    return;
  }

  // Возврат к подтверждению (без согласия)
  if (data === 'back_to_confirmation') {
    console.log(`⬅️ Возврат к подтверждению`);
    const state = userStates.get(userId);
    if (state && state.booking_time) {
      await showBookingConfirmation(ctx, userId, userStates, state.booking_time);
    } else {
      await showWelcome(ctx, userId, userStates);
    }
    return;
  }

  // Мои записи
  if (data === 'my_bookings') {
    console.log(`📋 Мои записи`);
    await showMyBookings(ctx, userId, userStates);
    return;
  }

  // Запрос отмены записи
  if (data.startsWith('cancel_')) {
    const bookingId = parseInt(data.replace('cancel_', ''));
    console.log(`❌ Запрос отмены записи: ${bookingId}`);
    await showCancelConfirmation(ctx, userId, userStates, bookingId);
    return;
  }

  // Подтверждение отмены записи
  if (data.startsWith('confirm_cancel_')) {
    const bookingId = parseInt(data.replace('confirm_cancel_', ''));
    console.log(`✅ Подтверждение отмены записи: ${bookingId}`);
    await confirmCancelBooking(ctx, userId, userStates, bookingId);
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
  // Все записи
  if (data === 'admin_all_bookings') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`📋 Админ: все записи`);
    await showAllBookings(ctx, userId);
    return;
  }

  // Фильтр по дате
  if (data === 'admin_filter_date') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`📅 Админ: фильтр по дате`);

    // Генерируем кнопки на ближайшие 7 дней
    const dateButtons = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
      dateButtons.push([Keyboard.button.callback(displayDate, `admin_date_${dateStr}`)]);
    }

    const keyboard = Keyboard.inlineKeyboard([
      ...dateButtons,
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('📅 Выберите дату:', { attachments: [keyboard] });
    return;
  }

  // Обработка выбранной даты
  if (data.startsWith('admin_date_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const date = data.replace('admin_date_', '');
    console.log(`📅 Админ: фильтр по дате ${date}`);
    await showAllBookings(ctx, userId, { date });
    return;
  }

  // Фильтр по мастеру
  if (data === 'admin_filter_master') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`💇 Админ: фильтр по мастеру`);

    const { getMasters } = require('./database/database');
    const masters = getMasters();

    const masterButtons = masters.map((master) => [
      Keyboard.button.callback(master.name, `admin_master_${master.id}`),
    ]);

    const keyboard = Keyboard.inlineKeyboard([
      ...masterButtons,
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('💇 Выберите мастера:', { attachments: [keyboard] });
    return;
  }

  // Обработка выбранного мастера
  if (data.startsWith('admin_master_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const masterId = data.replace('admin_master_', '');
    console.log(`💇 Админ: фильтр по мастеру ${masterId}`);
    await showAllBookings(ctx, userId, { master_id: masterId });
    return;
  }

  // Фильтр по филиалу
  if (data === 'admin_filter_branch') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`🏢 Админ: фильтр по филиалу`);

    const { getBranches } = require('./database/database');
    const branches = getBranches();

    const branchButtons = branches.map((branch) => [
      Keyboard.button.callback(branch.name, `admin_branch_${branch.id}`),
    ]);

    const keyboard = Keyboard.inlineKeyboard([
      ...branchButtons,
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('🏢 Выберите филиал:', { attachments: [keyboard] });
    return;
  }

  // Обработка выбранного филиала
  if (data.startsWith('admin_branch_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const branchId = data.replace('admin_branch_', '');
    console.log(`🏢 Админ: фильтр по филиалу ${branchId}`);
    await showAllBookings(ctx, userId, { branch_id: branchId });
    return;
  }

  // Фильтр по статусу
  if (data === 'admin_filter_status') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`📌 Админ: фильтр по статусу`);

    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('✅ Подтверждено', 'admin_status_confirmed')],
      [Keyboard.button.callback('❌ Отменено', 'admin_status_cancelled')],
      [Keyboard.button.callback('⏳ Ожидает', 'admin_status_pending')],
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('📌 Выберите статус:', { attachments: [keyboard] });
    return;
  }

  // Обработка выбранного статуса
  if (data.startsWith('admin_status_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const status = data.replace('admin_status_', '');
    console.log(`📌 Админ: фильтр по статусу ${status}`);
    await showAllBookings(ctx, userId, { status });
    return;
  }

  // Поиск по имени/телефону
  if (data === 'admin_filter_search') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`🔎 Админ: поиск по имени/телефону`);

    // Устанавливаем состояние ожидания ввода
    const state = userStates.get(userId) || {};
    state.admin_search_mode = true;
    userStates.set(userId, state);

    await ctx.reply(
      `🔎 *Поиск по имени или телефону*\n\n` +
        `Введите имя клиента или номер телефона:\n\n` +
        `Примеры:\n` +
        `  • Иван\n` +
        `  • +79091234567\n` +
        `  • 9091234567`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_all_bookings')]]),
        ],
      }
    );
    return;
  }
  // Детали записи
  if (data.startsWith('admin_booking_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const bookingId = parseInt(data.replace('admin_booking_', ''));
    console.log(`📋 Админ: детали записи ${bookingId}`);
    await showBookingDetails(ctx, userId, bookingId);
    return;
  }

  // Подтвердить запись
  if (data.startsWith('admin_confirm_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const bookingId = parseInt(data.replace('admin_confirm_', ''));
    console.log(`✅ Админ: подтверждение записи ${bookingId}`);
    await applyStatusChange(ctx, userId, bookingId, 'confirmed');
    return;
  }

  // Отменить запись
  if (data.startsWith('admin_cancel_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const bookingId = parseInt(data.replace('admin_cancel_', ''));
    console.log(`❌ Админ: отмена записи ${bookingId}`);
    await applyStatusChange(ctx, userId, bookingId, 'cancelled');
    return;
  }

  // Завершить запись
  if (data.startsWith('admin_complete_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const bookingId = parseInt(data.replace('admin_complete_', ''));
    console.log(`✓ Админ: завершение записи ${bookingId}`);
    await applyStatusChange(ctx, userId, bookingId, 'completed');
    return;
  }

  // Перенос записи — начало
  if (
    data.startsWith('admin_reschedule_') &&
    !data.includes('_date_') &&
    !data.includes('_time_')
  ) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const bookingId = parseInt(data.replace('admin_reschedule_', ''));
    console.log(`📅 Админ: перенос записи ${bookingId}`);
    await startReschedule(ctx, userId, bookingId);
    return;
  }

  // Перенос записи — выбор даты
  if (data.startsWith('admin_reschedule_date_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const date = data.replace('admin_reschedule_date_', '');
    console.log(`📅 Админ: перенос на дату ${date}`);
    await showRescheduleTime(ctx, userId, date);
    return;
  }

  // Перенос записи — выбор времени
  if (data.startsWith('admin_reschedule_time_')) {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    const time = data.replace('admin_reschedule_time_', '');
    console.log(`🕐 Админ: перенос на время ${time}`);
    await applyReschedule(ctx, userId, time);
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

  if (!userId) return;

  // ========== ПОИСК В АДМИНКЕ ==========
  const state = userStates.get(userId);
  if (state?.admin_search_mode && isAdmin(userId)) {
    console.log(`🔎 Админ: поиск "${text}"`);
    state.admin_search_mode = false;
    userStates.set(userId, state);
    await showAllBookings(ctx, userId, { search: text });
    return;
  }

  // ========== КОМАНДА /admin ==========
  if (text === '/admin') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return;
    }
    console.log(`🔐 Вход в админку: ${userId}`);
    await showAdminMenu(ctx, userId);
    return;
  }

  // Остальные команды игнорируем
  if (text.startsWith('/')) return;

  // ========== ОБРАБОТКА КОНТАКТА ==========
  const contactAttachment = ctx.message?.body?.attachments?.find((att) => att.type === 'contact');

  if (contactAttachment) {
    console.log(`📱 Получен контакт`);

    const contactInfo = ctx.contactInfo;

    if (contactInfo) {
      console.log(`📱 Контакт:`, contactInfo);

      const state = userStates.get(userId);

      if (state && state.privacy_agreed) {
        const name = contactInfo.fullName || 'Клиент';
        const phone = contactInfo.tel || '';

        console.log(`👤 Имя: ${name}, Телефон: ${phone}`);

        state.client_name = name;
        state.client_phone = phone.startsWith('+') ? phone : `+${phone}`;
        userStates.set(userId, state);

        await confirmBooking(ctx, userId, userStates);
        return;
      } else {
        console.log(`⚠️ Состояние не найдено или privacy_agreed не установлен`);
        console.log(`Состояние:`, state);
      }
    }
  }

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
