const { Keyboard } = require('@maxhub/max-bot-api');
const { getBranch, getMastersByBranch } = require('../../database/database');

async function showMasters(ctx, userId, userStates, branchId) {
  const branch = getBranch(branchId);

  if (!branch) {
    await ctx.reply('❌ Филиал не найден.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'start')]])],
    });
    return;
  }

  const masters = getMastersByBranch(branchId);

  if (masters.length === 0) {
    await ctx.reply(`😔 В филиале "${branch.name}" пока нет доступных мастеров.`, {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Выбрать другой филиал', 'start')]]),
      ],
    });
    return;
  }

  // Сохраняем выбранный филиал в состоянии
  const state = userStates.get(userId) || {};
  state.branch_id = branchId;
  state.branch_name = branch.name;
  userStates.set(userId, state);

  // Формируем кнопки мастеров
  const masterButtons = masters.map((master) => [
    Keyboard.button.callback(`💇 ${master.name} (${master.specialty})`, `master_${master.id}`),
  ]);

  // Кнопка "Назад"
  masterButtons.push([Keyboard.button.callback('⬅️ Назад к филиалам', 'start')]);

  const keyboard = Keyboard.inlineKeyboard(masterButtons);

  await ctx.reply(
    `🏢 *${branch.name}*\n` +
      `📍 ${branch.address}\n` +
      `🕘 ${branch.work_hours}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Выберите мастера:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showMasters };
