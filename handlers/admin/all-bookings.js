const { Keyboard } = require('@maxhub/max-bot-api');
const { getAllBookings, getBranches, getMasters } = require('../../database/database');

async function showAllBookings(ctx, userId, filters = {}) {
  const bookings = getAllBookings(filters);
  const branches = getBranches();
  const masters = getMasters();

  if (bookings.length === 0) {
    let message = `📋 *Все записи*\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `😔 Записей не найдено.\n\n`;

    if (Object.keys(filters).length > 0) {
      message += `🔍 Применённые фильтры:\n`;
      if (filters.date) message += `  📅 Дата: ${filters.date}\n`;
      if (filters.master_id) {
        const master = masters.find((m) => m.id === parseInt(filters.master_id));
        message += `  💇 Мастер: ${master?.name || 'Неизвестно'}\n`;
      }
      if (filters.branch_id) {
        const branch = branches.find((b) => b.id === parseInt(filters.branch_id));
        message += `  🏢 Филиал: ${branch?.name || 'Неизвестно'}\n`;
      }
      if (filters.status) {
        const statusText =
          filters.status === 'confirmed'
            ? '✅ Подтверждено'
            : filters.status === 'cancelled'
              ? '❌ Отменено'
              : '⏳ Ожидает';
        message += `  📌 Статус: ${statusText}\n`;
      }
      if (filters.search) message += `  🔎 Поиск: ${filters.search}\n`;
    }

    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('🗑️ Сбросить фильтры', 'admin_all_bookings')],
      [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
    ]);

    await ctx.reply(message, { attachments: [keyboard] });
    return;
  }

  let message = `📋 *Все записи*\n`;
  message += `📊 Найдено: ${bookings.length}\n\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  bookings.slice(0, 20).forEach((booking) => {
    const status =
      booking.status === 'confirmed' ? '✅' : booking.status === 'cancelled' ? '❌' : '⏳';

    const date = new Date(booking.booking_date);
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });

    message += `${status} *${displayDate} ${booking.booking_time}*\n`;
    message += `👤 ${booking.client_name} (${booking.client_phone})\n`;
    message += `💇 ${booking.master_name}\n`;
    message += `💈 ${booking.service_name}\n`;
    message += `🏢 ${booking.branch_name}\n\n`;
  });

  if (bookings.length > 20) {
    message += `... и ещё ${bookings.length - 20} записей\n\n`;
  }

  // Кнопки фильтров
  const filterButtons = [
    [Keyboard.button.callback('📅 Фильтр по дате', 'admin_filter_date')],
    [Keyboard.button.callback('💇 Фильтр по мастеру', 'admin_filter_master')],
    [Keyboard.button.callback('🏢 Фильтр по филиалу', 'admin_filter_branch')],
    [Keyboard.button.callback('📌 Фильтр по статусу', 'admin_filter_status')],
    [Keyboard.button.callback('🔎 Поиск по имени/телефону', 'admin_filter_search')],
  ];

  if (Object.keys(filters).length > 0) {
    filterButtons.push([Keyboard.button.callback('🗑️ Сбросить фильтры', 'admin_all_bookings')]);
  }

  filterButtons.push([Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')]);

  const keyboard = Keyboard.inlineKeyboard(filterButtons);

  await ctx.reply(message, { attachments: [keyboard] });
}

module.exports = { showAllBookings };
