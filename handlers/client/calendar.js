const { Keyboard } = require('@maxhub/max-bot-api');

async function showCalendar(ctx, userId, userStates) {
  const state = userStates.get(userId);

  if (!state || !state.master_id) {
    await ctx.reply('❌ Ошибка: мастер не выбран.', {
      attachments: [Keyboard.inlineKeyboard([[Keyboard.button.callback('⬅️ В начало', 'start')]])],
    });
    return;
  }

  // Генерируем даты на 7 дней вперёд (включая сегодня)
  const dates = [];
  const today = new Date();

  for (let i = 0; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    dates.push({
      date: date,
      dateStr: date.toISOString().split('T')[0], // YYYY-MM-DD
      displayDate: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }),
      dayOfWeek: date.toLocaleDateString('ru-RU', { weekday: 'long' }),
      isToday: i === 0,
    });
  }

  // Формируем кнопки дат
  const dateButtons = dates.map((d) => {
    const emoji = d.isToday ? '📅' : '🗓️';
    return [
      Keyboard.button.callback(`${emoji} ${d.displayDate} (${d.dayOfWeek})`, `date_${d.dateStr}`),
    ];
  });

  // Кнопка "Назад"
  dateButtons.push([Keyboard.button.callback('⬅️ Назад к услугам', `master_${state.master_id}`)]);

  const keyboard = Keyboard.inlineKeyboard(dateButtons);

  await ctx.reply(
    `📅 *Выберите дату записи*\n\n` +
      `Мастер: ${state.master_name}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Доступные даты на ближайшие 7 дней:`,
    { attachments: [keyboard] }
  );
}

module.exports = { showCalendar };
