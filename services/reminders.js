const { db } = require('../database/database');

// Интервал проверки (каждый час)
const CHECK_INTERVAL = 60 * 60 * 1000; // 1 час в миллисекундах

// Получаем записи, которые нужно напомнить
function getBookingsForReminder(hoursBefore) {
  const now = new Date();
  const targetTime = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);

  // Окно проверки: ±30 минут от целевого времени
  const windowStart = new Date(targetTime.getTime() - 30 * 60 * 1000);
  const windowEnd = new Date(targetTime.getTime() + 30 * 60 * 1000);

  const targetDate = targetTime.toISOString().split('T')[0];
  const targetHour = targetTime.getHours();
  const targetMinute = targetTime.getMinutes();

  // Получаем записи на целевую дату
  const bookings = db
    .prepare(
      `
    SELECT b.*, c.user_id as client_user_id, c.name as client_name,
           m.name as master_name, s.name as service_name,
           br.name as branch_name
    FROM bookings b
    JOIN clients c ON b.client_id = c.id
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    JOIN branches br ON b.branch_id = br.id
    WHERE b.booking_date = ? 
      AND b.status = 'confirmed'
      AND b.reminder_${hoursBefore}h_sent = 0
  `
    )
    .all(targetDate);

  // Фильтруем по времени (в пределах окна)
  return bookings.filter((booking) => {
    const [bookingHour, bookingMinute] = booking.booking_time.split(':').map(Number);
    const bookingMinutes = bookingHour * 60 + bookingMinute;
    const targetMinutes = targetHour * 60 + targetMinute;

    // Проверяем, что время записи в пределах окна
    return Math.abs(bookingMinutes - targetMinutes) <= 30;
  });
}

// Отправка напоминания через MAX API
async function sendReminder(bot, booking, hoursBefore) {
  try {
    const date = new Date(booking.booking_date);
    const displayDate = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    });

    const timeText = hoursBefore === 24 ? 'завтра' : 'через час';

    const message =
      `⏰ *Напоминание о записи*\n\n` +
      `Ваша запись ${timeText}:\n\n` +
      `📅 ${displayDate} в ${booking.booking_time}\n` +
      `💇 ${booking.master_name}\n` +
      `💈 ${booking.service_name}\n` +
      `🏢 ${booking.branch_name}\n\n` +
      `Ждём вас! 💚`;

    // ✅ Правильный метод из SDK
    await bot.api.sendMessageToUser(booking.client_user_id, message);

    console.log(
      `⏰ Напоминание отправлено клиенту ${booking.client_name} (за ${hoursBefore}ч до записи #${booking.id})`
    );

    // Помечаем, что напоминание отправлено
    db.prepare(`UPDATE bookings SET reminder_${hoursBefore}h_sent = 1 WHERE id = ?`).run(
      booking.id
    );
  } catch (error) {
    console.error(
      `❌ Ошибка отправки напоминания клиенту ${booking.client_user_id}:`,
      error.message
    );
  }
}

// Проверка и отправка напоминаний
async function checkAndSendReminders(bot) {
  console.log('🔍 Проверка напоминаний...');

  // Напоминания за 24 часа
  const bookings24h = getBookingsForReminder(24);
  for (const booking of bookings24h) {
    await sendReminder(bot, booking, 24);
  }

  // Напоминания за 1 час
  const bookings1h = getBookingsForReminder(1);
  for (const booking of bookings1h) {
    await sendReminder(bot, booking, 1);
  }

  console.log(
    `✅ Проверка завершена: отправлено ${bookings24h.length} (24ч) + ${bookings1h.length} (1ч) напоминаний`
  );
}

// Запуск периодической проверки
function startReminderScheduler(bot) {
  console.log('⏰ Планировщик напоминаний запущен (проверка каждый час)');

  // Первоначальная проверка через 10 секунд после старта
  setTimeout(() => {
    checkAndSendReminders(bot);
  }, 10000);

  // Периодическая проверка
  setInterval(() => {
    checkAndSendReminders(bot);
  }, CHECK_INTERVAL);
}

module.exports = {
  startReminderScheduler,
  checkAndSendReminders,
};
