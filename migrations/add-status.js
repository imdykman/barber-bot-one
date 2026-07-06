const { db } = require('../database/database');

console.log('🔄 Добавляем поле status в таблицу bookings...');

try {
  // Проверяем, есть ли уже поле
  const columns = db.prepare('PRAGMA table_info(bookings)').all();
  const hasStatus = columns.some((col) => col.name === 'status');

  if (hasStatus) {
    console.log('✅ Поле status уже существует');
  } else {
    db.exec(`
      ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'confirmed';
    `);
    console.log('✅ Поле status добавлено');
  }
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}

process.exit(0);
