const { Keyboard } = require('@maxhub/max-bot-api');
const { getBranches } = require('../../database/database');

async function showWelcome(ctx, userId, userStates) {
  // Очищаем состояние
  userStates.delete(userId);
  
  const branches = getBranches();
  
  // Формируем кнопки филиалов
  const branchButtons = branches.map(branch => [
    Keyboard.button.callback(`🏢 ${branch.name}`, `branch_${branch.id}`)
  ]);
  
  // Добавляем кнопку "Мои записи" и "О нас"
  branchButtons.push([Keyboard.button.callback('📋 Мои записи', 'my_bookings')]);
  branchButtons.push([Keyboard.button.callback('ℹ️ О салоне', 'about')]);
  
  const keyboard = Keyboard.inlineKeyboard(branchButtons);
  
  await ctx.reply(
    `✂️ *Ножницы&Ко*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Добро пожаловать в сеть салонов красоты!\n\n` +
    `🏢 *Наши филиалы:*\n\n` +
    `📍 *Центральный*\n` +
    `ул. Ленина, д. 144\n` +
    `🕘 Ежедневно 9:00 - 21:00\n\n` +
    `📍 *Северный (Уралмаш / Эльмаш)*\n` +
    `пр. Космонавтов, д. 252\n` +
    `🕘 Ежедневно 9:00 - 21:00\n\n` +
    `📍 *Южный (Ботаника / Чкаловский)*\n` +
    `ул. 8 Марта, д. 308\n` +
    `🕘 Ежедневно 9:00 - 21:00\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Выберите филиал для записи:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showWelcome };