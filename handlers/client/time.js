const { Keyboard } = require('@maxhub/max-bot-api');
const { getFreeTimeSlots } = require('../../database/database');

async function showTimeSlots(ctx, userId, userStates, dateStr) {
  const state = userStates.get(userId);

  if (!state || !state.master_id) {
    await ctx.reply('❌ Ошибка: мастер не выбран.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  // Получаем свободные слоты
  const freeSlots = getFreeTimeSlots(state.master_id, dateStr);

  // Форматируем дату для отображения
  const date = new Date(dateStr);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  // Сохраняем дату в состоянии
  state.booking_date = dateStr;
  userStates.set(userId, state);

  if (freeSlots.length === 0) {
    await ctx.reply(
      `😔 К сожалению, на ${displayDate} нет свободных слотов.\n\n` +
        `Попробуйте выбрать другую дату или другого мастера.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📅 Выбрать другую дату', `master_${state.master_id}`)],
            [Keyboard.button.callback('⬅️ К филиалам', 'start')],
          ]),
        ],
      }
    );
    return;
  }

  // Формируем кнопки времени (по 3 в ряд)
  const timeButtons = [];
  for (let i = 0; i < freeSlots.length; i += 3) {
    const row = [];
    for (let j = 0; j < 3 && i + j < freeSlots.length; j++) {
      const time = freeSlots[i + j];
      row.push(Keyboard.button.callback(`🕐 ${time}`, `time_${time}`));
    }
    timeButtons.push(row);
  }

  // Кнопка "Назад"
  timeButtons.push([Keyboard.button.callback('⬅️ Назад к датам', 'back_to_calendar')]);

  const keyboard = Keyboard.inlineKeyboard(timeButtons);

  await ctx.reply(
    `🕐 *Выберите время записи*\n\n` +
      `Мастер: ${state.master_name}\n` +
      `Дата: ${displayDate}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Свободные слоты:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showTimeSlots };
