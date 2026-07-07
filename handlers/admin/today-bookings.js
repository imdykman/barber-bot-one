const { Keyboard } = require('@maxhub/max-bot-api');
const { getTodayBookings } = require('../../database/database');

async function showTodayBookings(ctx, userId) {
  const bookings = getTodayBookings();

  const today = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  if (bookings.length === 0) {
    await ctx.reply(
      `📅 *Записи на сегодня*\n` +
        `📆 ${today}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `😔 На сегодня записей нет.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')]]),
        ],
      }
    );
    return;
  }

  let message = `📅 *Записи на сегодня*\n`;
  message += `📆 ${today}\n`;
  message += `📊 Всего: ${bookings.length}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  bookings.forEach((booking, index) => {
    const status =
      booking.status === 'confirmed' ? '✅' : booking.status === 'cancelled' ? '❌' : '⏳';

    message += `${status} *${booking.booking_time}* — ${booking.client_name}\n`;
    message += `📱 ${booking.client_phone}\n`;
    message += `💇 ${booking.master_name}\n`;
    message += `💈 ${booking.service_name}\n`;
    message += `🏢 ${booking.branch_name}\n\n`;
  });

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
  ]);

  await ctx.reply(message, { attachments: [keyboard] });
}

module.exports = { showTodayBookings };
