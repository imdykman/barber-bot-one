const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getMasters,
  getServicesByMaster,
  getFreeTimeSlots,
  createBooking,
  getBookingWithClient,
} = require('../../database/database');
const { notifyNewBooking } = require('../../services/email');

// 1. Выбор мастера (первый шаг)
async function showMasterSelection(ctx, userId) {
  const masters = getMasters();
  if (!masters || masters.length === 0) {
    await ctx.reply('❌ Нет доступных мастеров.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'admin_menu')]]),
      ],
    });
    return;
  }

  const buttons = masters.map((m) => [
    Keyboard.button.callback(`${m.name} (${m.specialty || 'Мастер'})`, `admin_book_master_${m.id}`),
  ]);
  buttons.push([Keyboard.button.callback('❌ Отмена', 'admin_menu')]);

  await ctx.reply('💇 Выберите мастера для записи:', {
    attachments: [Keyboard.inlineKeyboard(buttons)],
  });
}

// 2. Выбор услуги
async function showServiceSelection(ctx, userId, masterId) {
  const services = getServicesByMaster(masterId);
  if (!services || services.length === 0) {
    await ctx.reply('❌ У этого мастера пока нет услуг.', {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ Назад к мастерам', 'admin_create_booking')],
        ]),
      ],
    });
    return;
  }

  const buttons = services.map((s) => [
    Keyboard.button.callback(`${s.name} (${s.price}₽)`, `admin_book_service_${s.id}`),
  ]);
  buttons.push([Keyboard.button.callback('⬅️ Назад к мастерам', 'admin_create_booking')]);

  await ctx.reply('💈 Выберите услугу:', {
    attachments: [Keyboard.inlineKeyboard(buttons)],
  });
}

// 3. Выбор даты
async function showDateSelection(ctx, userId) {
  const buttons = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
    });
    buttons.push([Keyboard.button.callback(displayDate, `admin_book_date_${dateStr}`)]);
  }
  buttons.push([Keyboard.button.callback('⬅️ Назад', 'admin_create_booking')]);

  await ctx.reply('📅 Выберите дату:', {
    attachments: [Keyboard.inlineKeyboard(buttons)],
  });
}

// 4. Выбор времени
async function showTimeSelection(ctx, userId, date) {
  const { userStates } = require('../../services/states');
  const state = userStates.get(userId) || {};

  if (!state.master_id || !state.service_id) {
    await ctx.reply('❌ Ошибка: не выбран мастер или услуга.');
    return;
  }

  const slots = getFreeTimeSlots(state.master_id, date, state.service_id);

  if (slots.length === 0) {
    await ctx.reply('❌ Нет свободных окон на эту дату. Выберите другую.', {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ Назад к датам', 'admin_create_booking')],
        ]),
      ],
    });
    return;
  }

  // Группируем слоты по 3 в ряд для удобства
  const buttons = [];
  for (let i = 0; i < slots.length; i += 3) {
    buttons.push(
      slots.slice(i, i + 3).map((time) => Keyboard.button.callback(time, `admin_book_time_${time}`))
    );
  }
  buttons.push([Keyboard.button.callback('⬅️ Назад к датам', 'admin_create_booking')]);

  await ctx.reply(`🕐 Выберите время на ${date}:`, {
    attachments: [Keyboard.inlineKeyboard(buttons)],
  });
}

// 5. Запрос имени клиента (переводит в режим ввода текста)
async function showClientForm(ctx, userId) {
  const { userStates } = require('../../services/states');
  userStates.set(userId, {
    mode: 'admin_create_booking_client_name',
    ...userStates.get(userId), // сохраняем предыдущие данные (master_id, service_id, date, time)
  });

  await ctx.reply('👤 Введите имя клиента:');
}

// 6. Финальное создание записи (вызывается из routes/messages.js после ввода телефона)
async function createBookingByAdmin(ctx, userId, clientName, clientPhone) {
  const { userStates } = require('../../services/states');
  const state = userStates.get(userId) || {};

  try {
    const bookingId = createBooking(
      state.master_id,
      state.service_id,
      clientName,
      clientPhone,
      state.booking_date,
      state.booking_time,
      null // user_id для админской записи пока null
    );

    userStates.delete(userId); // Очищаем состояние

    const bookingDetails = getBookingWithClient(bookingId);
    if (bookingDetails) {
      await notifyNewBooking(bookingDetails, null);
    }

    await ctx.reply(
      `✅ *Запись успешно создана!*\n\n` +
        `👤 Клиент: ${clientName}\n` +
        `📱 Телефон: ${clientPhone}\n` +
        `📅 Дата: ${state.booking_date} в ${state.booking_time}\n\n` +
        `Уведомление отправлено на почту.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 В админку', 'admin_menu')]]),
        ],
      }
    );
  } catch (error) {
    console.error('❌ Ошибка создания записи админом:', error);
    await ctx.reply('❌ Произошла ошибка при создании записи. Проверьте логи.');
  }
}

module.exports = {
  showMasterSelection,
  showServiceSelection,
  showDateSelection,
  showTimeSelection,
  showClientForm,
  createBookingByAdmin,
};
