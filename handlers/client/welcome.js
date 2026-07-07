const { Keyboard } = require('@maxhub/max-bot-api');
const { getBranches } = require('../../database/database');
const { isAdmin } = require('../../utils/isAdmin');

async function showWelcome(ctx, userId, userStates) {
  const branches = getBranches();

  // Формируем кнопки филиалов
  const branchButtons = branches.map((branch) => [
    Keyboard.button.callback(`🏢 ${branch.name}`, `branch_${branch.id}`),
  ]);

  // Кнопки клиента
  branchButtons.push([Keyboard.button.callback('📋 Мои записи', 'my_bookings')]);
  branchButtons.push([Keyboard.button.callback('ℹ️ О салоне', 'about')]);

  // Кнопка админа (только для админов)
  if (isAdmin(userId)) {
    branchButtons.push([Keyboard.button.callback('🔐 Админ-панель', 'admin_menu')]);
  }

  const keyboard = Keyboard.inlineKeyboard(branchButtons);

  await ctx.reply(
    `✂️ *Ножницы&Ко*\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Добро пожаловать в сеть салонов красоты!\n\n` +
      `🏢 Наши филиалы:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showWelcome };
