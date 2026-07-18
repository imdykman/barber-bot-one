// add-test-schedule.js
const Database = require('better-sqlite3');
const db = new Database('./database/barber-one.db');

console.log('📅 Создаём тестовое расписание для мастера ID=1...\n');

// Очищаем старое расписание (если есть)
db.prepare('DELETE FROM schedule WHERE master_id = 1').run();

// Добавляем расписание: Пн-Пт с 10:00 до 19:00
const scheduleData = [
  { day: 1, start: '10:00', end: '19:00' }, // Пн
  { day: 2, start: '10:00', end: '19:00' }, // Вт
  { day: 3, start: '10:00', end: '19:00' }, // Ср
  { day: 4, start: '10:00', end: '19:00' }, // Чт
  { day: 5, start: '10:00', end: '19:00' }, // Пт
];

scheduleData.forEach((s) => {
  db.prepare(
    `
    INSERT INTO schedule (master_id, day_of_week, start_time, end_time)
    VALUES (1, ?, ?, ?)
  `
  ).run(s.day, s.start, s.end);
});

console.log('✅ Расписание создано:');
console.log('   Пн-Пт: 10:00 - 19:00');
console.log('\n🧹 Удаляем временные файлы...');
