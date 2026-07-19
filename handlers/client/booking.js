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

  state.booking_time = time;
  userStates.set(userId, state);

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('✅ Согласен с политикой конфиденциальности', 'privacy_agree')],
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
      `🔒 *Политика конфиденциальности:*\n` +
      `https://one.max-dialog.ru/privacy\n\n` +
      `Для завершения записи необходимо согласие на обработку персональных данных:`,
    { attachments: [keyboard] }
  );
}

// Запрос контакта у пользователя
async function requestContact(ctx, userId, userStates) {
  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.requestContact('📱 Отправить контакт')],
    [Keyboard.button.callback('⬅️ Назад', 'back_to_confirmation')],
  ]);

  await ctx.reply(
    `📱 *Отправьте ваш контакт*\n\n` +
      `Нажмите кнопку ниже, чтобы отправить ваш контакт из MAX.\n` +
      `Это нужно для подтверждения записи и связи с вами.`,
    { attachments: [keyboard] }
  );
}

// Финальное подтверждение и создание записи (вызывается после получения контакта)
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

  if (!state.client_name || !state.client_phone) {
    await ctx.reply('❌ Ошибка: не получен контакт. Попробуйте ещё раз.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  try {
    console.log('🔍 STATE перед записью:', JSON.stringify(state, null, 2));

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
  requestContact,
};
