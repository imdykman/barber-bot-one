const { Keyboard } = require('@maxhub/max-bot-api');
const { getStats, getMasters, db } = require('../../database/database');

async function showStats(ctx, userId) {
  // Статистика за последние 30 дней
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const stats = getStats(startDate, endDate);

  // Топ мастеров по количеству записей
  const topMasters = db
    .prepare(
      `
    SELECT m.name, COUNT(b.id) as bookings_count
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    WHERE b.booking_date BETWEEN ? AND ?
      AND b.status IN ('confirmed', 'completed')
    GROUP BY m.id
    ORDER BY bookings_count DESC
    LIMIT 5
  `
    )
    .all(startDate, endDate);

  // Топ услуг
  const topServices = db
    .prepare(
      `
    SELECT s.name, COUNT(b.id) as bookings_count
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date BETWEEN ? AND ?
      AND b.status IN ('confirmed', 'completed')
    GROUP BY s.id
    ORDER BY bookings_count DESC
    LIMIT 5
  `
    )
    .all(startDate, endDate);

  // Формируем сообщение
  let message = `📊 *Статистика за последние 30 дней*\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `📋 *Всего записей:* ${stats.total_bookings || 0}\n`;
  message += `✅ *Подтверждено:* ${stats.confirmed || 0}\n`;
  message += `✓ *Завершено:* ${stats.completed || 0}\n`;
  message += `❌ *Отменено:* ${stats.cancelled || 0}\n`;
  message += `💰 *Выручка:* ${stats.revenue || 0} ₽\n\n`;

  if (topMasters.length > 0) {
    message += `👨‍💼 *Топ мастеров:*\n`;
    topMasters.forEach((m, i) => {
      message += `${i + 1}. ${m.name} — ${m.bookings_count} записей\n`;
    });
    message += `\n`;
  }

  if (topServices.length > 0) {
    message += `💈 *Топ услуг:*\n`;
    topServices.forEach((s, i) => {
      message += `${i + 1}. ${s.name} — ${s.bookings_count} записей\n`;
    });
  }

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
  ]);

  await ctx.reply(message, { attachments: [keyboard] });
}

module.exports = { showStats };
