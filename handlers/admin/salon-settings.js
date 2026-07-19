const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getSalonSchedule,
  getSalonScheduleByDay,
  updateSalonSchedule,
  setDayOff,
  setDayWorking,
  getWorkingHoursRange,
} = require('../../database/database');

const DAYS_RU = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const DAYS_FULL = [
  'Воскресенье',
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
];

// Показать текущий график салона
async function showSalonSettings(ctx, userId) {
  const schedule = getSalonSchedule();

  let message = `⚙️ *Настройки графика салона*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  schedule.forEach((day) => {
    const dayName = DAYS_FULL[day.day_of_week];
    if (day.is_working_day) {
      message += `✅ *${dayName}:* ${day.start_time} — ${day.end_time}\n`;
    } else {
      message += `❌ *${dayName}:* Выходной\n`;
    }
  });

  message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\nВыберите день для настройки:`;

  // Кнопки дней недели (Пн-Вс, по 2 в ряд)
  // Порядок: Пн(1), Вт(2), Ср(3), Чт(4), Пт(5), Сб(6), Вс(0)
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];
  const buttons = [];
  for (let i = 0; i < dayOrder.length; i += 2) {
    const row = [];
    for (let j = 0; j < 2 && i + j < dayOrder.length; j++) {
      const dayOfWeek = dayOrder[i + j];
      row.push(Keyboard.button.callback(DAYS_RU[dayOfWeek], `admin_salon_day_${dayOfWeek}`));
    }
    buttons.push(row);
  }
  // 🆕 Кнопка управления разовыми выходными
  buttons.push([Keyboard.button.callback('📅 Выходные салона', 'admin_salon_holidays')]);
  buttons.push([Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Показать редактор конкретного дня
async function showDayEditor(ctx, userId, dayOfWeek) {
  const day = getSalonScheduleByDay(dayOfWeek);
  if (!day) {
    await ctx.reply('❌ День не найден в графике.');
    return;
  }

  const dayName = DAYS_FULL[dayOfWeek];
  let message = `⚙️ *${dayName}*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  if (day.is_working_day) {
    message += `🕐 Текущий график: *${day.start_time} — ${day.end_time}*\n\n`;
    message += `Что хотите изменить?`;

    const buttons = [
      [Keyboard.button.callback('🕐 Изменить время начала', `admin_salon_set_start_${dayOfWeek}`)],
      [Keyboard.button.callback('🕐 Изменить время окончания', `admin_salon_set_end_${dayOfWeek}`)],
      [Keyboard.button.callback('❌ Сделать выходным', `admin_salon_toggle_off_${dayOfWeek}`)],
      [Keyboard.button.callback('⬅️ Назад к графику', 'admin_salon_settings')],
    ];

    await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
  } else {
    message += `❌ Сейчас это *выходной день*\n\n`;
    message += `Хотите сделать его рабочим?`;

    const buttons = [
      [Keyboard.button.callback('✅ Сделать рабочим', `admin_salon_toggle_on_${dayOfWeek}`)],
      [Keyboard.button.callback('⬅️ Назад к графику', 'admin_salon_settings')],
    ];

    await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
  }
}

// Жесткие границы часов (меняются только разработчиком)
const MIN_HOUR = 8; // Самое раннее время начала
const MAX_HOUR = 22; // Самое позднее время окончания

// Показать выбор времени начала
async function showStartTimeSelection(ctx, userId, dayOfWeek) {
  const day = getSalonScheduleByDay(dayOfWeek);
  if (!day) {
    await ctx.reply('❌ День не найден.');
    return;
  }

  const dayName = DAYS_FULL[dayOfWeek];
  let message = `🕐 *${dayName}*\n\nТекущее время начала: *${day.start_time}*\n\nВыберите новое время начала:`;

  const buttons = [];
  let row = [];
  // Часы от MIN_HOUR до MAX_HOUR-1 (последний возможный час начала)
  for (let hour = MIN_HOUR; hour < MAX_HOUR; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    row.push(Keyboard.button.callback(timeStr, `admin_salon_time_start_${dayOfWeek}_${timeStr}`));
    if (row.length === 4) {
      buttons.push(row);
      row = [];
    }
  }
  if (row.length > 0) buttons.push(row);

  buttons.push([Keyboard.button.callback('⬅️ Назад', `admin_salon_day_${dayOfWeek}`)]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Показать выбор времени окончания
async function showEndTimeSelection(ctx, userId, dayOfWeek) {
  const day = getSalonScheduleByDay(dayOfWeek);
  if (!day) {
    await ctx.reply('❌ День не найден.');
    return;
  }

  // Минимум — на час больше текущего времени начала
  const currentStartHour = parseInt(day.start_time.split(':')[0]);
  const minHour = currentStartHour + 1;
  // Максимум — MAX_HOUR (включительно)
  const maxHour = MAX_HOUR;

  const dayName = DAYS_FULL[dayOfWeek];
  let message = `🕐 *${dayName}*\n\nТекущее время окончания: *${day.end_time}*\n\nВыберите новое время окончания:`;

  const buttons = [];
  let row = [];
  for (let hour = minHour; hour <= maxHour; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    row.push(Keyboard.button.callback(timeStr, `admin_salon_time_end_${dayOfWeek}_${timeStr}`));
    if (row.length === 4) {
      buttons.push(row);
      row = [];
    }
  }
  if (row.length > 0) buttons.push(row);

  buttons.push([Keyboard.button.callback('⬅️ Назад', `admin_salon_day_${dayOfWeek}`)]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Сделать день выходным
async function toggleDayOff(ctx, userId, dayOfWeek) {
  setDayOff(dayOfWeek);
  const dayName = DAYS_FULL[dayOfWeek];
  await ctx.reply(`✅ *${dayName}* теперь выходной день.`);
  await showSalonSettings(ctx, userId);
}

// Сделать день рабочим
async function toggleDayOn(ctx, userId, dayOfWeek) {
  setDayWorking(dayOfWeek);
  const dayName = DAYS_FULL[dayOfWeek];
  await ctx.reply(`✅ *${dayName}* теперь рабочий день (10:00 — 20:00).`);
  await showSalonSettings(ctx, userId);
}
// Показать разовые выходные салона (10 дней начиная с сегодня)
async function showSalonHolidays(ctx, userId) {
  const { getSalonHolidays } = require('../../database/database');
  const holidays = getSalonHolidays();

  let message = `📅 *Разовые выходные салона*\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Нажмите на день, чтобы сделать его выходным.\n`;
  message += `Повторное нажатие уберет выходной.\n\n`;

  // Показываем уже установленные выходные
  if (holidays.length > 0) {
    message += `✅ *Установленные выходные:*\n`;
    holidays.forEach((h) => {
      const date = new Date(h.holiday_date);
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
      message += `  • ${displayDate}${h.reason ? ` — ${h.reason}` : ''}\n`;
    });
    message += `\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━━\n\nВыберите дату:`;

  // Генерируем 10 дней начиная с сегодня
  const buttons = [];
  const today = new Date();

  for (let i = 0; i < 10; i += 2) {
    const row = [];
    for (let j = 0; j < 2 && i + j < 10; j++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i + j);
      const dateStr = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const dayName = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][date.getDay()];

      // Проверяем, является ли этот день уже выходным
      const isHoliday = holidays.some((h) => h.holiday_date === dateStr);
      const buttonText = isHoliday ? `✅ ${displayDate} ${dayName}` : `${displayDate} ${dayName}`;

      row.push(Keyboard.button.callback(buttonText, `admin_salon_toggle_holiday_${dateStr}`));
    }
    buttons.push(row);
  }

  buttons.push([Keyboard.button.callback('⬅️ Назад к настройкам', 'admin_salon_settings')]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Переключить разовый выходной (добавить/удалить)
async function toggleSalonHoliday(ctx, userId, date) {
  const {
    isSalonHoliday,
    addSalonHoliday,
    removeSalonHoliday,
  } = require('../../database/database');

  const isHoliday = isSalonHoliday(date);

  if (isHoliday) {
    // Удаляем выходной
    removeSalonHoliday(date);
    const displayDate = new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    await ctx.reply(`✅ *${displayDate}* теперь рабочий день.`);
  } else {
    // Добавляем выходной
    addSalonHoliday(date, '');
    const displayDate = new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    await ctx.reply(`✅ *${displayDate}* теперь выходной день.`);
  }

  // Возвращаемся к списку выходных
  await showSalonHolidays(ctx, userId);
}
module.exports = {
  showSalonSettings,
  showDayEditor,
  showStartTimeSelection,
  showEndTimeSelection,
  toggleDayOff,
  toggleDayOn,
  showSalonHolidays, // 🆕
  toggleSalonHoliday, // 🆕
};
