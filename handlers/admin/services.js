const { Keyboard } = require('@maxhub/max-bot-api');
const { getServicesList, toggleServiceActive, getServiceById } = require('../../database/database');

// Показать список услуг
async function showServicesList(ctx) {
  const services = getServicesList();

  if (!services || services.length === 0) {
    await ctx.reply('❌ Услуги не найдены');
    return;
  }

  const buttons = services.map((s) => {
    const price = s.price_max ? `${s.price_min}-${s.price_max}₽` : `${s.price_min}₽`;
    return [
      Keyboard.button.callback(
        `${s.is_active ? '✅' : '❌'} ${s.name} (${price})`,
        `service_${s.id}`
      ),
    ];
  });

  buttons.push([Keyboard.button.callback('← Назад в админку', 'admin_menu')]);

  const keyboard = Keyboard.inlineKeyboard(buttons);

  await ctx.reply(`💈 *Список услуг*\n\nНажмите на услугу для просмотра и управления:`, {
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

module.exports = {
  showServicesList,
  showServiceDetails,
  handleToggleService,
};
