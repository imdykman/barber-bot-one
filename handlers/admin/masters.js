const { Keyboard } = require('@maxhub/max-bot-api');
const {
  getMastersList,
  toggleMasterActive,
  getMasterById,
  getBranches,
  createMaster,
} = require('../../database/database');

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
  userStates.set(userId, { mode: 'admin_add_master_name' });
  console.log(`💾 [DEBUG] Состояние сохранено:`, userStates.get(userId));
  await ctx.reply('➕ *Добавление мастера*\n\nВведите имя мастера:');
}

// Обработка выбора филиала при добавлении
async function handleAddMasterBranch(ctx, userId, branchId, userStates) {
  console.log(`🚀 [DEBUG] Вызвана handleAddMasterBranch`);
  console.log(`   - userId: ${userId}`);
  console.log(`   - branchId: ${branchId}`);

  const state = userStates.get(userId) || {};
  console.log(`   - state:`, state);

  try {
    const newMasterId = createMaster(
      branchId,
      state.temp_name || 'Без имени',
      state.temp_specialty || 'Специалист',
      state.temp_experience || 0,
      '',
      null
    );
    console.log(`✅ [DEBUG] Мастер создан с ID: ${newMasterId}`);

    userStates.delete(userId);

    await ctx.reply(`✅ Мастер *${state.temp_name}* успешно добавлен!`, {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ К списку мастеров', 'admin_masters')],
        ]),
      ],
    });
  } catch (error) {
    console.error(`❌ [DEBUG] Ошибка создания мастера:`, error.message);
    await ctx.reply(`❌ Ошибка при создании мастера: ${error.message}`);
  }
}

module.exports = {
  showMastersList,
  showMasterDetails,
  handleToggleMaster,
  startAddMaster,
  handleAddMasterBranch,
};
