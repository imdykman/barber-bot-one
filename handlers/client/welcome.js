const { Keyboard } = require('@maxhub/max-bot-api');
const { isAdmin } = require('../../utils/isAdmin');

async function showWelcome(ctx, userId) {
  // Формируем кнопки главного меню
  const buttons = [
    [Keyboard.button.callback('✂️ Записаться онлайн', 'start_booking')],
    [Keyboard.button.callback('📋 Мои записи', 'my_bookings')],
    [Keyboard.button.callback('ℹ️ О салоне', 'about_us')],
  ];

  // Если пользователь админ, добавляем кнопку входа в админку
  if (isAdmin(userId)) {
    buttons.push([Keyboard.button.callback('🔐 Админ-панель', 'admin_menu')]);
  }

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(
    `👋 *Добро пожаловать в Ножницы & One!*\n\n` + `Мы рады видеть вас! Выберите действие:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showWelcome };
