const { Keyboard } = require('@maxhub/max-bot-api');
const { getMaster, getServicesByMaster } = require('../../database/database');

async function showServices(ctx, userId, userStates, masterId) {
  const master = getMaster(masterId);

  if (!master) {
    await ctx.reply('❌ Мастер не найден.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ Назад', 'start')]])],
    });
    return;
  }

  const services = getServicesByMaster(masterId);

  if (services.length === 0) {
    await ctx.reply(`😔 У мастера ${master.name} пока нет доступных услуг.`, {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ Выбрать другого мастера', `branch_${master.branch_id}`)],
        ]),
      ],
    });
    return;
  }

  // Сохраняем выбранного мастера в состоянии
  const state = userStates.get(userId) || {};
  state.master_id = masterId;
  state.master_name = master.name;
  userStates.set(userId, state);

  // Группируем услуги по категориям
  const categories = {};
  services.forEach((service) => {
    if (!categories[service.category]) {
      categories[service.category] = [];
    }
    categories[service.category].push(service);
  });

  // Формируем кнопки услуг
  const serviceButtons = [];

  for (const [category, categoryServices] of Object.entries(categories)) {
    // Заголовок категории
    serviceButtons.push([Keyboard.button.callback(`── ${category} ──`, 'noop')]);

    // Услуги в категории
    categoryServices.forEach((service) => {
      serviceButtons.push([
        Keyboard.button.callback(`${service.name} — ${service.price} ₽`, `service_${service.id}`),
      ]);
    });
  }

  // Кнопка "Назад"
  serviceButtons.push([
    Keyboard.button.callback('⬅️ Назад к мастерам', `branch_${master.branch_id}`),
  ]);

  const keyboard = Keyboard.inlineKeyboard(serviceButtons);

  await ctx.reply(
    `💇 *${master.name}*\n` +
      `✨ ${master.specialty} • Стаж ${master.experience} лет\n` +
      `📝 ${master.description}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Выберите услугу:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showServices };
