const { Keyboard } = require('@maxhub/max-bot-api');
const { getMaster, getBookingWithClient, createBooking, db } = require('../../database/database');

// Показ деталей записи перед подтверждением
async function showBookingConfirmation(ctx, userId, userStates, time) {
  const state = userStates.get(userId);

  if (!state || !state.master_id || !state.service_id || !state.booking_date) {
    await ctx.reply('❌ Ошибка: не все данные выбраны.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  const master = getMaster(state.master_id);

  // Получаем услугу с ценой для конкретного мастера
  const serviceWithPrice = db
    .prepare(
      `
    SELECT s.*, ms.price, ms.duration_minutes
    FROM services s
    JOIN master_services ms ON s.id = ms.service_id
    WHERE ms.master_id = ? AND s.id = ?
  `
    )
    .get(state.master_id, state.service_id);

  if (!serviceWithPrice) {
    await ctx.reply('❌ Ошибка: услуга не найдена для этого мастера.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  const service = serviceWithPrice;
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
    [Keyboard.button.callback('✅ Подтвердить запись', 'confirm_booking_action')],
    [Keyboard.button.callback('⬅️ Выбрать другое время', 'back_to_calendar')],
  ]);

  await ctx.reply(
    `📋 *Детали записи*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💇 *Мастер:* ${master.name}\n` +
      `✨ ${master.specialty}\n\n` +
      `💈 *Услуга:* ${service.name}\n` +
      `💰 *Стоимость:* ${service.price} ₽\n` +
      `⏱️ *Длительность:* ${service.duration_minutes} мин\n\n` +
      `📅 *Дата:* ${displayDate}\n` +
      `🕐 *Время:* ${time}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Для завершения записи нажмите кнопку подтверждения:`,
    { attachments: [keyboard] }
  );
}

// Финальное подтверждение и создание записи
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
    console.log('🔍 STATE перед записью:', JSON.stringify(state, null, 2));

    // 🆕 Создаём запись по новой сигнатуре (без branch_id и clientId)
    // createBooking(masterId, serviceId, clientName, clientPhone, date, time, userId)
    const bookingId = createBooking(
      state.master_id,
      state.service_id,
      state.client_name,
      state.client_phone,
      state.booking_date,
      state.booking_time,
      userId
    );

    const date = new Date(state.booking_date);
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });

    const master = getMaster(state.master_id);
    const serviceWithPrice = db
      .prepare(
        `
      SELECT s.*, ms.price, ms.duration_minutes
      FROM services s
      JOIN master_services ms ON s.id = ms.service_id
      WHERE ms.master_id = ? AND s.id = ?
    `
      )
      .get(state.master_id, state.service_id);

    const service = serviceWithPrice;

    // Очищаем состояние
    userStates.delete(userId);

    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('📋 Мои записи', 'my_bookings')],
      [Keyboard.button.callback('🏠 Главное меню', 'start')],
    ]);

    await ctx.reply(
      `✅ *Запись подтверждена!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 *Клиент:* ${state.client_name}\n` +
        `📱 *Телефон:* ${state.client_phone}\n\n` +
        `💇 *Мастер:* ${master.name}\n` +
        `💈 *Услуга:* ${service.name}\n\n` +
        `📅 *Дата:* ${displayDate}\n` +
        `🕐 *Время:* ${state.booking_time}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Ждём вас в Ножницы & One! 💚\n\n` +
        `Если нужно изменить или отменить запись — напишите нам.`,
      { attachments: [keyboard] }
    );

    console.log(
      `✅ Запись создана: ID ${bookingId}, клиент ${state.client_name}, мастер ${master.name}`
    );

    // Отправляем email админу
    try {
      const { notifyNewBooking } = require('../../services/email');
      const bookingWithDetails = getBookingWithClient(bookingId);
      if (bookingWithDetails) {
        await notifyNewBooking(bookingWithDetails, userId);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки email о новой записи:', error.message);
    }
  } catch (error) {
    console.error('❌ Ошибка создания записи:', error);
    await ctx.reply(
      `❌ Произошла ошибка при создании записи.\n\nПожалуйста, попробуйте ещё раз или свяжитесь с нами.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]]),
        ],
      }
    );
  }
}

module.exports = {
  showBookingConfirmation,
  confirmBooking,
};
