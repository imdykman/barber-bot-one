const { Keyboard } = require('@maxhub/max-bot-api');
const { db } = require('../../database/database');

async function showMyBookings(ctx, userId) {
  // 1. Получаем активные записи (confirmed или pending)
  const activeBookings = db
    .prepare(
      `
    SELECT b.*, m.name as master_name, s.name as service_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.user_id = ? AND b.status IN ('confirmed', 'pending')
    ORDER BY b.booking_date ASC, b.booking_time ASC
  `
    )
    .all(userId);

  // 2. Получаем историю посещений (completed или cancelled), последние 5
  const pastBookings = db
    .prepare(
      `
    SELECT b.booking_date, s.name as service_name, b.status
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.user_id = ? AND b.status IN ('completed', 'cancelled')
    ORDER BY b.booking_date DESC, b.booking_time DESC
    LIMIT 5
  `
    )
    .all(userId);

  if (activeBookings.length === 0 && pastBookings.length === 0) {
    await ctx.reply(
      `📋 *Мои записи*\n\n` +
        `У вас пока нет записей.\n\n` +
        `Запишитесь к мастеру через главное меню!`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
        ],
      }
    );
    return;
  }

  let message = `📋 *Мои записи*\n\n`;
  const buttons = [];

  // Формируем блок активных записей
  if (activeBookings.length > 0) {
    message += `✅ *Активные записи:*\n\n`;

    activeBookings.forEach((booking) => {
      const date = new Date(booking.booking_date);
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });

      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📅 ${displayDate} в ${booking.booking_time}\n`;
      message += `💇 ${booking.master_name}\n`;
      message += `💈 ${booking.service_name}\n\n`; // Филиал убрали, так как он один

      // Добавляем кнопку отмены с датой и временем
      buttons.push([
        Keyboard.button.callback(
          `❌ Отменить: ${booking.booking_date} ${booking.booking_time}`,
          `cancel_${booking.id}`
        ),
      ]);
    });
  } else {
    message += `У вас пока нет активных записей.\n\n`;
  }

  // Формируем блок истории посещений
  if (pastBookings.length > 0) {
    message += `\n📜 *История посещений:*\n\n`;

    pastBookings.forEach((booking) => {
      const date = new Date(booking.booking_date);
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      });

      const statusText = booking.status === 'cancelled' ? '❌ Отменено' : '✅ Завершено';

      message += `${displayDate} — ${booking.service_name}\n`;
      message += `${statusText}\n\n`;
    });
  }

  // Кнопка возврата в главное меню
  buttons.push([Keyboard.button.callback('🏠 Главное меню', 'start')]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

async function showCancelConfirmation(ctx, userId, bookingId) {
  const booking = db
    .prepare(
      `
    SELECT b.*, m.name as master_name, s.name as service_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.id = ? AND b.user_id = ?
  `
    )
    .get(bookingId, userId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена или у вас нет прав на её отмену.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
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

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('✅ Да, отменить', `confirm_cancel_${bookingId}`)],
    [Keyboard.button.callback('⬅️ Нет, вернуться', 'my_bookings')],
  ]);

  await ctx.reply(
    `❓ *Вы уверены, что хотите отменить запись?*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📅 ${displayDate} в ${booking.booking_time}\n` +
      `💇 ${booking.master_name}\n` +
      `💈 ${booking.service_name}\n`,
    { attachments: [keyboard] }
  );
}

async function confirmCancelBooking(ctx, userId, bookingId) {
  // 1. Сначала получаем детали записи, чтобы отправить их в письме
  const { getBookingWithClient } = require('../../database/database');
  const booking = getBookingWithClient(bookingId);

  // 2. Отменяем запись в базе
  const result = db
    .prepare(
      `
    UPDATE bookings 
    SET status = 'cancelled' 
    WHERE id = ? AND user_id = ? AND status IN ('confirmed', 'pending')
  `
    )
    .run(bookingId, userId);

  if (result.changes > 0) {
    // 3. Отправляем email админу об отмене
    try {
      const { notifyCancelBooking } = require('../../services/email');
      if (booking) {
        await notifyCancelBooking(booking);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки email об отмене:', error.message);
    }

    await ctx.reply(
      `✅ *Запись успешно отменена*\n\n` + `Если вы передумаете, можете записаться снова:`,
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('✂️ Записаться', 'start_booking')],
            [Keyboard.button.callback('🏠 Главное меню', 'start')],
          ]),
        ],
      }
    );
  } else {
    await ctx.reply('❌ Не удалось отменить запись. Возможно, она уже отменена.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
      ],
    });
  }
}

module.exports = {
  showMyBookings,
  showCancelConfirmation,
  confirmCancelBooking,
};
