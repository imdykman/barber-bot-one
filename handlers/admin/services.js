const { Keyboard } = require('@maxhub/max-bot-api');
const { getServicesList, toggleServiceActive, getServiceById } = require('../../database/database');

// Показать список услуг
async function showServicesList(ctx) {
  const services = getServicesList() || [];

  let message = '💈 *Список услуг*\n\n';

  if (services.length === 0) {
    message += 'Пока нет добавленных услуг.';
  } else {
    message += 'Нажмите на услугу для просмотра и управления:\n\n';
  }

  const buttons = services.map((s) => [
    Keyboard.button.callback(
      `${s.is_active ? '✅' : '❌'} ${s.name} (${s.price_min}₽)`,
      `service_${s.id}`
    ),
  ]);

  // Кнопки добавляем ВСЕГДА, даже если список пуст
  buttons.push([Keyboard.button.callback('➕ Добавить услугу', 'admin_add_service')]);
  buttons.push([Keyboard.button.callback('← Назад в админку', 'admin_menu')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(message, {
    attachments: [keyboard],
  });
}

// Показать детали услуги
async function showServiceDetails(ctx, serviceId) {
  const service = getServiceById(serviceId);

  if (!service) {
    await ctx.reply('❌ Услуга не найдена');
    return;
  }

  const statusText = service.is_active ? '✅ Активна' : '❌ Неактивна (скрыта из записи)';
  const priceText = service.price_max
    ? `${service.price_min} - ${service.price_max} ₽`
    : `${service.price_min} ₽`;

  const keyboard = Keyboard.inlineKeyboard([
    [
      Keyboard.button.callback(
        service.is_active ? '🚫 Деактивировать' : '✅ Активировать',
        `toggle_service_${serviceId}`
      ),
    ],
    [Keyboard.button.callback('← Назад к списку', 'admin_services')],
  ]);

  await ctx.reply(
    `💈 *${service.name}*\n\n` +
      `📂 Категория: ${service.category}\n` +
      `💰 Цена: ${priceText}\n` +
      `⏱️ Длительность: ${service.duration_minutes} мин\n` +
      `${service.description ? `📝 Описание: ${service.description}\n` : ''}` +
      `━━━━━━━━━━━━━━\n` +
      `Статус: ${statusText}`,
    { attachments: [keyboard] }
  );
}

// Переключить статус услуги
async function handleToggleService(ctx, serviceId) {
  toggleServiceActive(serviceId);
  await ctx.reply('✅ Статус услуги успешно изменён');
  await showServiceDetails(ctx, serviceId);
}

// Начать добавление услуги
async function startAddService(ctx, userId, userStates) {
  userStates.set(userId, { mode: 'admin_add_service_name' });
  await ctx.reply('➕ *Добавление услуги*\n\nВведите название услуги (например: Мужская стрижка):');
}

module.exports = {
  showServicesList,
  showServiceDetails,
  handleToggleService,
  startAddService,
};
