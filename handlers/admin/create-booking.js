const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getBranches,
  getMastersByBranch,
  getServicesByMaster,
  getFreeTimeSlots,
  createBooking,
  getOrCreateClient,
} = require('../../database/database');

// ========== ШАГ 1: ВЫБОР ФИЛИАЛА ==========

async function showBranchSelection(ctx, userId) {
  const branches = getBranches();

  const branchButtons = branches.map((branch) => [
    Keyboard.button.callback(`🏢 ${branch.name}`, `admin_book_branch_${branch.id}`),
  ]);

  branchButtons.push([Keyboard.button.callback('❌ Отмена', 'admin_menu')]);

  const keyboard = Keyboard.inlineKeyboard(branchButtons);

  await ctx.reply(
    `📝 *Создание записи*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Шаг 1/6: Выберите филиал`,
    { attachments: [keyboard] }
  );
}

// ========== ШАГ 2: ВЫБОР МАСТЕРА ==========

async function showMasterSelection(ctx, userId, branchId) {
  const masters = getMastersByBranch(branchId);

  if (masters.length === 0) {
    await ctx.reply(`❌ В этом филиале нет мастеров.\n\nВыберите другой филиал.`, {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ К филиалам', 'admin_create_booking')],
        ]),
      ],
    });
    return;
  }

  const masterButtons = masters.map((master) => [
    Keyboard.button.callback(`💇 ${master.name}`, `admin_book_master_${master.id}`),
  ]);

  masterButtons.push([Keyboard.button.callback('⬅️ Назад', 'admin_create_booking')]);

  const keyboard = Keyboard.inlineKeyboard(masterButtons);

  await ctx.reply(
    `📝 *Создание записи*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Шаг 2/6: Выберите мастера`,
    { attachments: [keyboard] }
  );
}

// ========== ШАГ 3: ВЫБОР УСЛУГИ ==========

async function showServiceSelection(ctx, userId, masterId) {
  const services = getServicesByMaster(masterId);

  if (services.length === 0) {
    await ctx.reply(`❌ У этого мастера нет услуг.\n\nВыберите другого мастера.`, {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ К мастерам', 'admin_create_booking')],
        ]),
      ],
    });
    return;
  }

  const serviceButtons = services.map((service) => [
    Keyboard.button.callback(
      `💈 ${service.name} (${service.duration_minutes} мин) — ${service.price} ₽`,
      `admin_book_service_${service.id}`
    ),
  ]);

  serviceButtons.push([Keyboard.button.callback('⬅️ Назад', 'admin_create_booking')]);

  const keyboard = Keyboard.inlineKeyboard(serviceButtons);

  await ctx.reply(
    `📝 *Создание записи*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Шаг 3/6: Выберите услугу`,
    { attachments: [keyboard] }
  );
}

// ========== ШАГ 4: ВЫБОР ДАТЫ ==========

async function showDateSelection(ctx, userId) {
  const dates = [];
  const today = new Date();

  for (let i = 0; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    dates.push({
      dateStr: date.toISOString().split('T')[0],
      displayDate: date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
      }),
      isToday: i === 0,
    });
  }

  const dateButtons = dates.map((d) => {
    const emoji = d.isToday ? '📅' : '🗓️';
    return [Keyboard.button.callback(`${emoji} ${d.displayDate}`, `admin_book_date_${d.dateStr}`)];
  });

  dateButtons.push([Keyboard.button.callback('⬅️ Назад', 'admin_create_booking')]);

  const keyboard = Keyboard.inlineKeyboard(dateButtons);

  await ctx.reply(
    `📝 *Создание записи*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Шаг 4/6: Выберите дату`,
    { attachments: [keyboard] }
  );
}

// ========== ШАГ 5: ВЫБОР ВРЕМЕНИ ==========

async function showTimeSelection(ctx, userId, date) {
  const state = require('../../services/states').userStates.get(userId);
  const freeSlots = getFreeTimeSlots(state.master_id, date, state.service_id);

  if (freeSlots.length === 0) {
    await ctx.reply(`❌ Нет свободных слотов на эту дату.\n\nВыберите другую дату.`, {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ К датам', 'admin_create_booking')]]),
      ],
    });
    return;
  }

  const timeButtons = freeSlots.map((time) => [
    Keyboard.button.callback(`🕐 ${time}`, `admin_book_time_${time}`),
  ]);

  timeButtons.push([Keyboard.button.callback('⬅️ Назад', 'admin_create_booking')]);

  const keyboard = Keyboard.inlineKeyboard(timeButtons);

  await ctx.reply(
    `📝 *Создание записи*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Шаг 5/6: Выберите время`,
    { attachments: [keyboard] }
  );
}

// ========== ШАГ 6: ВВОД ДАННЫХ КЛИЕНТА ==========

async function showClientForm(ctx, userId) {
  await ctx.reply(
    `📝 *Создание записи*\n\n` + `━━━━━━━━━━━━━━━━━━━━━━\n\n` + `Шаг 6/6: Введите имя клиента`,
    {
      attachments: [
        Keyboard.inlineKeyboard([[Keyboard.button.callback('❌ Отмена', 'admin_menu')]]),
      ],
    }
  );
}

// ========== СОЗДАНИЕ ЗАПИСИ ==========

async function createBookingByAdmin(ctx, userId, clientName, clientPhone) {
  const { userStates } = require('../../services/states');
  const state = userStates.get(userId);

  if (
    !state ||
    !state.branch_id ||
    !state.master_id ||
    !state.service_id ||
    !state.booking_date ||
    !state.booking_time
  ) {
    await ctx.reply('❌ Ошибка: не все данные заполнены. Начните заново.');
    return;
  }

  try {
    // Создаём или получаем клиента
    const clientId = getOrCreateClient(null, clientName, clientPhone);

    // Создаём запись
    const bookingId = createBooking(
      clientId,
      state.master_id,
      state.service_id,
      state.branch_id,
      state.booking_date,
      state.booking_time,
      'confirmed'
    );

    // Очищаем состояние
    userStates.delete(userId);

    // Формируем подтверждение
    const date = new Date(state.booking_date);
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });

    await ctx.reply(
      `✅ *Запись создана!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 Клиент: ${clientName}\n` +
        `📱 Телефон: ${clientPhone}\n` +
        `📅 Дата: ${displayDate}\n` +
        `🕐 Время: ${state.booking_time}\n` +
        `🆔 ID записи: #${bookingId}\n\n` +
        `Запись добавлена в систему.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📝 Ещё запись', 'admin_create_booking')],
            [Keyboard.button.callback('🏠 В админку', 'admin_menu')],
          ]),
        ],
      }
    );

    console.log(`📝 Админ создал запись #${bookingId} для клиента ${clientName}`);
  } catch (error) {
    console.error('❌ Ошибка создания записи:', error.message);
    await ctx.reply(`❌ Ошибка: ${error.message}`);
  }
}

module.exports = {
  showBranchSelection,
  showMasterSelection,
  showServiceSelection,
  showDateSelection,
  showTimeSelection,
  showClientForm,
  createBookingByAdmin,
};
