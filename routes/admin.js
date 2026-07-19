const { Keyboard } = require('@maxhub/max-bot-api');
const { isAdmin } = require('../utils/isAdmin');
const { showAdminMenu } = require('../handlers/admin/index');
const { showTodayBookings } = require('../handlers/admin/today-bookings');
const { showStats } = require('../handlers/admin/stats');
const { showAllBookings } = require('../handlers/admin/all-bookings');
const {
  showBookingDetails,
  applyStatusChange,
  startReschedule,
  showRescheduleTime,
  applyReschedule,
} = require('../handlers/admin/booking-details');
const { getMasters } = require('../database/database');
const {
  showMastersList,
  showMasterDetails,
  handleToggleMaster,
  startAddMaster,
  showMasterServices,
  handleMasterServiceToggle,
} = require('../handlers/admin/masters');
const {
  showServicesList,
  showServiceDetails,
  handleToggleService,
  startAddService,
} = require('../handlers/admin/services');

// Проверка доступа
function checkAccess(ctx, userId) {
  if (!isAdmin(userId)) {
    ctx.reply('⛔ У вас нет доступа к админ-панели.');
    return false;
  }
  return true;
}

async function handleCallback(ctx, data, userId, { userStates }) {
  // Экспорт (не начинается с admin_, поэтому обрабатываем отдельно)
  if (data === 'export_today') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт за сегодня`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'today');
    return true;
  }

  if (data === 'export_week') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт за неделю`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'week');
    return true;
  }

  if (data === 'export_month') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт за месяц`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'month');
    return true;
  }

  if (data === 'export_all') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт всех записей`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'all');
    return true;
  }

  // Все админские callback начинаются с 'admin_'
  if (
    !data.startsWith('admin_') &&
    !data.startsWith('master_') &&
    !data.startsWith('service_') &&
    !data.startsWith('toggle_')
  ) {
    return false;
  }

  // Меню экспорта
  if (data === 'admin_export') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: меню экспорта`);
    const { showExportMenu } = require('../handlers/admin/export');
    await showExportMenu(ctx, userId);
    return true;
  }
  // Создание записи — начало
  if (data === 'admin_create_booking') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📝 Админ: создание записи`);

    const { userStates } = require('../services/states');
    userStates.set(userId, { mode: 'admin_create_booking' });

    const { showMasterSelection } = require('../handlers/admin/create-booking');
    await showMasterSelection(ctx, userId); // Без branchId
    return true;
  }

  // Создание записи — выбор мастера
  if (data.startsWith('admin_book_master_')) {
    if (!checkAccess(ctx, userId)) return true;
    const masterId = parseInt(data.replace('admin_book_master_', ''));
    console.log(`📝 Админ: выбор мастера ${masterId}`);

    const { userStates } = require('../services/states');
    const state = userStates.get(userId) || {};
    state.master_id = masterId;
    userStates.set(userId, state);

    const { showServiceSelection } = require('../handlers/admin/create-booking');
    await showServiceSelection(ctx, userId, masterId);
    return true;
  }

  // Создание записи — выбор услуги
  if (data.startsWith('admin_book_service_')) {
    if (!checkAccess(ctx, userId)) return true;
    const serviceId = parseInt(data.replace('admin_book_service_', ''));
    console.log(`📝 Админ: выбор услуги ${serviceId}`);

    const { userStates } = require('../services/states');
    const state = userStates.get(userId) || {};
    state.service_id = serviceId;
    userStates.set(userId, state);

    const { showDateSelection } = require('../handlers/admin/create-booking');
    await showDateSelection(ctx, userId);
    return true;
  }

  // Создание записи — выбор даты
  if (data.startsWith('admin_book_date_')) {
    if (!checkAccess(ctx, userId)) return true;
    const date = data.replace('admin_book_date_', '');
    console.log(`📝 Админ: выбор даты ${date}`);

    const { userStates } = require('../services/states');
    const state = userStates.get(userId) || {};
    state.booking_date = date;
    userStates.set(userId, state);

    const { showTimeSelection } = require('../handlers/admin/create-booking');
    await showTimeSelection(ctx, userId, date);
    return true;
  }

  // Создание записи — выбор времени
  if (data.startsWith('admin_book_time_')) {
    if (!checkAccess(ctx, userId)) return true;
    const time = data.replace('admin_book_time_', '');
    console.log(`📝 Админ: выбор времени ${time}`);

    const { userStates } = require('../services/states');
    const state = userStates.get(userId) || {};
    state.booking_time = time;
    userStates.set(userId, state);

    const { showClientForm } = require('../handlers/admin/create-booking');
    await showClientForm(ctx, userId);
    return true;
  }
  // Экспорт за сегодня
  if (data === 'export_today') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт за сегодня`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'today');
    return true;
  }

  // Экспорт за неделю
  if (data === 'export_week') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт за неделю`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'week');
    return true;
  }

  // Экспорт за месяц
  if (data === 'export_month') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт за месяц`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'month');
    return true;
  }

  // Экспорт всех записей
  if (data === 'export_all') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📥 Админ: экспорт всех записей`);
    const { exportBookings } = require('../handlers/admin/export');
    await exportBookings(ctx, userId, 'all');
    return true;
  }
  // Админ-меню
  if (data === 'admin_menu') {
    if (!checkAccess(ctx, userId)) return true;
    await showAdminMenu(ctx, userId);
    return true;
  }

  // Записи на сегодня
  if (data === 'admin_today') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📅 Админ: записи на сегодня`);
    await showTodayBookings(ctx, userId);
    return true;
  }

  // Статистика
  if (data === 'admin_stats') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📊 Админ: статистика`);
    await showStats(ctx, userId);
    return true;
  }

  // Все записи
  if (data === 'admin_all_bookings') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📋 Админ: все записи`);
    await showAllBookings(ctx, userId);
    return true;
  }

  // Фильтр по дате
  if (data === 'admin_filter_date') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📅 Админ: фильтр по дате`);

    const dateButtons = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
      dateButtons.push([Keyboard.button.callback(displayDate, `admin_date_${dateStr}`)]);
    }

    const keyboard = Keyboard.inlineKeyboard([
      ...dateButtons,
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('📅 Выберите дату:', { attachments: [keyboard] });
    return true;
  }

  // Обработка выбранной даты
  if (data.startsWith('admin_date_')) {
    if (!checkAccess(ctx, userId)) return true;
    const date = data.replace('admin_date_', '');
    console.log(`📅 Админ: фильтр по дате ${date}`);
    await showAllBookings(ctx, userId, { date });
    return true;
  }

  // Фильтр по мастеру
  if (data === 'admin_filter_master') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`💇 Админ: фильтр по мастеру`);

    const masters = getMasters();
    const masterButtons = masters.map((master) => [
      Keyboard.button.callback(master.name, `admin_master_${master.id}`),
    ]);

    const keyboard = Keyboard.inlineKeyboard([
      ...masterButtons,
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('💇 Выберите мастера:', { attachments: [keyboard] });
    return true;
  }

  // Обработка выбранного мастера
  if (data.startsWith('admin_master_')) {
    if (!checkAccess(ctx, userId)) return true;
    const masterId = data.replace('admin_master_', '');
    console.log(`💇 Админ: фильтр по мастеру ${masterId}`);
    await showAllBookings(ctx, userId, { master_id: masterId });
    return true;
  }

  // Фильтр по статусу
  if (data === 'admin_filter_status') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📌 Админ: фильтр по статусу`);

    const keyboard = Keyboard.inlineKeyboard([
      [Keyboard.button.callback('✅ Подтверждено', 'admin_status_confirmed')],
      [Keyboard.button.callback('❌ Отменено', 'admin_status_cancelled')],
      [Keyboard.button.callback('⏳ Ожидает', 'admin_status_pending')],
      [Keyboard.button.callback('⬅️ Назад', 'admin_all_bookings')],
    ]);

    await ctx.reply('📌 Выберите статус:', { attachments: [keyboard] });
    return true;
  }

  // Обработка выбранного статуса
  if (data.startsWith('admin_status_')) {
    if (!checkAccess(ctx, userId)) return true;
    const status = data.replace('admin_status_', '');
    console.log(`📌 Админ: фильтр по статусу ${status}`);
    await showAllBookings(ctx, userId, { status });
    return true;
  }

  // Поиск по имени/телефону
  if (data === 'admin_filter_search') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`🔎 Админ: поиск по имени/телефону`);

    const state = userStates.get(userId) || {};
    state.admin_search_mode = true;
    userStates.set(userId, state);

    await ctx.reply(
      `🔎 *Поиск по имени или телефону*\n\n` +
        `Введите имя клиента или номер телефона:\n\n` +
        `Примеры:\n` +
        `  • Иван\n` +
        `  • +79091234567\n` +
        `  • 9091234567`,
      {
        attachments: [
          Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_all_bookings')]]),
        ],
      }
    );
    return true;
  }

  // Детали записи
  if (data.startsWith('admin_booking_')) {
    if (!checkAccess(ctx, userId)) return true;
    const bookingId = parseInt(data.replace('admin_booking_', ''));
    console.log(`📋 Админ: детали записи ${bookingId}`);
    await showBookingDetails(ctx, userId, bookingId);
    return true;
  }

  // Подтвердить запись
  if (data.startsWith('admin_confirm_')) {
    if (!checkAccess(ctx, userId)) return true;
    const bookingId = parseInt(data.replace('admin_confirm_', ''));
    console.log(`✅ Админ: подтверждение записи ${bookingId}`);
    await applyStatusChange(ctx, userId, bookingId, 'confirmed');
    return true;
  }

  // Отменить запись
  if (data.startsWith('admin_cancel_')) {
    if (!checkAccess(ctx, userId)) return true;
    const bookingId = parseInt(data.replace('admin_cancel_', ''));
    console.log(`❌ Админ: отмена записи ${bookingId}`);
    await applyStatusChange(ctx, userId, bookingId, 'cancelled');
    return true;
  }

  // Завершить запись
  if (data.startsWith('admin_complete_')) {
    if (!checkAccess(ctx, userId)) return true;
    const bookingId = parseInt(data.replace('admin_complete_', ''));
    console.log(`✓ Админ: завершение записи ${bookingId}`);
    await applyStatusChange(ctx, userId, bookingId, 'completed');
    return true;
  }

  // Перенос записи — начало
  if (
    data.startsWith('admin_reschedule_') &&
    !data.includes('_date_') &&
    !data.includes('_time_')
  ) {
    if (!checkAccess(ctx, userId)) return true;
    const bookingId = parseInt(data.replace('admin_reschedule_', ''));
    console.log(`📅 Админ: перенос записи ${bookingId}`);
    await startReschedule(ctx, userId, bookingId);
    return true;
  }

  // Перенос записи — выбор даты
  if (data.startsWith('admin_reschedule_date_')) {
    if (!checkAccess(ctx, userId)) return true;
    const date = data.replace('admin_reschedule_date_', '');
    console.log(`📅 Админ: перенос на дату ${date}`);
    await showRescheduleTime(ctx, userId, date);
    return true;
  }

  // Перенос записи — выбор времени
  if (data.startsWith('admin_reschedule_time_')) {
    if (!checkAccess(ctx, userId)) return true;
    const time = data.replace('admin_reschedule_time_', '');
    console.log(`🕐 Админ: перенос на время ${time}`);
    await applyReschedule(ctx, userId, time);
    return true;
  }
  // ========== УПРАВЛЕНИЕ МАСТЕРАМИ ==========
  if (data === 'admin_masters') {
    await showMastersList(ctx);
    return true;
  }
  // ========== ПРИВЯЗКА УСЛУГ К МАСТЕРУ ==========
  if (data.startsWith('master_services_')) {
    if (!checkAccess(ctx, userId)) return true;
    const masterId = parseInt(data.replace('master_services_', ''));
    await showMasterServices(ctx, masterId);
    return true;
  }

  if (data.startsWith('master_service_attach_') || data.startsWith('master_service_detach_')) {
    if (!checkAccess(ctx, userId)) return true;
    // Формат: master_service_attach_1_5 или master_service_detach_1_5
    const parts = data.split('_');
    // parts: ['master', 'service', 'attach/detach', 'masterId', 'serviceId']
    const action = parts[2]; // attach или detach
    const masterId = parseInt(parts[3]);
    const serviceId = parseInt(parts[4]);
    await handleMasterServiceToggle(ctx, masterId, serviceId, action);
    return true;
  }
  // ========== НАСТРОЙКИ САЛОНА ==========
  if (data === 'admin_salon_settings') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`⚙️ Админ: настройки салона`);
    const { showSalonSettings } = require('../handlers/admin/salon-settings');
    await showSalonSettings(ctx, userId);
    return true;
  }

  if (data.startsWith('admin_salon_day_')) {
    if (!checkAccess(ctx, userId)) return true;
    const dayOfWeek = parseInt(data.replace('admin_salon_day_', ''));
    console.log(`⚙️ Админ: редактирование дня ${dayOfWeek}`);
    const { showDayEditor } = require('../handlers/admin/salon-settings');
    await showDayEditor(ctx, userId, dayOfWeek);
    return true;
  }

  if (data.startsWith('admin_salon_set_start_')) {
    if (!checkAccess(ctx, userId)) return true;
    const dayOfWeek = parseInt(data.replace('admin_salon_set_start_', ''));
    console.log(`⚙️ Админ: выбор времени начала для дня ${dayOfWeek}`);
    const { showStartTimeSelection } = require('../handlers/admin/salon-settings');
    await showStartTimeSelection(ctx, userId, dayOfWeek);
    return true;
  }

  if (data.startsWith('admin_salon_set_end_')) {
    if (!checkAccess(ctx, userId)) return true;
    const dayOfWeek = parseInt(data.replace('admin_salon_set_end_', ''));
    console.log(`⚙️ Админ: выбор времени окончания для дня ${dayOfWeek}`);
    const { showEndTimeSelection } = require('../handlers/admin/salon-settings');
    await showEndTimeSelection(ctx, userId, dayOfWeek);
    return true;
  }

  if (data.startsWith('admin_salon_toggle_off_')) {
    if (!checkAccess(ctx, userId)) return true;
    const dayOfWeek = parseInt(data.replace('admin_salon_toggle_off_', ''));
    console.log(`⚙️ Админ: сделать день ${dayOfWeek} выходным`);
    const { toggleDayOff } = require('../handlers/admin/salon-settings');
    await toggleDayOff(ctx, userId, dayOfWeek);
    return true;
  }

  if (data.startsWith('admin_salon_toggle_on_')) {
    if (!checkAccess(ctx, userId)) return true;
    const dayOfWeek = parseInt(data.replace('admin_salon_toggle_on_', ''));
    console.log(`⚙️ Админ: сделать день ${dayOfWeek} рабочим`);
    const { toggleDayOn } = require('../handlers/admin/salon-settings');
    await toggleDayOn(ctx, userId, dayOfWeek);
    return true;
  }
  // Обработка выбора времени начала
  if (data.startsWith('admin_salon_time_start_')) {
    if (!checkAccess(ctx, userId)) return true;
    // Формат: admin_salon_time_start_3_10:00
    const parts = data.replace('admin_salon_time_start_', '').split('_');
    const dayOfWeek = parseInt(parts[0]);
    const timeStr = parts[1]; // например, "10:00"

    console.log(`⚙️ Админ: установка времени начала для дня ${dayOfWeek}: ${timeStr}`);

    const { getSalonScheduleByDay, updateSalonSchedule } = require('../database/database');
    const day = getSalonScheduleByDay(dayOfWeek);

    if (day) {
      updateSalonSchedule(dayOfWeek, timeStr, day.end_time, day.is_working_day);
      const DAYS_FULL = [
        'Воскресенье',
        'Понедельник',
        'Вторник',
        'Среда',
        'Четверг',
        'Пятница',
        'Суббота',
      ];
      await ctx.reply(`✅ *${DAYS_FULL[dayOfWeek]}*: время начала изменено на *${timeStr}*`);

      const { showDayEditor } = require('../handlers/admin/salon-settings');
      await showDayEditor(ctx, userId, dayOfWeek);
    }
    return true;
  }

  // Обработка выбора времени окончания
  if (data.startsWith('admin_salon_time_end_')) {
    if (!checkAccess(ctx, userId)) return true;
    // Формат: admin_salon_time_end_3_20:00
    const parts = data.replace('admin_salon_time_end_', '').split('_');
    const dayOfWeek = parseInt(parts[0]);
    const timeStr = parts[1]; // например, "20:00"

    console.log(`⚙️ Админ: установка времени окончания для дня ${dayOfWeek}: ${timeStr}`);

    const { getSalonScheduleByDay, updateSalonSchedule } = require('../database/database');
    const day = getSalonScheduleByDay(dayOfWeek);

    if (day) {
      updateSalonSchedule(dayOfWeek, day.start_time, timeStr, day.is_working_day);
      const DAYS_FULL = [
        'Воскресенье',
        'Понедельник',
        'Вторник',
        'Среда',
        'Четверг',
        'Пятница',
        'Суббота',
      ];
      await ctx.reply(`✅ *${DAYS_FULL[dayOfWeek]}*: время окончания изменено на *${timeStr}*`);

      const { showDayEditor } = require('../handlers/admin/salon-settings');
      await showDayEditor(ctx, userId, dayOfWeek);
    }
    return true;
  }
  // Показать разовые выходные салона
  if (data === 'admin_salon_holidays') {
    if (!checkAccess(ctx, userId)) return true;
    console.log(`📅 Админ: разовые выходные салона`);
    const { showSalonHolidays } = require('../handlers/admin/salon-settings');
    await showSalonHolidays(ctx, userId);
    return true;
  }

  // Добавить/удалить разовый выходной
  if (data.startsWith('admin_salon_toggle_holiday_')) {
    if (!checkAccess(ctx, userId)) return true;
    const date = data.replace('admin_salon_toggle_holiday_', '');
    console.log(`📅 Админ: переключение выходного для даты ${date}`);
    const { toggleSalonHoliday } = require('../handlers/admin/salon-settings');
    await toggleSalonHoliday(ctx, userId, date);
    return true;
  }
  if (data.startsWith('master_') && !data.startsWith('toggle_master_')) {
    // 🆕 ВАЖНО: Если это не админ, пропускаем callback, чтобы его обработал клиентский роутер!
    if (!isAdmin(userId)) return false;

    const masterId = parseInt(data.replace('master_', ''));
    await showMasterDetails(ctx, masterId);
    return true;
  }
  if (data.startsWith('toggle_master_')) {
    const masterId = parseInt(data.replace('toggle_master_', ''));
    await handleToggleMaster(ctx, masterId);
    return true;
  }

  // ========== УПРАВЛЕНИЕ УСЛУГАМИ ==========
  if (data === 'admin_services') {
    await showServicesList(ctx);
    return true;
  }
  if (data.startsWith('service_') && !data.startsWith('toggle_service_')) {
    // 🆕 ВАЖНО: Если это не админ, пропускаем callback, чтобы его обработал клиентский роутер!
    if (!isAdmin(userId)) return false;

    const serviceId = parseInt(data.replace('service_', ''));
    await showServiceDetails(ctx, serviceId);
    return true;
  }
  if (data.startsWith('toggle_service_')) {
    const serviceId = parseInt(data.replace('toggle_service_', ''));
    await handleToggleService(ctx, serviceId);
    return true;
  }
  // --- ДОБАВЛЕНИЕ МАСТЕРА ---
  if (data === 'admin_add_master') {
    if (!checkAccess(ctx, userId)) return true;
    await startAddMaster(ctx, userId, userStates);
    return true;
  }

  // --- ДОБАВЛЕНИЕ УСЛУГИ ---
  if (data === 'admin_add_service') {
    if (!checkAccess(ctx, userId)) return true;
    await startAddService(ctx, userId, userStates);
    return true;
  }
  return false;
}

module.exports = { handleCallback };
