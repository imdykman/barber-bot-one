const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getActiveBookingsByClient,
  getPastBookingsByClient,
  getBookingById,
} = require('../../database/database');

async function showMyBookings(ctx, userId, userStates) {
  const client = require('../../database/database')
    .db.prepare('SELECT * FROM clients WHERE user_id = ?')
    .get(userId);

  if (!client) {
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

  const activeBookings = getActiveBookingsByClient(client.id);
  const pastBookings = getPastBookingsByClient(client.id);

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

  // Формируем список активных записей
  let message = `📋 *Мои записи*\n\n`;

  if (activeBookings.length > 0) {
    message += `✅ *Активные записи:*\n\n`;

    activeBookings.forEach((booking) => {
      const date = new Date(booking.booking_date);
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'short',
      });

      message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📅 ${displayDate} в ${booking.booking_time}\n`;
      message += `💇 ${booking.master_name}\n`;
      message += `💈 ${booking.service_name}\n`;
      message += `🏢 ${booking.branch_name}\n\n`;
    });
  }

  if (pastBookings.length > 0) {
    message += `\n📜 *История посещений:*\n\n`;

    pastBookings.slice(0, 5).forEach((booking) => {
      const date = new Date(booking.booking_date);
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      });

      const status = booking.status === 'cancelled' ? '❌ Отменено' : '✅ Завершено';

      message += `${displayDate} — ${booking.service_name}\n`;
      message += `${status}\n\n`;
    });
  }

  // Формируем кнопки
  const buttons = [];

  // Кнопки отмены для активных записей
  if (activeBookings.length > 0) {
    activeBookings.forEach((booking) => {
      buttons.push([
        Keyboard.button.callback(
          `❌ Отменить: ${booking.booking_date} ${booking.booking_time}`,
          `cancel_${booking.id}`
        ),
      ]);
    });
  }

  buttons.push([Keyboard.button.callback('🏠 Главное меню', 'start')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(message, { attachments: [keyboard] });
}

async function showCancelConfirmation(ctx, userId, userStates, bookingId) {
  const booking = getBookingById(bookingId);

  if (!booking) {
    await ctx.reply('❌ Запись не найдена.', {
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
    `❓ *Отмена записи*\n\n` +
      `Вы уверены, что хотите отменить запись?\n\n` +
      `📅 ${displayDate} в ${booking.booking_time}\n` +
      `💇 ${booking.master_name}\n` +
      `💈 ${booking.service_name}\n` +
      `🏢 ${booking.branch_name}`,
    { attachments: [keyboard] }
  );
}

async function confirmCancelBooking(ctx, userId, userStates, bookingId) {
  const client = require('../../database/database')
    .db.prepare('SELECT * FROM clients WHERE user_id = ?')
    .get(userId);

  if (!client) {
    await ctx.reply('❌ Клиент не найден.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
      ],
    });
    return;
  }

  const success = cancelBooking(bookingId, client.id);

  if (success) {
    await ctx.reply(
      `✅ *Запись отменена*\n\n` +
        `Ваша запись успешно отменена.\n\n` +
        `Если хотите записаться снова — воспользуйтесь главным меню.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
        ],
      }
    );

    console.log(`✅ Запись отменена: ID ${bookingId}, клиент ${client.id}`);
  } else {
    await ctx.reply('❌ Не удалось отменить запись. Возможно, она уже отменена или завершена.', {
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
