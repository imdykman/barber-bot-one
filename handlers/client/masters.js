const { Keyboard } = require('@maxhub/max-bot-api');
const { getMasters } = require('../../database/database');

async function showMasters(ctx, userId, userStates) {
  // 🆕 Получаем ВСЕХ активных мастеров (без фильтра по филиалу)
  const masters = getMasters();

  if (!masters || masters.length === 0) {
    await ctx.reply('❌ К сожалению, сейчас нет свободных мастеров. Попробуйте позже.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В главное меню', 'start')]]),
      ],
    });
    return;
  }

  const buttons = masters.map((m) => [
    Keyboard.button.callback(`${m.name} (${m.specialty || 'Мастер'})`, `master_${m.id}`),
  ]);

  buttons.push([Keyboard.button.callback('⬅️ В главное меню', 'start')]);

  await ctx.reply('💇 *Выберите мастера:*', {
    attachments: [Keyboard.inlineKeyboard(buttons)],
  });
}

module.exports = { showMasters };
