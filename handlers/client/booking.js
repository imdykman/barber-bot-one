const { Keyboard } = require('@maxhub/max-bot-api');
const { getMaster, getBranch, db } = require('../../database/database');

async function showBookingConfirmation(ctx, userId, userStates, time) {
  const state = userStates.get(userId);

  if (!state || !state.master_id || !state.service_id || !state.booking_date) {
    await ctx.reply('❌ Ошибка: не все данные выбраны.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  const master = getMaster(state.master_id);
  const branch = getBranch(state.branch_id);

  // Получаем услугу с ценой для конкретного мастера
  const serviceWithPrice = require('../../database/database')
    .db.prepare(
      `
  SELECT s.*, ms.price, ms.duration_minutes
  FROM services s
  JOIN master_services ms ON s.id = ms.service_id
  WHERE ms.master_id = ? AND s.id = ?
`
    )
    .get(state.master_id, state.service_id);

  if (!serviceWithPrice) {
    await ctx.reply('❌ Ошибка: услуга не найдена.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  const service = serviceWithPrice;

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
    [Keyboard.button.callback('✅ Согласен с политикой конфиденциальности', 'privacy_agree')],
    [Keyboard.button.callback('⬅️ Выбрать другое время', 'back_to_calendar')],
  ]);

  await ctx.reply(
    `📋 *Детали записи*\n\n` +
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
      `🔒 *Политика конфиденциальности:*\n` +
      `https://max-dialog.ru/privacy\n\n` +
      `Для завершения записи необходимо согласие на обработку персональных данных:`,
    { attachments: [keyboard] }
  );
}
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
module.exports = {
  showBookingConfirmation,
  confirmBooking,
  requestContact,
};
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
    // Логируем состояние
    console.log('🔍 STATE перед записью:', JSON.stringify(state, null, 2));
    console.log('🔍 client_name:', state.client_name);
    console.log('🔍 client_phone:', state.client_phone);
    // Получаем или создаём клиента с именем и телефоном
    const clientId = getOrCreateClient(userId, state.client_name, state.client_phone);

    // Создаём запись
    const booking = createBooking(
      clientId,
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

    const master = getMaster(state.master_id);
    const branch = getBranch(state.branch_id);

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
      `✅ Запись создана: ID ${booking.id}, 
  клиент ${state.client_name} (${state.client_phone}), 
  мастер ${master.name}, ${state.booking_date} ${state.booking_time}`
    );
    // Отправляем email админу
    try {
      const { notifyNewBooking } = require('../../services/email');
      const bookingWithDetails = require('../../database/database').getBookingWithClient(
        booking.id
      );
      if (bookingWithDetails) {
        // Передаем userId вторым аргументом, чтобы email.js знал, что это MAX-клиент
        await notifyNewBooking(booking, userId);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки email о новой записи:', error.message);
    }
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

module.exports = {
  showBookingConfirmation,
  confirmBooking,
  requestContact,
};
