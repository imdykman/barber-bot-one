const { Keyboard } = require('@maxhub/max-bot-api');
const { getStats } = require('../../database/database');

async function showStats(ctx, userId) {
  const stats = getStats();

  const monthName = new Date().toLocaleDateString('ru-RU', { month: 'long' });

  let message = `📊 *Статистика*\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `📅 *Сегодня:* ${stats.todayCount} записей\n`;
  message += `📆 *За ${monthName}:* ${stats.monthCount} записей\n`;
  message += `👥 *Всего клиентов:* ${stats.clientsCount}\n\n`;

  if (stats.topBranches.length > 0) {
    message += `🏢 *Филиалы (${monthName}):*\n`;
    stats.topBranches.forEach((branch) => {
      message += `  • ${branch.name} — ${branch.bookings_count}\n`;
    });
    message += `\n`;
  }

  if (stats.topMasters.length > 0) {
    message += `💇 *Топ мастеров (${monthName}):*\n`;
    stats.topMasters.forEach((master) => {
      message += `  • ${master.name} — ${master.bookings_count} записей\n`;
    });
    message += `\n`;
  }

  if (stats.topServices.length > 0) {
    message += `💈 *Топ услуг (${monthName}):*\n`;
    stats.topServices.forEach((service) => {
      message += `  • ${service.name} — ${service.bookings_count}\n`;
    });
  }

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
  ]);

  await ctx.reply(message, { attachments: [keyboard] });
}

module.exports = { showStats };
