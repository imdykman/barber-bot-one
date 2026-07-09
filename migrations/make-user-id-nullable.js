const { db } = require('../database/database');

console.log('🔄 Миграция: делаем user_id nullable в таблице clients...');

try {
  // Отключаем проверку внешних ключей на время миграции
  db.pragma('foreign_keys = OFF');

  // Удаляем временную таблицу, если осталась
  db.exec('DROP TABLE IF EXISTS clients_new');

  // Выполняем миграцию
  db.exec(`
    -- Создаём временную таблицу
    CREATE TABLE clients_new (
      id INTEGER PRIMARY KEY,
      user_id INTEGER UNIQUE,
      name TEXT,
      phone TEXT
    );
    
    -- Копируем данные
    INSERT INTO clients_new (id, user_id, name, phone)
    SELECT id, user_id, name, phone FROM clients;
    
    -- Удаляем старую таблицу
    DROP TABLE clients;
    
    -- Переименовываем новую
    ALTER TABLE clients_new RENAME TO clients;
  `);

  // Включаем проверку внешних ключей обратно
  db.pragma('foreign_keys = ON');

  console.log('✅ Миграция завершена: user_id теперь может быть NULL');
} catch (error) {
  // В случае ошибки всё равно включаем foreign_keys
  try {
    db.pragma('foreign_keys = ON');
  } catch (e) {}

  console.error('❌ Ошибка миграции:', error.message);
}
