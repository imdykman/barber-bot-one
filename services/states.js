const { db } = require('../database/database');

// ========== РАБОТА С СОСТОЯНИЯМИ В БД ==========

function get(userId) {
  const row = db.prepare('SELECT state_data FROM user_states WHERE user_id = ?').get(userId);
  if (!row) return null;

  try {
    return JSON.parse(row.state_data);
  } catch (error) {
    console.error(`❌ Ошибка парсинга состояния для userId ${userId}:`, error.message);
    return null;
  }
}

function set(userId, state) {
  const now = new Date().toISOString();
  const stateData = JSON.stringify(state);

  db.prepare(
    `
    INSERT INTO user_states (user_id, state_data, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      state_data = excluded.state_data,
      updated_at = excluded.updated_at
  `
  ).run(userId, stateData, now);
}

function deleteState(userId) {
  db.prepare('DELETE FROM user_states WHERE user_id = ?').run(userId);
}

// Очистка старых состояний (старше 24 часов)
function cleanupOldStates() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const result = db.prepare('DELETE FROM user_states WHERE updated_at < ?').run(oneDayAgo);

  if (result.changes > 0) {
    console.log(`🧹 Очищено ${result.changes} старых состояний`);
  }
}

// Экспортируем объект с тем же API, что и раньше
const userStates = {
  get,
  set,
  delete: deleteState,
};

module.exports = { userStates, cleanupOldStates };
