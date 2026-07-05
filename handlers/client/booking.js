const { Keyboard } = require('@maxhub/max-bot-api');
const { getService, getMaster, getBranch } = require('../../database/database');

async function showBookingConfirmation(ctx, userId, userStates, time) {
  const state = userStates.get(userId);

  if (!state || !state.master_id || !state.service_id || !state.booking_date) {
    await ctx.reply('❌ Ошибка: не все данные выбраны.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  const service = getService(state.service_id);
  const master = getMaster(state.master_id);
  const branch = getBranch(state.branch_id);

  // Форматируем дату
  const date = new Date(state.booking_date);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  // Сохраняем время в состоянии
  state.booking_time = time;
  userStates.set(userId, state);

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('✅ Подтвердить запись', 'confirm_booking')],
    [Keyboard.button.callback('⬅️ Выбрать другое время', 'back_to_calendar')],
  ]);

  await ctx.reply(
    `📋 *Подтверждение записи*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🏢 *Филиал:* ${branch.name}\n` +
      `📍 ${branch.address}\n\n` +
      `💇 *Мастер:* ${master.name}\n` +
      `✨ ${master.specialty}\n\n` +
      `💈 *Услуга:* ${service.name}\n` +
      `💰 *Стоимость:* ${service.price} ₽\n` +
      `⏱️ *Длительность:* ${service.duration_minutes} мин\n\n` +
      `📅 *Дата:* ${displayDate}\n` +
      `🕐 *Время:* ${time}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Проверьте детали и подтвердите запись:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showBookingConfirmation };
const { getOrCreateClient, createBooking } = require('../../database/database');

async function confirmBooking(ctx, userId, userStates) {
  const state = userStates.get(userId);

  if (
    !state ||
    !state.master_id ||
    !state.service_id ||
    !state.booking_date ||
    !state.booking_time
  ) {
    await ctx.reply('❌ Ошибка: не все данные выбраны.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  try {
    // Получаем или создаём клиента
    const client = getOrCreateClient(userId);

    // Создаём запись
    const booking = createBooking(
      client.id,
      state.master_id,
      state.service_id,
      state.branch_id,
      state.booking_date,
      state.booking_time
    );

    // Форматируем дату для сообщения
    const date = new Date(state.booking_date);
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });

    const service = getService(state.service_id);
    const master = getMaster(state.master_id);
    const branch = getBranch(state.branch_id);

    // Очищаем состояние
    userStates.delete(userId);

    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📋 Мои записи', 'my_bookings')],
      [Keyboard.button.callback('🏠 Главное меню', 'start')],
    ]);

    await ctx.reply(
      `✅ *Запись подтверждена!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🏢 ${branch.name}\n` +
        `📍 ${branch.address}\n\n` +
        `💇 ${master.name}\n` +
        `💈 ${service.name}\n\n` +
        `📅 ${displayDate}\n` +
        `🕐 ${state.booking_time}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Ждём вас! 💚\n\n` +
        `Если нужно изменить или отменить запись — напишите нам.`,
      { attachments: [keyboard] }
    );

    console.log(
      `✅ Запись создана: ID ${booking.id}, клиент ${client.id}, мастер ${master.name}, ${state.booking_date} ${state.booking_time}`
    );
  } catch (error) {
    console.error('❌ Ошибка создания записи:', error);

    await ctx.reply(
      `❌ Произошла ошибка при создании записи.\n\n` +
        `Пожалуйста, попробуйте ещё раз или свяжитесь с нами.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]]),
        ],
      }
    );
  }
}

module.exports = { showBookingConfirmation, confirmBooking };
