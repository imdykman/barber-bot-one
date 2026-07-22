const { Keyboard } = require('@maxhub/max-bot-api');
const { isAdmin } = require('../utils/isAdmin');
const { showAdminMenu } = require('../handlers/admin/index');
const { showAllBookings } = require('../handlers/admin/all-bookings');
const { confirmBooking } = require('../handlers/client/booking');

async function handleMessage(ctx, text, userId, { userStates }) {
  const state = userStates.get(userId) || {};

  // ========== 1. АДМИНСКИЕ СОСТОЯНИЯ ==========
  if (isAdmin(userId)) {
    console.log(`👑 [DEBUG] Админ ${userId} в режиме: ${state.mode || 'нет'}`);

    // Добавление мастера
    if (state.mode === 'admin_add_master_name') {
      state.temp_name = text;
      state.mode = 'admin_add_master_specialty';
      userStates.set(userId, state);
      await ctx.reply('💇 Введите специализацию мастера (например: Парикмахер-универсал):');
      return;
    }
    if (state.mode === 'admin_add_master_specialty') {
      state.temp_specialty = text;
      state.mode = 'admin_add_master_experience';
      userStates.set(userId, state);
      await ctx.reply('📅 Введите опыт работы в годах (число, например: 5):');
      return;
    }
    if (state.mode === 'admin_add_master_experience') {
      console.log(`✅ [DEBUG] Сработал режим admin_add_master_experience! Сохраняем: "${text}"`);
      state.temp_experience = parseInt(text) || 0;
      state.mode = 'admin_add_master_photo';
      userStates.set(userId, state);

      await ctx.reply(
        '🖼️ *Введите ссылку на фото мастера*\n\n' +
          'Например: https://example.com/photo.jpg\n\n' +
          'Если фото пока нет, просто напишите: *нет*',
        {
          attachments: [
            Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_masters')]]),
          ],
        }
      );
      return;
    }

    if (state.mode === 'admin_add_master_photo') {
      console.log(`✅ [DEBUG] Сработал режим admin_add_master_photo! Получено: "${text}"`);

      let photoUrl = null;
      const lowerText = text.trim().toLowerCase();

      if (lowerText !== 'нет' && lowerText !== 'пропустить') {
        // Простая валидация URL
        if (text.startsWith('http://') || text.startsWith('https://')) {
          photoUrl = text.trim();
        } else {
          await ctx.reply(
            '❌ Ссылка должна начинаться с http:// или https://\n\n' +
              'Попробуйте ещё раз или напишите *нет*, чтобы пропустить:',
            {
              attachments: [
                Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_masters')]]),
              ],
            }
          );
          return; // Прерываем, чтобы админ попробовал снова
        }
      }

      // Создаём мастера с фото
      const { createMaster } = require('../database/database');
      const newMasterId = createMaster(
        state.temp_name || 'Без имени',
        state.temp_specialty || 'Специалист',
        state.temp_experience || 0,
        '', // description пока оставляем пустым
        photoUrl
      );
      console.log(`✅ [DEBUG] Мастер создан с ID: ${newMasterId}, фото: ${photoUrl || 'нет'}`);

      userStates.delete(userId);

      await ctx.reply(
        `✅ Мастер *${state.temp_name}* успешно добавлен!` +
          (photoUrl
            ? `\n🖼️ Фото установлено.`
            : `\n⚠️ Фото не установлено (можно добавить позже).`),
        {
          attachments: [
            Keyboard.inlineKeyboard([
              [Keyboard.button.callback('⬅️ К списку мастеров', 'admin_masters')],
            ]),
          ],
        }
      );
      return;
    }

    // Добавление услуги
    if (state.mode === 'admin_add_service_name') {
      state.temp_name = text;
      state.mode = 'admin_add_service_category';
      userStates.set(userId, state);
      await ctx.reply('📂 Введите категорию услуги (например: Стрижки):');
      return;
    }
    if (state.mode === 'admin_add_service_category') {
      state.temp_category = text;
      state.mode = 'admin_add_service_price';
      userStates.set(userId, state);
      await ctx.reply('💰 Введите минимальную цену услуги (число, например: 1500):');
      return;
    }
    if (state.mode === 'admin_add_service_price') {
      state.temp_price = parseInt(text) || 0;
      state.mode = 'admin_add_service_duration';
      userStates.set(userId, state);
      await ctx.reply('⏱️ Введите длительность услуги в минутах (число, например: 60):');
      return;
    }
    if (state.mode === 'admin_add_service_duration') {
      const duration = parseInt(text) || 60;
      const { createService } = require('../database/database');
      createService(state.temp_name, state.temp_category, state.temp_price, null, duration, '');
      userStates.delete(userId);
      await ctx.reply(`✅ Услуга *${state.temp_name}* успешно добавлена!`, {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('⬅️ К списку услуг', 'admin_services')],
          ]),
        ],
      });
      return;
    }

    // Создание записи админом
    if (state.mode === 'admin_create_booking') {
      if (!state.client_name) {
        const clientName = text.trim();
        if (clientName.length < 2) {
          await ctx.reply('❌ Имя слишком короткое. Введите полное имя клиента:');
          return;
        }
        state.client_name = clientName;
        userStates.set(userId, state);
        await ctx.reply(
          `✅ Имя сохранено: ${clientName}\n\n📱 Теперь введите телефон клиента:\nФормат: +79091234567 или 89091234567`,
          {
            attachments: [
              Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_menu')]]),
            ],
          }
        );
        return;
      }
      if (!state.client_phone) {
        const phone = text.trim().replace(/\D/g, '');
        let normalized = phone.startsWith('8') && phone.length > 1 ? '7' + phone.slice(1) : phone;
        if (normalized.length !== 11 || !normalized.startsWith('7')) {
          await ctx.reply('❌ Неверный формат телефона. Пример: +79091234567', {
            attachments: [
              Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_menu')]]),
            ],
          });
          return;
        }
        state.client_phone = '+' + normalized;
        userStates.set(userId, state);

        const { createBookingByAdmin } = require('../handlers/admin/create-booking');
        await createBookingByAdmin(ctx, userId, state.client_name, state.client_phone);
        return;
      }
    }

    // Поиск в админке
    if (state.admin_search_mode) {
      state.admin_search_mode = false;
      userStates.set(userId, state);
      await showAllBookings(ctx, userId, { search: text });
      return;
    }
  }

  // ========== 2. ОБРАБОТКА КОНТАКТА (КЛИЕНТ) ==========
  const contactAttachment = ctx.message?.body?.attachments?.find((att) => att.type === 'contact');

  if (contactAttachment) {
    console.log(`📱 Получен контакт от пользователя ${userId}`);

    // Пытаемся извлечь данные из разных возможных полей MAX API для надежности
    const contactData =
      ctx.contactInfo || contactAttachment.payload || contactAttachment.contact || {};
    let name = contactData.fullName || contactData.name || contactData.first_name || 'Клиент';
    let phone = contactData.tel || contactData.phone || '';

    // Нормализация телефона (убираем всё кроме цифр, добавляем +)
    if (phone) {
      const digits = phone.replace(/\D/g, '');
      phone =
        digits.startsWith('8') && digits.length === 11 ? '+7' + digits.slice(1) : '+' + digits;
    }

    console.log(`👤 Извлеченные данные: Имя="${name}", Телефон="${phone}"`);

    const currentState = userStates.get(userId);
    if (currentState && currentState.privacy_agreed) {
      currentState.client_name = name;
      currentState.client_phone = phone;
      userStates.set(userId, currentState);

      // Вызываем финальное подтверждение
      await confirmBooking(ctx, userId, userStates);
      return;
    } else {
      console.log(`⚠️ Состояние не найдено или privacy_agreed не установлен`);
      await ctx.reply('❌ Произошла ошибка. Пожалуйста, начните запись заново через меню.', {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
        ],
      });
      return;
    }
  }

  // ========== 3. FALLBACK ==========
  if (text.startsWith('/')) return; // Игнорируем неизвестные slash-команды

  await ctx.reply('Я понимаю только команды из меню. Выберите действие:', {
    attachments: [
      Keyboard.inlineKeyboard([[Keyboard.button.callback('🏠 Главное меню', 'start')]]),
    ],
  });
}

module.exports = { handleMessage };
