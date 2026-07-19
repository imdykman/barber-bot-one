const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getMastersList,
  toggleMasterActive,
  getMasterById,
  createMaster,
  getMasterServicesWithStatus,
  attachServiceToMaster,
  detachServiceFromMaster,
  getMasterBreaks, // 🆕
  addMasterBreak, // 🆕
  removeMasterBreak, // 🆕
  getMasterBreakById, // 🆕
  getSalonScheduleByDay, // 🆕
  isSalonHoliday, // 🆕
  getWorkingHoursRange, // 🆕
} = require('../../database/database');

// Показать список мастеров
async function showMastersList(ctx) {
  const masters = getMastersList() || [];

  let message = '👨‍💼 *Список мастеров*\n\n';

  if (masters.length === 0) {
    message += 'Пока нет добавленных мастеров.';
  } else {
    message += 'Нажмите на мастера для просмотра и управления:\n\n';
  }

  const buttons = masters.map((m) => [
    Keyboard.button.callback(`${m.is_active ? '✅' : '❌'} ${m.name}`, `master_${m.id}`),
  ]);

  // Кнопки добавляем ВСЕГДА, даже если список пуст
  buttons.push([Keyboard.button.callback('➕ Добавить мастера', 'admin_add_master')]);
  buttons.push([Keyboard.button.callback('← Назад в админку', 'admin_menu')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(message, {
    attachments: [keyboard],
  });
}

// Показать детали мастера
async function showMasterDetails(ctx, masterId) {
  const master = getMasterById(masterId);

  if (!master) {
    await ctx.reply('❌ Мастер не найден');
    return;
  }

  const statusText = master.is_active ? '✅ Активен' : '❌ Неактивен (не принимает записи)';

  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('🔗 Услуги мастера', `master_services_${masterId}`)],
    [Keyboard.button.callback('⏸️ Индивидуальные перерывы', `master_breaks_${masterId}`)],
    [
      Keyboard.button.callback(
        master.is_active ? '🚫 Деактивировать' : '✅ Активировать',
        `toggle_master_${masterId}`
      ),
    ],
    [Keyboard.button.callback('← Назад к списку', 'admin_masters')],
  ]);

  await ctx.reply(
    `👨‍💼 *${master.name}*\n\n` +
      `💇 Специализация: ${master.specialty || 'Не указана'}\n` +
      `📅 Опыт: ${master.experience || 0} лет\n` +
      `${master.description ? `📝 Описание: ${master.description}\n` : ''}` +
      `━━━━━━━━━━━━━━\n` +
      `Статус: ${statusText}`,
    { attachments: [keyboard] }
  );
}

// Переключить статус мастера
async function handleToggleMaster(ctx, masterId) {
  toggleMasterActive(masterId);
  await ctx.reply('✅ Статус мастера успешно изменён');
  await showMasterDetails(ctx, masterId);
}

// Начать добавление мастера (без филиала)
async function startAddMaster(ctx, userId, userStates) {
  console.log(`🚀 [DEBUG] Вызвана startAddMaster для userId: ${userId}`);
  userStates.set(userId, { mode: 'admin_add_master_name' });
  await ctx.reply('➕ *Добавление мастера*\n\nВведите имя мастера:');
}

// Показать список услуг мастера (с возможностью привязать/отвязать)
async function showMasterServices(ctx, masterId) {
  const master = getMasterById(masterId);
  if (!master) {
    await ctx.reply('❌ Мастер не найден');
    return;
  }

  const services = getMasterServicesWithStatus(masterId);

  if (services.length === 0) {
    await ctx.reply('❌ Нет доступных услуг. Сначала добавьте услуги в меню "💈 Услуги".', {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('← Назад к мастеру', `master_${masterId}`)],
        ]),
      ],
    });
    return;
  }

  // Группируем услуги по категории
  const grouped = {};
  services.forEach((s) => {
    if (!grouped[s.category]) grouped[s.category] = [];
    grouped[s.category].push(s);
  });

  let message = `🔗 *Услуги мастера ${master.name}*\n\n`;
  const buttons = [];

  for (const category in grouped) {
    message += `\n📂 *${category}*\n`;
    grouped[category].forEach((s) => {
      const status = s.is_attached ? '✅' : '⬜';
      const priceText = s.is_attached
        ? `${s.master_price}₽ / ${s.master_duration} мин`
        : `${s.price_min}₽ / ${s.duration_minutes} мин`;
      message += `${status} ${s.name} — ${priceText}\n`;

      const action = s.is_attached ? 'detach' : 'attach';
      buttons.push([
        Keyboard.button.callback(
          `${status} ${s.name}`,
          `master_service_${action}_${masterId}_${s.id}`
        ),
      ]);
    });
  }

  buttons.push([Keyboard.button.callback('← Назад к мастеру', `master_${masterId}`)]);

  await ctx.reply(message, {
    attachments: [Keyboard.inlineKeyboard(buttons)],
  });
}

// Переключить привязку услуги к мастеру
async function handleMasterServiceToggle(ctx, masterId, serviceId, action) {
  if (action === 'attach') {
    attachServiceToMaster(masterId, serviceId);
    await ctx.reply('✅ Услуга привязана к мастеру');
  } else if (action === 'detach') {
    detachServiceFromMaster(masterId, serviceId);
    await ctx.reply('🔓 Услуга отвязана от мастера');
  }

  await showMasterServices(ctx, masterId);
}
// ========== ИНДИВИДУАЛЬНЫЕ ПЕРЕРЫВЫ ==========

const DAYS_RU_BREAKS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Показать экран управления перерывами мастера
async function showMasterBreaks(ctx, masterId) {
  const master = getMasterById(masterId);
  if (!master) {
    await ctx.reply('❌ Мастер не найден');
    return;
  }

  const breaks = getMasterBreaks(masterId);

  let message = `⏸️ *Индивидуальные перерывы*\n💇 ${master.name}\n\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  message += `Нажмите на день, чтобы добавить перерыв.\n`;
  message += `Дни, когда салон не работает, не отображаются.\n\n`;

  // Показываем установленные перерывы
  if (breaks.length > 0) {
    message += `📋 *Установленные перерывы:*\n`;
    breaks.forEach((b) => {
      const date = new Date(b.break_date);
      const displayDate = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        weekday: 'short',
      });
      message += `  • ${displayDate}: ${b.start_time} — ${b.end_time}\n`;
    });
    message += `\n━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  }

  message += `Выберите день:`;

  // Генерируем 10 рабочих дней (исключая выходные салона и разовые выходные)
  const buttons = [];
  const today = new Date();
  let addedDays = 0;
  let dayOffset = 0;

  while (addedDays < 10 && dayOffset < 30) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    // Проверяем, рабочий ли это день по графику салона
    const daySchedule = getSalonScheduleByDay(dayOfWeek);
    const isWorkingDay = daySchedule && daySchedule.is_working_day;

    // Проверяем, не разовый ли это выходной
    const isHoliday = isSalonHoliday(dateStr);

    if (isWorkingDay && !isHoliday) {
      const displayDate = date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
      const dayName = DAYS_RU_BREAKS[dayOfWeek];

      // Проверяем, есть ли перерывы в этот день
      const dayBreaks = breaks.filter((b) => b.break_date === dateStr);
      const hasBreaks = dayBreaks.length > 0;
      const buttonText = hasBreaks ? `${displayDate} ${dayName} ⏸️` : `${displayDate} ${dayName}`;

      if (buttons.length === 0 || buttons[buttons.length - 1].length >= 2) {
        buttons.push([]);
      }
      buttons[buttons.length - 1].push(
        Keyboard.button.callback(buttonText, `master_break_day_${masterId}_${dateStr}`)
      );
      addedDays++;
    }
    dayOffset++;
  }

  // Кнопки удаления перерывов
  if (breaks.length > 0) {
    message += `\n\n🗑️ *Удалить перерыв:*`;
    breaks.forEach((b) => {
      const date = new Date(b.break_date);
      const displayDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      buttons.push([
        Keyboard.button.callback(
          `❌ ${displayDate} ${b.start_time}-${b.end_time}`,
          `master_break_del_${b.id}`
        ),
      ]);
    });
  }

  buttons.push([Keyboard.button.callback('⬅️ Назад к мастеру', `master_${masterId}`)]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Показать выбор времени начала перерыва
async function showBreakStartTime(ctx, masterId, date) {
  const master = getMasterById(masterId);
  if (!master) {
    await ctx.reply('❌ Мастер не найден');
    return;
  }

  const range = getWorkingHoursRange();
  const minHour = parseInt(range.minStart.split(':')[0]);
  const maxHour = parseInt(range.maxEnd.split(':')[0]);

  const displayDate = new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
  const message = `🕐 *Перерыв: ${master.name}*\n📅 ${displayDate}\n\nС которого часа начать перерыв?`;

  const buttons = [];
  let row = [];
  for (let hour = minHour; hour < maxHour; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    row.push(
      Keyboard.button.callback(timeStr, `master_break_start_${masterId}_${date}_${timeStr}`)
    );
    if (row.length === 4) {
      buttons.push(row);
      row = [];
    }
  }
  if (row.length > 0) buttons.push(row);

  buttons.push([Keyboard.button.callback('⬅️ Назад', `master_breaks_${masterId}`)]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Показать выбор времени окончания перерыва
async function showBreakEndTime(ctx, masterId, date, startTime) {
  const master = getMasterById(masterId);
  if (!master) {
    await ctx.reply('❌ Мастер не найден');
    return;
  }

  const range = getWorkingHoursRange();
  const startHour = parseInt(startTime.split(':')[0]);
  const maxHour = parseInt(range.maxEnd.split(':')[0]);

  const displayDate = new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
  const message = `🕐 *Перерыв: ${master.name}*\n📅 ${displayDate}\n🕐 Начало: ${startTime}\n\nПо который час?`;

  const buttons = [];
  let row = [];
  for (let hour = startHour + 1; hour <= maxHour; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    row.push(
      Keyboard.button.callback(
        timeStr,
        `master_break_save_${masterId}_${date}_${startTime}_${timeStr}`
      )
    );
    if (row.length === 4) {
      buttons.push(row);
      row = [];
    }
  }
  if (row.length > 0) buttons.push(row);

  buttons.push([Keyboard.button.callback('⬅️ Назад', `master_break_day_${masterId}_${date}`)]);

  await ctx.reply(message, { attachments: [Keyboard.inlineKeyboard(buttons)] });
}

// Сохранить перерыв
async function saveMasterBreak(ctx, userId, masterId, date, startTime, endTime) {
  const master = getMasterById(masterId);
  if (!master) {
    await ctx.reply('❌ Мастер не найден');
    return;
  }

  const breakId = addMasterBreak(masterId, date, startTime, endTime);
  if (breakId) {
    const displayDate = new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });
    await ctx.reply(`✅ Перерыв добавлен: *${displayDate}*, ${startTime} — ${endTime}`);
    await showMasterBreaks(ctx, masterId);
  } else {
    await ctx.reply('❌ Не удалось добавить перерыв. Возможно, он уже существует.');
    await showMasterBreaks(ctx, masterId);
  }
}

// Удалить перерыв
async function deleteMasterBreak(ctx, userId, breakId) {
  const breakItem = getMasterBreakById(breakId);
  if (!breakItem) {
    await ctx.reply('❌ Перерыв не найден');
    return;
  }

  const masterId = breakItem.master_id;
  removeMasterBreak(breakId);

  await ctx.reply('✅ Перерыв удален');
  await showMasterBreaks(ctx, masterId);
}
module.exports = {
  showMastersList,
  showMasterDetails,
  handleToggleMaster,
  startAddMaster,
  showMasterServices,
  handleMasterServiceToggle,
  showMasterBreaks, // 🆕
  showBreakStartTime, // 🆕
  showBreakEndTime, // 🆕
  saveMasterBreak, // 🆕
  deleteMasterBreak, // 🆕
};
