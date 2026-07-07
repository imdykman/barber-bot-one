const { Keyboard } = require('@maxhub/max-bot-api');
const { isAdmin } = require('../utils/isAdmin');
const { showAdminMenu } = require('../handlers/admin/index');
const { showAllBookings } = require('../handlers/admin/all-bookings');
const { confirmBooking } = require('../handlers/client/booking');

async function handleMessage(ctx, text, userId, { userStates, getUserId }) {
  // Поиск в админке
  const state = userStates.get(userId);
  if (state?.admin_search_mode && isAdmin(userId)) {
    console.log(`🔎 Админ: поиск "${text}"`);
    state.admin_search_mode = false;
    userStates.set(userId, state);
    await showAllBookings(ctx, userId, { search: text });
    return true;
  }

  // Команда /admin (обработка как текст, на случай если bot.command не сработал)
  if (text === '/admin') {
    if (!isAdmin(userId)) {
      await ctx.reply('⛔ У вас нет доступа к админ-панели.');
      return true;
    }
    console.log(`🔐 Вход в админку: ${userId}`);
    await showAdminMenu(ctx, userId);
    return true;
  }

  // Остальные команды игнорируем
  if (text.startsWith('/')) return true;

  // Обработка контакта
  const contactAttachment = ctx.message?.body?.attachments?.find((att) => att.type === 'contact');

  if (contactAttachment) {
    console.log(`📱 Получен контакт`);
    const contactInfo = ctx.contactInfo;

    if (contactInfo) {
      console.log(`📱 Контакт:`, contactInfo);
      const state = userStates.get(userId);

      if (state && state.privacy_agreed) {
        const name = contactInfo.fullName || 'Клиент';
        const phone = contactInfo.tel || '';

        console.log(`👤 Имя: ${name}, Телефон: ${phone}`);

        state.client_name = name;
        state.client_phone = phone.startsWith('+') ? phone : `+${phone}`;
        userStates.set(userId, state);

        await confirmBooking(ctx, userId, userStates);
        return true;
      } else {
        console.log(`⚠️ Состояние не найдено или privacy_agreed не установлен`);
        console.log(`Состояние:`, state);
      }
    }
  }

  // Fallback
  await ctx.reply('Я понимаю только команды из меню. Выберите действие:', {
    attachments: [
      Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
    ],
  });
  return true;
}

module.exports = { handleMessage };
