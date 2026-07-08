const { db } = require('../database/database');

console.log('🔄 Создаём таблицу user_states...');

try {
  // Проверяем, есть ли уже таблица
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user_states'")
    .all();

  if (tables.length > 0) {
    console.log('✅ Таблица user_states уже существует');
  } else {
    db.exec(`
      CREATE TABLE user_states (
        user_id INTEGER PRIMARY KEY,
        state_data TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    console.log('✅ Таблица user_states создана');
  }

  // Создаём индекс для быстрого поиска по updated_at (для очистки старых)
  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_user_states_updated'")
    .all();

  if (indexes.length === 0) {
    db.exec(`CREATE INDEX idx_user_states_updated ON user_states(updated_at)`);
    console.log('✅ Индекс создан');
  } else {
    console.log('✅ Индекс уже существует');
  }
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}

process.exit(0);
