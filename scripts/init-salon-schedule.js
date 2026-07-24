// scripts/init-salon-schedule.js
// Скрипт для инициализации графика работы салона (таблица salon_schedule)
// Запуск: node scripts/init-salon-schedule.js

const Database = require('better-sqlite3');
const path = require('path');

// Путь к базе данных (относительно корня проекта)
const dbPath = path.join(__dirname, '..', 'database', 'barber-one.db');
const db = new Database(dbPath);

console.log('📅 Инициализация графика работы салона...\n');
console.log(`📂 База данных: ${dbPath}\n`);

// Создаем таблицу, если её нет
db.exec(`
  CREATE TABLE IF NOT EXISTS salon_schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_of_week INTEGER NOT NULL UNIQUE,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_working_day INTEGER DEFAULT 1
  )
`);
console.log('✅ Таблица salon_schedule создана (или уже существует)');

// Очищаем старые данные
db.prepare('DELETE FROM salon_schedule').run();
console.log('🧹 Старые данные очищены');

// Дефолтный график: Пн-Вс, 10:00-20:00, все дни рабочие
const defaultSchedule = [
  { day: 1, start: '10:00', end: '20:00', working: 1 }, // Пн
  { day: 2, start: '10:00', end: '20:00', working: 1 }, // Вт
  { day: 3, start: '10:00', end: '20:00', working: 1 }, // Ср
  { day: 4, start: '10:00', end: '20:00', working: 1 }, // Чт
  { day: 5, start: '10:00', end: '20:00', working: 1 }, // Пт
  { day: 6, start: '10:00', end: '20:00', working: 1 }, // Сб
  { day: 0, start: '10:00', end: '20:00', working: 1 }, // Вс
];

const insert = db.prepare(`
  INSERT INTO salon_schedule (day_of_week, start_time, end_time, is_working_day)
  VALUES (?, ?, ?, ?)
`);

defaultSchedule.forEach(s => {
  insert.run(s.day, s.start, s.end, s.working);
});

console.log('✅ График салона инициализирован:\n');

const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const schedule = db.prepare('SELECT * FROM salon_schedule ORDER BY day_of_week').all();

schedule.forEach(s => {
  const status = s.is_working_day ? '✅ Рабочий' : '❌ Выходной';
  console.log(`  ${days[s.day_of_week]}: ${s.start_time} - ${s.end_time} | ${status}`);
});

console.log('\n🎉 Готово! Теперь можно удалять этот скрипт или оставить для повторного использования.');