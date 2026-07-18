const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getBookingWithClient,
  updateBookingStatus,
  updateBookingDateTime,
  getFreeSlotsForReschedule,
} = require('../../database/database');
const { notifyClient } = require('../../services/notifications');

async function showBookingDetails(ctx, userId, bookingId) {
  const booking = getBookingWithClient(bookingId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')]]),
      ],
    });
    return;
  }

  const date = new Date(booking.booking_date);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  const statusText =
    booking.status === 'confirmed'
      ? '✅ Подтверждено'
      : booking.status === 'cancelled'
        ? '❌ Отменено'
        : booking.status === 'completed'
          ? '✓ Завершено'
          : '⏳ Ожидает';

  let message = `📋 *Запись #${booking.id}*\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `📌 *Статус:* ${statusText}\n\n`;
  message += `👤 *Клиент:* ${booking.client_name}\n`;
  message += `📱 *Телефон:* ${booking.client_phone}\n\n`;
  message += `📅 *Дата:* ${displayDate}\n`;
  message += `🕐 *Время:* ${booking.booking_time}\n\n`;
  message += `💇 *Мастер:* ${booking.master_name}\n`;
  message += `💈 *Услуга:* ${booking.service_name}\n`;
  message += `💰 *Стоимость:* ${booking.service_price} ₽\n`;
  message += `⏱️ *Длительность:* ${booking.duration_minutes} мин\n\n`;

  // Кнопки действий
  const buttons = [];

  if (booking.status === 'confirmed') {
    buttons.push([
      Keyboard.button.callback('✓ Завершить', `admin_complete_${bookingId}`),
      Keyboard.button.callback('❌ Отменить', `admin_cancel_${bookingId}`),
    ]);
    buttons.push([Keyboard.button.callback('📅 Перенести', `admin_reschedule_${bookingId}`)]);
  } else if (booking.status === 'cancelled' || booking.status === 'pending') {
    buttons.push([Keyboard.button.callback('✅ Подтвердить', `admin_confirm_${bookingId}`)]);
  }

  buttons.push([Keyboard.button.callback('⬅️ Назад к списку', 'admin_all_bookings')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(message, { attachments: [keyboard] });
}

async function applyStatusChange(ctx, userId, bookingId, newStatus) {
  const booking = getBookingWithClient(bookingId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена.');
    return;
  }

  const success = updateBookingStatus(bookingId, newStatus);

  if (!success) {
    await ctx.reply('❌ Не удалось изменить статус записи.');
    return;
  }

  const statusText =
    newStatus === 'confirmed'
      ? '✅ подтверждена'
      : newStatus === 'cancelled'
        ? '❌ отменена'
        : newStatus === 'completed'
          ? '✓ завершена'
          : newStatus;

  // Уведомляем клиента
  const date = new Date(booking.booking_date);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const notificationText =
    `Ваша запись ${statusText}:\n\n` +
    `📅 ${displayDate} в ${booking.booking_time}\n` +
    `💇 ${booking.master_name}\n` +
    `💈 ${booking.service_name}\n`;
  +(await notifyClient(ctx, booking.client_user_id, notificationText));

  await ctx.reply(
    `✅ *Статус изменён*\n\n` + `Запись #${bookingId} ${statusText}.\n\n` + `📱 Клиент уведомлён.`,
    {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('📋 К записи', `admin_booking_${bookingId}`)],
          [Keyboard.button.callback('⬅️ К списку', 'admin_all_bookings')],
        ]),
      ],
    }
  );

  console.log(`✅ Запись #${bookingId} ${statusText}, клиент ${booking.client_name} уведомлён`);
}

async function startReschedule(ctx, userId, bookingId) {
  const booking = getBookingWithClient(bookingId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена.');
    return;
  }

  // Сохраняем состояние переноса
  const { userStates } = require('../../services/states');
  const state = userStates.get(userId) || {};
  state.reschedule_booking_id = bookingId;
  userStates.set(userId, state);

  // Генерируем кнопки на ближайшие 7 дней
  const dateButtons = [];
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      weekday: 'short',
    });
    dateButtons.push([Keyboard.button.callback(displayDate, `admin_reschedule_date_${dateStr}`)]);
  }

  const keyboard = Keyboard.inlineKeyboard([
    ...dateButtons,
    [Keyboard.button.callback('⬅️ Отмена', `admin_booking_${bookingId}`)],
  ]);

  await ctx.reply(`📅 *Перенос записи #${bookingId}*\n\n` + `Выберите новую дату:`, {
    attachments: [keyboard],
  });
}

async function showRescheduleTime(ctx, userId, newDate) {
  const { userStates } = require('../../services/states');
  const state = userStates.get(userId);

  if (!state || !state.reschedule_booking_id) {
    await ctx.reply('❌ Ошибка: не найдена запись для переноса.');
    return;
  }

  const bookingId = state.reschedule_booking_id;
  const booking = getBookingWithClient(bookingId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена.');
    return;
  }

  // Получаем свободные слоты
  const freeSlots = getFreeSlotsForReschedule(
    booking.master_id,
    booking.service_id,
    newDate,
    bookingId
  );

  if (freeSlots.length === 0) {
    await ctx.reply(`😔 На выбранную дату нет свободных слотов.\n\n` + `Попробуйте другую дату.`, {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ Назад к датам', `admin_reschedule_${bookingId}`)],
        ]),
      ],
    });
    return;
  }

  // Сохраняем выбранную дату
  state.reschedule_new_date = newDate;
  userStates.set(userId, state);

  const date = new Date(newDate);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  // Генерируем кнопки времени (по 4 в ряд)
  const timeButtons = [];
  for (let i = 0; i < freeSlots.length; i += 4) {
    const row = freeSlots
      .slice(i, i + 4)
      .map((time) => Keyboard.button.callback(time, `admin_reschedule_time_${time}`));
    timeButtons.push(row);
  }

  timeButtons.push([Keyboard.button.callback('⬅️ Назад к датам', `admin_reschedule_${bookingId}`)]);

  const keyboard = Keyboard.inlineKeyboard(timeButtons);

  await ctx.reply(
    `🕐 *Перенос записи #${bookingId}*\n\n` + `📅 ${displayDate}\n\n` + `Выберите новое время:`,
    { attachments: [keyboard] }
  );
}

async function applyReschedule(ctx, userId, newTime) {
  const { userStates } = require('../../services/states');
  const state = userStates.get(userId);

  if (!state || !state.reschedule_booking_id || !state.reschedule_new_date) {
    await ctx.reply('❌ Ошибка: не найдены данные для переноса.');
    return;
  }

  const bookingId = state.reschedule_booking_id;
  const newDate = state.reschedule_new_date;

  const booking = getBookingWithClient(bookingId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена.');
    return;
  }

  const success = updateBookingDateTime(bookingId, newDate, newTime);

  if (!success) {
    await ctx.reply('❌ Не удалось перенести запись.');
    return;
  }

  // Очищаем состояние
  delete state.reschedule_booking_id;
  delete state.reschedule_new_date;
  userStates.set(userId, state);

  // Уведомляем клиента
  const oldDate = new Date(booking.booking_date);
  const oldDisplayDate = oldDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const newDateObj = new Date(newDate);
  const newDisplayDate = newDateObj.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });

  const notificationText =
    `Ваша запись перенесена:\n\n` +
    `📅 Было: ${oldDisplayDate} в ${booking.booking_time}\n` +
    `📅 Стало: ${newDisplayDate} в ${newTime}\n\n` +
    `💇 ${booking.master_name}\n` +
    `💈 ${booking.service_name}\n`;

  await notifyClient(ctx, booking.client_user_id, notificationText);

  await ctx.reply(
    `✅ *Запись перенесена*\n\n` +
      `Запись #${bookingId} перенесена:\n\n` +
      `📅 ${newDisplayDate} в ${newTime}\n\n` +
      `📱 Клиент уведомлён.`,
    {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('📋 К записи', `admin_booking_${bookingId}`)],
          [Keyboard.button.callback('⬅️ К списку', 'admin_all_bookings')],
        ]),
      ],
    }
  );

  console.log(
    `✅ Запись #${bookingId} перенесена на ${newDate} ${newTime}, 
    клиент ${booking.client_name} уведомлён`
  );
  // Отправляем email админу об изменении статуса
  try {
    const { notifyBookingStatusChange } = require('../../services/email');
    await notifyBookingStatusChange(booking, booking.status, newStatus);
  } catch (error) {
    console.error('❌ Ошибка отправки email об изменении статуса:', error.message);
  }
}

module.exports = {
  showBookingDetails,
  applyStatusChange,
  startReschedule,
  showRescheduleTime,
  applyReschedule,
};
