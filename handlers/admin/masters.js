const { Keyboard } = require('@maxhub/max-bot-api');
const { getMastersList, toggleMasterActive, getMasterById } = require('../../database/database');

// Показать список мастеров
async function showMastersList(ctx) {
  const masters = getMastersList();

  if (!masters || masters.length === 0) {
    await ctx.reply('❌ Мастера не найдены');
    return;
  }

  const buttons = masters.map((m) => [
    Keyboard.button.callback(
      `${m.is_active ? '✅' : '❌'} ${m.name} (${m.branch_name})`,
      `master_${m.id}`
    ),
  ]);
  buttons.push([Keyboard.button.callback('➕ Добавить мастера', 'admin_add_master')]);
  buttons.push([Keyboard.button.callback('← Назад в админку', 'admin_menu')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(`👨‍💼 *Список мастеров*\n\nНажмите на мастера для просмотра и управления:`, {
    attachments: [keyboard],
  });

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(`👨‍💼 *Список мастеров*\n\nНажмите на мастера для просмотра и управления:`, {
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
      `🏢 Филиал: ${master.branch_name}\n` +
      `💇 Специализация: ${master.specialty}\n` +
      `📅 Опыт: ${master.experience} лет\n` +
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

// Начать добавление мастера
async function startAddMaster(ctx, userId, userStates) {
  console.log(`🚀 [DEBUG] Вызвана startAddMaster для userId: ${userId}`);

  // Устанавливаем режим ожидания имени
  userStates.set(userId, { mode: 'admin_add_master_name' });
  console.log(`💾 [DEBUG] Состояние сохранено:`, userStates.get(userId));

  await ctx.reply('➕ *Добавление мастера*\n\nВведите имя мастера:');
  console.log(`📤 [DEBUG] Сообщение "Введите имя мастера" отправлено`);
}
// Обработка выбора филиала при добавлении
async function handleAddMasterBranch(ctx, userId, branchId, userStates) {
  const state = userStates.get(userId) || {};

  const newMasterId = createMaster(
    branchId,
    state.temp_name,
    state.temp_specialty,
    state.temp_experience,
    '', // description
    null // photo_url (можно добавить позже)
  );

  userStates.delete(userId); // Очищаем состояние

  await ctx.reply(`✅ Мастер *${state.temp_name}* успешно добавлен!`, {
    attachments: [
      Keyboard.inlineKeyboard([
        [Keyboard.button.callback('⬅️ К списку мастеров', 'admin_masters')],
      ]),
    ],
  });
}

module.exports = {
  showMastersList,
  showMasterDetails,
  handleToggleMaster,
  startAddMaster,
  handleAddMasterBranch,
};
