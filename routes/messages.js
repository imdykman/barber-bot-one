const { Keyboard } = require('@maxhub/max-bot-api');
const { isAdmin } = require('../utils/isAdmin');
const { showAdminMenu } = require('../handlers/admin/index');
const { showAllBookings } = require('../handlers/admin/all-bookings');
const { confirmBooking } = require('../handlers/client/booking');

async function handleMessage(ctx, text, userId, { userStates, getUserId }) {
  const state = userStates.get(userId);

  // Поиск в админке
  if (state?.admin_search_mode && isAdmin(userId)) {
    console.log(`🔎 Админ: поиск "${text}"`);
    state.admin_search_mode = false;
    userStates.set(userId, state);
    await showAllBookings(ctx, userId, { search: text });
    return true;
  }

  // ========== СОЗДАНИЕ ЗАПИСИ АДМИНОМ ==========
  if (state?.mode === 'admin_create_booking') {
    const { createBookingByAdmin } = require('../handlers/admin/create-booking');

    // Шаг 1: Ввод имени клиента
    if (!state.client_name) {
      const clientName = text.trim();

      if (clientName.length < 2) {
        await ctx.reply('❌ Имя слишком короткое. Введите полное имя клиента:');
        return true;
      }

      state.client_name = clientName;
      userStates.set(userId, state);

      await ctx.reply(
        `✅ Имя сохранено: ${clientName}\n\n` +
          `📱 Теперь введите телефон клиента:\n\n` +
          `Формат: +79091234567 или 89091234567`,
        {
          attachments: [
            Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_menu')]]),
          ],
        }
      );
      return true;
    }

    // Шаг 2: Ввод телефона клиента
    if (!state.client_phone) {
      const phone = text.trim();

      // Валидация телефона
      const digits = phone.replace(/\D/g, '');

      // Нормализация: 8 → 7
      let normalized = digits;
      if (digits.startsWith('8') && digits.length > 1) {
        normalized = '7' + digits.slice(1);
      }

      if (normalized.length !== 11 || !normalized.startsWith('7')) {
        await ctx.reply(
          `❌ Неверный формат телефона.\n\n` +
            `Телефон должен содержать 11 цифр и начинаться с +7.\n\n` +
            `Примеры:\n` +
            `  • +79091234567\n` +
            `  • 89091234567\n` +
            `  • 79091234567`,
          {
            attachments: [
              Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_menu')]]),
            ],
          }
        );
        return true;
      }

      state.client_phone = '+' + normalized;
      userStates.set(userId, state);

      // Создаём запись
      await createBookingByAdmin(ctx, userId, state.client_name, state.client_phone);
      return true;
    }
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
