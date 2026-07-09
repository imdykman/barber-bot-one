const { Keyboard } = require('@maxhub/max-bot-api');

async function showAdminMenu(ctx, userId) {
  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('📅 Записи на сегодня', 'admin_today')],
    [Keyboard.button.callback('📋 Все записи', 'admin_all_bookings')],
    [Keyboard.button.callback('📊 Статистика', 'admin_stats')],
    [Keyboard.button.callback('📥 Экспорт в CSV', 'admin_export')],
    [Keyboard.button.callback('🏠 Выйти из админки', 'start')],
  ]);

  await ctx.reply(`🔐 *Админ-панель*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Выберите раздел:`, {
    attachments: [keyboard],
  });
}

module.exports = { showAdminMenu };
