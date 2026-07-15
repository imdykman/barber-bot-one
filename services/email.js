const nodemailer = require('nodemailer');

// Создаём транспорт для отправки email
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Отправка email админу при новой записи
// Добавили второй параметр clientUserId (по умолчанию null)
async function notifyNewBooking(booking, clientUserId = null) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('⚠️ ADMIN_EMAIL не указан, email не отправлен');
    return;
  }

  const date = new Date(booking.booking_date);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  const subject = `✂️ Новая запись: ${booking.client_name} — ${displayDate} в ${booking.booking_time}`;

  // 🆕 Проверяем, есть ли у клиента MAX ID (user_id)
  // Если берем из booking.user_id или из переданного clientUserId
  const hasMaxId = clientUserId || booking.user_id;

  // Формируем блок предупреждения, если MAX ID нет
  const warningBlock = !hasMaxId
    ? `<tr>
         <td colspan="2" style="padding: 12px; border: 2px solid #ff9800; background-color: #fff3e0; color: #e65100; font-weight: bold; text-align: center; border-radius: 4px;">
           📞 ВНИМАНИЕ: Клиент записался через веб и не имеет MAX-аккаунта.<br>
           Не забудьте позвонить и подтвердить запись по телефону: <strong>${booking.client_phone}</strong>
         </td>
       </tr>`
    : '';

  const html = `
    <h2>✂️ Новая запись в салоне "Ножницы&Ко"</h2>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      ${warningBlock}
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Клиент:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.client_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Телефон:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.client_phone}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Дата:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${displayDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Время:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.booking_time}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Мастер:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.master_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Услуга:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.service_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Стоимость:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.service_price} ₽</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Филиал:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.branch_name}</td>
      </tr>
    </table>
    <p style="margin-top: 20px; color: #666;">
      Запись #${booking.id}
    </p>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminEmail,
      subject,
      html,
    });
    console.log(`📧 Email отправлен админу: новая запись #${booking.id}`);
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error.message);
  }
}

// Отправка email админу при изменении статуса записи
async function notifyBookingStatusChange(booking, oldStatus, newStatus) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.log('⚠️ ADMIN_EMAIL не указан, email не отправлен');
    return;
  }

  const date = new Date(booking.booking_date);
  const displayDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });

  const statusText = {
    confirmed: '✅ Подтверждено',
    cancelled: '❌ Отменено',
    completed: '✓ Завершено',
    pending: '⏳ Ожидает',
  };

  const subject = `🔄 Изменение записи #${booking.id}: ${statusText[newStatus] || newStatus}`;

  const html = `
    <h2>🔄 Изменение записи в салоне "Ножницы&Ко"</h2>
    <p><strong>Запись #${booking.id}</strong></p>
    <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Клиент:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.client_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Телефон:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.client_phone}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Дата:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${displayDate} в ${booking.booking_time}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Мастер:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.master_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Услуга:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${booking.service_name}</td>
      </tr>
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Статус:</td>
        <td style="padding: 8px; border: 1px solid #ddd;">
          ${statusText[oldStatus] || oldStatus} → ${statusText[newStatus] || newStatus}
        </td>
      </tr>
    </table>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: adminEmail,
      subject,
      html,
    });
    console.log(`📧 Email отправлен админу: запись #${booking.id} изменена на ${newStatus}`);
  } catch (error) {
    console.error('❌ Ошибка отправки email:', error.message);
  }
}
// Отправка email с вложением (CSV)
async function sendEmailWithAttachment(to, subject, text, attachment) {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      attachments: [attachment],
    });
    console.log(`📧 Email с вложением отправлен на ${to}`);
  } catch (error) {
    console.error('❌ Ошибка отправки email с вложением:', error.message);
    throw error;
  }
}
module.exports = {
  notifyNewBooking,
  notifyBookingStatusChange,
  sendEmailWithAttachment,
};
