const { Keyboard } = require('@maxhub/max-bot-api');
const { showWelcome } = require('../handlers/client/welcome');
const { showMasters } = require('../handlers/client/masters');
const { showServices } = require('../handlers/client/services');
const { showCalendar } = require('../handlers/client/calendar');
const { showTimeSlots } = require('../handlers/client/time');
const { showBookingConfirmation, requestContact } = require('../handlers/client/booking');
const {
  showMyBookings,
  showCancelConfirmation,
  confirmCancelBooking,
} = require('../handlers/client/my-bookings');

async function handleCallback(ctx, data, userId, { userStates }) {
  // Главное меню
  if (data === 'start') {
    await showWelcome(ctx, userId, userStates);
    return true;
  }

  // 🆕 НАЧАЛО ЗАПИСИ (сразу к мастерам, без выбора филиала)
  if (data === 'start_booking') {
    console.log(`📝 Клиент ${userId} начал запись`);
    await showMasters(ctx, userId, userStates);
    return true;
  }

  // Выбор мастера
  if (data.startsWith('master_')) {
    const masterId = parseInt(data.replace('master_', ''));
    console.log(`💇 Выбран мастер: ${masterId}`);
    await showServices(ctx, userId, userStates, masterId);
    return true;
  }

  // Выбор услуги
  if (data.startsWith('service_')) {
    const serviceId = parseInt(data.replace('service_', ''));
    console.log(`💈 Выбрана услуга: ${serviceId}`);
    const state = userStates.get(userId) || {};
    state.service_id = serviceId;
    userStates.set(userId, state);
    await showCalendar(ctx, userId, userStates);
    return true;
  }

  // Выбор даты
  if (data.startsWith('date_')) {
    const dateStr = data.replace('date_', '');
    console.log(`📅 Выбрана дата: ${dateStr}`);
    await showTimeSlots(ctx, userId, userStates, dateStr);
    return true;
  }

  // Возврат к календарю
  if (data === 'back_to_calendar') {
    console.log(`📅 Возврат к календарю`);
    await showCalendar(ctx, userId, userStates);
    return true;
  }

  // Выбор времени
  if (data.startsWith('time_')) {
    const time = data.replace('time_', '');
    console.log(`🕐 Выбрано время: ${time}`);
    await showBookingConfirmation(ctx, userId, userStates, time);
    return true;
  }

  // Согласие с политикой конфиденциальности
  if (data === 'privacy_agree') {
    console.log(`🔒 Согласие с политикой конфиденциальности`);
    const state = userStates.get(userId) || {};
    state.privacy_agreed = true;
    userStates.set(userId, state);
    await requestContact(ctx, userId, userStates);
    return true;
  }

  // Возврат к подтверждению (без согласия)
  if (data === 'back_to_confirmation') {
    console.log(`⬅️ Возврат к подтверждению`);
    const state = userStates.get(userId);
    if (state && state.booking_time) {
      await showBookingConfirmation(ctx, userId, userStates, state.booking_time);
    } else {
      await showWelcome(ctx, userId, userStates);
    }
    return true;
  }

  // Мои записи
  if (data === 'my_bookings') {
    console.log(`📋 Мои записи`);
    await showMyBookings(ctx, userId, userStates);
    return true;
  }

  // Запрос отмены записи
  if (data.startsWith('cancel_')) {
    const bookingId = parseInt(data.replace('cancel_', ''));
    console.log(`❌ Запрос отмены записи: ${bookingId}`);
    await showCancelConfirmation(ctx, userId, bookingId); // <-- Только 3 аргумента!
    return true;
  }

  // Подтверждение отмены записи
  if (data.startsWith('confirm_cancel_')) {
    const bookingId = parseInt(data.replace('confirm_cancel_', ''));
    console.log(`✅ Подтверждение отмены записи: ${bookingId}`);
    await confirmCancelBooking(ctx, userId, bookingId); // <-- Только 3 аргумента!
    return true;
  }

  // О салоне
  if (data === 'about' || data === 'about_us') {
    await ctx.reply(
      `ℹ️ *О салоне "Ножницы & One"*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Мы — современный салон красоты.\n\n` +
        `✨ *Наши преимущества:*\n` +
        `• Опытные мастера\n` +
        `• Премиальная косметика\n` +
        `• Удобное расположение\n` +
        `• Онлайн-запись 24/7\n\n` +
        `📞 *Контакты:*\n` +
        `• Телефон: +7 (XXX) XXX-XX-XX\n` +
        `• Адрес: г. Екатеринбург, ул. Примерная, 1\n\n` +
        `💚 Ждём вас!`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В главное меню', 'start')]]),
        ],
      }
    );
    return true;
  }

  return false; // Не обработано
}

module.exports = { handleCallback };
