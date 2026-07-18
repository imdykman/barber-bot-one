const { Keyboard } = require('@maxhub/max-bot-api');
const { getTodayBookings } = require('../../database/database');

async function showTodayBookings(ctx, userId) {
  const bookings = getTodayBookings();

  if (!bookings || bookings.length === 0) {
    await ctx.reply('📅 На сегодня записей нет.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'admin_menu')]]),
      ],
    });
    return;
  }

  let message = `📅 *Записи на сегодня*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  bookings.forEach((booking) => {
    message += `🕐 ${booking.booking_time}\n`;
    message += `💇 ${booking.master_name}\n`;
    message += `💈 ${booking.service_name}\n`;
    message += `👤 ${booking.client_name}\n`;
    message += `📱 ${booking.client_phone}\n`;
    message += `📋 Статус: ${getStatusEmoji(booking.status)}\n\n`;
  });

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
  ]);

  await ctx.reply(message, { attachments: [keyboard] });
}

function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳ Ожидает',
    confirmed: '✅ Подтверждено',
    completed: '✓ Завершено',
    cancelled: '❌ Отменено',
  };
  return emojis[status] || status;
}

module.exports = { showTodayBookings };
