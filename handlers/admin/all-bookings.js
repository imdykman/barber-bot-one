const { Keyboard } = require('@maxhub/max-bot-api');
const { getAllBookings, getMasters } = require('../../database/database');

async function showAllBookings(ctx, userId, filters = {}) {
  const bookings = getAllBookings(filters);

  if (!bookings || bookings.length === 0) {
    await ctx.reply('📋 Записи не найдены.', {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'admin_menu')]]),
      ],
    });
    return;
  }

  let message = `📋 *Все записи*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Показываем активные фильтры
  if (Object.keys(filters).length > 0) {
    message += `🔍 *Активные фильтры:*\n`;
    if (filters.date) message += `  📅 Дата: ${filters.date}\n`;
    if (filters.master_id) {
      const masters = getMasters();
      const master = masters.find((m) => m.id === parseInt(filters.master_id));
      message += `  💇 Мастер: ${master?.name || 'Неизвестно'}\n`;
    }
    if (filters.status) message += `  📌 Статус: ${filters.status}\n`;
    message += `\n`;
  }

  // Показываем первые 10 записей
  const displayBookings = bookings.slice(0, 10);
  displayBookings.forEach((booking) => {
    message += `📅 ${booking.booking_date} в ${booking.booking_time}\n`;
    message += `💇 ${booking.master_name}\n`;
    message += `💈 ${booking.service_name}\n`;
    message += `👤 ${booking.client_name}\n`;
    message += `📱 ${booking.client_phone}\n`;
    message += `📋 Статус: ${getStatusEmoji(booking.status)}\n`;
    message += `[🔍 Детали](callback:admin_booking_${booking.id})\n\n`;
  });

  if (bookings.length > 10) {
    message += `... и ещё ${bookings.length - 10} записей\n`;
  }

  // Кнопки фильтров
  const filterButtons = [
    [Keyboard.button.callback('📅 Фильтр по дате', 'admin_filter_date')],
    [Keyboard.button.callback('💇 Фильтр по мастеру', 'admin_filter_master')],
    [Keyboard.button.callback('📌 Фильтр по статусу', 'admin_filter_status')],
    [Keyboard.button.callback('🔎 Поиск по имени/телефону', 'admin_filter_search')],
    [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
  ];

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(filterButtons)] });
}

function getStatusEmoji(status) {
  const emojis = {
    pending: '⏳ Ожидает',
    confirmed: '✅ Подтверждено',
    completed: '✓ Завершено',
    cancelled: '❌ Отменено',
  };
  return emojis[status] || status;
}

module.exports = { showAllBookings };
