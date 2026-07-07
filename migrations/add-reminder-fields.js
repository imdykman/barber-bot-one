const { db } = require('../database/database');

console.log('🔄 Добавляем поля для напоминаний в таблицу bookings...');

try {
  const columns = db.prepare('PRAGMA table_info(bookings)').all();

  // Проверяем и добавляем reminder_24h_sent
  if (!columns.some((col) => col.name === 'reminder_24h_sent')) {
    db.exec(`ALTER TABLE bookings ADD COLUMN reminder_24h_sent INTEGER DEFAULT 0`);
    console.log('✅ Поле reminder_24h_sent добавлено');
  } else {
    console.log('✅ Поле reminder_24h_sent уже существует');
  }

  // Проверяем и добавляем reminder_1h_sent
  if (!columns.some((col) => col.name === 'reminder_1h_sent')) {
    db.exec(`ALTER TABLE bookings ADD COLUMN reminder_1h_sent INTEGER DEFAULT 0`);
    console.log('✅ Поле reminder_1h_sent добавлено');
  } else {
    console.log('✅ Поле reminder_1h_sent уже существует');
  }
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}

process.exit(0);
