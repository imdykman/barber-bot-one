const { Keyboard } = require('@maxhub/max-bot-api');
const { generateBookingsCSV, generateFilename } = require('../../services/export');
const { sendEmailWithAttachment } = require('../../services/email');

// Показать меню экспорта
async function showExportMenu(ctx, userId) {
  const keyboard = Keyboard.inlineKeyboard([
    [Keyboard.button.callback('📅 За сегодня', 'export_today')],
    [Keyboard.button.callback('📆 За неделю', 'export_week')],
    [Keyboard.button.callback('🗓️ За месяц', 'export_month')],
    [Keyboard.button.callback('📋 Все записи', 'export_all')],
    [Keyboard.button.callback('⬅️ Назад в админку', 'admin_menu')],
  ]);

  await ctx.reply(
    `📥 *Экспорт записей в CSV*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Выберите период для выгрузки:\n\n` +
      `Файл будет отправлен на email админа.`,
    { attachments: [keyboard] }
  );
}

// Экспорт записей
async function exportBookings(ctx, userId, period) {
  try {
    const now = new Date();
    let filter = { period };
    let periodText = '';

    switch (period) {
      case 'today':
        filter.dateFrom = now.toISOString().split('T')[0];
        filter.dateTo = filter.dateFrom;
        periodText = 'за сегодня';
        break;

      case 'week':
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        filter.dateFrom = weekAgo.toISOString().split('T')[0];
        filter.dateTo = now.toISOString().split('T')[0];
        periodText = 'за последнюю неделю';
        break;

      case 'month':
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        filter.dateFrom = monthAgo.toISOString().split('T')[0];
        filter.dateTo = now.toISOString().split('T')[0];
        periodText = 'за последний месяц';
        break;

      case 'all':
        periodText = 'все записи';
        break;

      default:
        await ctx.reply('❌ Неизвестный период');
        return;
    }

    // Генерируем CSV
    const { csv, count } = generateBookingsCSV(filter);

    if (count === 0) {
      await ctx.reply(`📭 Нет записей ${periodText}.\n\n` + `Попробуйте выбрать другой период.`, {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('⬅️ К экспорту', 'admin_export')],
            [Keyboard.button.callback('🏠 В админку', 'admin_menu')],
          ]),
        ],
      });
      return;
    }

    // Формируем имя файла
    const filename = generateFilename(filter);

    // Отправляем email с вложением
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      await ctx.reply('❌ ADMIN_EMAIL не указан в .env');
      return;
    }

    const subject = `📊 Экспорт записей ${periodText} (${count} записей)`;
    const text = `Во вложении — файл CSV с записями ${periodText}.\n\nВсего записей: ${count}\n\nФайл можно открыть в Excel.`;

    await sendEmailWithAttachment(adminEmail, subject, text, {
      filename,
      content: Buffer.from(csv, 'utf-8'),
      contentType: 'text/csv; charset=utf-8',
    });

    await ctx.reply(
      `✅ *Экспорт выполнен!*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📧 Файл отправлен на email: ${adminEmail}\n\n` +
        `📊 Период: ${periodText}\n` +
        `📋 Записей: ${count}\n` +
        `📄 Файл: ${filename}\n\n` +
        `Откройте файл в Excel для просмотра.`,
      {
        attachments: [
          Keyboard.inlineKeyboard([
            [Keyboard.button.callback('📥 Ещё экспорт', 'admin_export')],
            [Keyboard.button.callback('🏠 В админку', 'admin_menu')],
          ]),
        ],
      }
    );

    console.log(`📥 Экспорт: ${count} записей ${periodText}, отправлено на ${adminEmail}`);
  } catch (error) {
    console.error('❌ Ошибка экспорта:', error.message);
    await ctx.reply(`❌ Ошибка при экспорте:\n\n${error.message}`, {
      attachments: [
        Keyboard.inlineKeyboard([
          [Keyboard.button.callback('⬅️ К экспорту', 'admin_export')],
          [Keyboard.button.callback('🏠 В админку', 'admin_menu')],
        ]),
      ],
    });
  }
}

module.exports = {
  showExportMenu,
  exportBookings,
};
