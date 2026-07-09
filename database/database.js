const Database = require('better-sqlite3');
const path = require('path');

// Подключаемся к БД (создастся автоматически)
const db = new Database('database/barber.db');

// Включаем WAL-режим для лучшей производительности
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== СОЗДАНИЕ ТАБЛИЦ ==========

// Филиалы
db.exec(`
  CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT,
    work_hours TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Мастера
db.exec(`
  CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    experience INTEGER DEFAULT 0,
    description TEXT,
    photo_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  )
`);

// Услуги
db.exec(`
  CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price_min INTEGER NOT NULL,
    price_max INTEGER,
    duration_minutes INTEGER NOT NULL,
    description TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Связь мастер-услуга (с ценой и длительностью для конкретного мастера)
db.exec(`
  CREATE TABLE IF NOT EXISTS master_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    price INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL,
    FOREIGN KEY (master_id) REFERENCES masters(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    UNIQUE(master_id, service_id)
  )
`);

// График работы мастеров
db.exec(`
  CREATE TABLE IF NOT EXISTS schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    FOREIGN KEY (master_id) REFERENCES masters(id),
    UNIQUE(master_id, day_of_week)
  )
`);

// Клиенты
db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Записи
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    master_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    branch_id INTEGER NOT NULL,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (master_id) REFERENCES masters(id),
    FOREIGN KEY (service_id) REFERENCES services(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  )
`);

// Админы
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    user_id INTEGER PRIMARY KEY,
    name TEXT,
    role TEXT DEFAULT 'admin',
    branch_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  )
`);

// Выходные/праздники (когда мастер не работает)
db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER,
    branch_id INTEGER,
    holiday_date TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (master_id) REFERENCES masters(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
  )
`);

// ========== ЭКСПОРТ ФУНКЦИЙ ==========

// Получить все активные филиалы
function getBranches() {
  return db.prepare('SELECT * FROM branches WHERE is_active = 1').all();
}

// Получить филиал по ID
function getBranch(id) {
  return db.prepare('SELECT * FROM branches WHERE id = ?').get(id);
}

// Получить мастеров филиала
function getMastersByBranch(branchId) {
  return db
    .prepare(
      `
    SELECT * FROM masters 
    WHERE branch_id = ? AND is_active = 1
    ORDER BY name
  `
    )
    .all(branchId);
}

// Получить мастера по ID
function getMaster(id) {
  return db.prepare('SELECT * FROM masters WHERE id = ?').get(id);
}

// Получить услуги мастера
function getServicesByMaster(masterId) {
  return db
    .prepare(
      `
    SELECT s.*, ms.price, ms.duration_minutes
    FROM services s
    JOIN master_services ms ON s.id = ms.service_id
    WHERE ms.master_id = ? AND s.is_active = 1
    ORDER BY s.category, s.name
  `
    )
    .all(masterId);
}

// Получить все услуги
function getServices() {
  return db.prepare('SELECT * FROM services WHERE is_active = 1 ORDER BY category, name').all();
}

// Получить услугу по ID
function getService(id) {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id);
}

// Получить график мастера
function getMasterSchedule(masterId) {
  return db.prepare('SELECT * FROM schedule WHERE master_id = ?').all(masterId);
}

// Получить или создать клиента
function getOrCreateClient(userId, name = null, phone = null) {
  const existing = db.prepare('SELECT * FROM clients WHERE user_id = ?').get(userId);
  if (existing) {
    // Обновляем данные, если они изменились
    if ((name && !existing.name) || (phone && !existing.phone)) {
      db.prepare(
        `
        UPDATE clients 
        SET name = COALESCE(?, name), phone = COALESCE(?, phone)
        WHERE user_id = ?
      `
      ).run(name, phone, userId);
      return db.prepare('SELECT * FROM clients WHERE user_id = ?').get(userId);
    }
    return existing;
  }

  db.prepare('INSERT INTO clients (user_id, name, phone) VALUES (?, ?, ?)').run(
    userId,
    name,
    phone
  );
  return db.prepare('SELECT * FROM clients WHERE user_id = ?').get(userId);
}

// Создать запись
function createBooking(clientId, masterId, serviceId, branchId, date, time, notes = null) {
  const result = db
    .prepare(
      `
    INSERT INTO bookings (client_id, master_id, service_id, branch_id, booking_date, booking_time, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(clientId, masterId, serviceId, branchId, date, time, notes);

  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(result.lastInsertRowid);
}

// Получить записи клиента
function getClientBookings(clientId) {
  return db
    .prepare(
      `
    SELECT b.*, m.name as master_name, s.name as service_name, br.name as branch_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    JOIN branches br ON b.branch_id = br.id
    WHERE b.client_id = ? AND b.status = 'confirmed'
    ORDER BY b.booking_date DESC, b.booking_time DESC
  `
    )
    .all(clientId);
}

// Получить записи мастера на дату
function getMasterBookings(masterId, date) {
  return db
    .prepare(
      `
    SELECT b.*, c.name as client_name, c.phone as client_phone, s.name as service_name
    FROM bookings b
    JOIN clients c ON b.client_id = c.id
    JOIN services s ON b.service_id = s.id
    WHERE b.master_id = ? AND b.booking_date = ? AND b.status = 'confirmed'
    ORDER BY b.booking_time
  `
    )
    .all(masterId, date);
}

// Получить записи филиала на дату
function getBranchBookings(branchId, date) {
  return db
    .prepare(
      `
    SELECT b.*, m.name as master_name, c.name as client_name, c.phone as client_phone, s.name as service_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN clients c ON b.client_id = c.id
    JOIN services s ON b.service_id = s.id
    WHERE b.branch_id = ? AND b.booking_date = ? AND b.status = 'confirmed'
    ORDER BY b.booking_time
  `
    )
    .all(branchId, date);
}

// Проверить, является ли пользователь админом
function isAdmin(userId) {
  return db.prepare('SELECT * FROM admins WHERE user_id = ?').get(userId);
}

// Проверить занятость времени
function isTimeSlotFree(masterId, date, time, durationMinutes) {
  // Получаем все записи мастера на эту дату
  const bookings = getMasterBookings(masterId, date);

  // Парсим время начала нового слота
  const [newHours, newMinutes] = time.split(':').map(Number);
  const newStart = newHours * 60 + newMinutes;
  const newEnd = newStart + durationMinutes;

  // Проверяем пересечения с существующими записями
  for (const booking of bookings) {
    const [bHours, bMinutes] = booking.booking_time.split(':').map(Number);
    const service = getService(booking.service_id);
    const bStart = bHours * 60 + bMinutes;
    const bEnd = bStart + service.duration_minutes;

    // Если есть пересечение
    if (newStart < bEnd && newEnd > bStart) {
      return false;
    }
  }

  return true;
}

// Получить свободные слоты мастера на дату
function getFreeTimeSlots(masterId, date, serviceId = null) {
  const schedule = getMasterSchedule(masterId);
  const dayOfWeek = new Date(date).getDay(); // 0 = воскресенье, 6 = суббота

  // Находим график для этого дня недели
  const daySchedule = schedule.find((s) => s.day_of_week === dayOfWeek);
  if (!daySchedule) return [];

  // Проверяем, не выходной ли это день
  const holiday = db
    .prepare(
      `
    SELECT * FROM holidays 
    WHERE master_id = ? AND holiday_date = ?
  `
    )
    .get(masterId, date);
  if (holiday) return [];

  // Получаем длительность услуги (если передана)
  let durationMinutes = 60; // По умолчанию
  if (serviceId) {
    const service = getService(serviceId);
    if (service) {
      durationMinutes = service.duration_minutes;
    }
  }

  // Проверяем, является ли дата сегодняшней
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isToday = date === todayStr;
  const currentMinutes = today.getHours() * 60 + today.getMinutes();

  // Генерируем слоты с шагом 30 минут
  const slots = [];
  const [startH, startM] = daySchedule.start_time.split(':').map(Number);
  const [endH, endM] = daySchedule.end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
    // Если сегодня — пропускаем прошедшие слоты
    if (isToday && minutes <= currentMinutes) {
      continue;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    // Проверяем, свободен ли слот (с учётом длительности услуги)
    if (isTimeSlotFree(masterId, date, timeStr, durationMinutes)) {
      slots.push(timeStr);
    }
  }

  return slots;
}
// ========== РАБОТА С ЗАПИСЯМИ ==========

function getActiveBookingsByClient(clientId) {
  const today = new Date().toISOString().split('T')[0];
  return db
    .prepare(
      `
    SELECT b.*, s.name as service_name, m.name as master_name, br.name as branch_name, br.address as branch_address
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    WHERE b.client_id = ? 
      AND b.booking_date >= ?
      AND b.status = 'confirmed'
    ORDER BY b.booking_date ASC, b.booking_time ASC
  `
    )
    .all(clientId, today);
}

function getPastBookingsByClient(clientId) {
  const today = new Date().toISOString().split('T')[0];
  return db
    .prepare(
      `
    SELECT b.*, s.name as service_name, m.name as master_name, br.name as branch_name, br.address as branch_address
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    WHERE b.client_id = ? 
      AND (b.booking_date < ? OR b.status = 'cancelled')
    ORDER BY b.booking_date DESC, b.booking_time DESC
    LIMIT 10
  `
    )
    .all(clientId, today);
}

function cancelBooking(bookingId, clientId) {
  const result = db
    .prepare(
      `
    UPDATE bookings 
    SET status = 'cancelled' 
    WHERE id = ? AND client_id = ? AND status = 'confirmed'
  `
    )
    .run(bookingId, clientId);
  return result.changes > 0;
}

function getBookingById(bookingId) {
  return db
    .prepare(
      `
    SELECT b.*, s.name as service_name, m.name as master_name, br.name as branch_name, br.address as branch_address
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    WHERE b.id = ?
  `
    )
    .get(bookingId);
}
// ========== АДМИН-ПАНЕЛЬ ==========

function getTodayBookings() {
  const today = new Date().toISOString().split('T')[0];
  return db
    .prepare(
      `
    SELECT b.*, 
           s.name as service_name, 
           m.name as master_name, 
           br.name as branch_name,
           c.name as client_name, 
           c.phone as client_phone
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    JOIN clients c ON b.client_id = c.id
    WHERE b.booking_date = ?
    ORDER BY b.booking_time ASC
  `
    )
    .all(today);
}

function getBookingsByDate(date) {
  return db
    .prepare(
      `
    SELECT b.*, 
           s.name as service_name, 
           m.name as master_name, 
           br.name as branch_name,
           c.name as client_name, 
           c.phone as client_phone
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    JOIN clients c ON b.client_id = c.id
    WHERE b.booking_date = ?
    ORDER BY b.booking_time ASC
  `
    )
    .all(date);
}

function getStats() {
  const today = new Date().toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';

  // Всего записей сегодня
  const todayCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM bookings 
    WHERE booking_date = ? AND status = 'confirmed'
  `
    )
    .get(today);

  // Всего записей в этом месяце
  const monthCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM bookings 
    WHERE booking_date >= ? AND status = 'confirmed'
  `
    )
    .get(monthStart);

  // Всего клиентов
  const clientsCount = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM clients
  `
    )
    .get();

  // Топ мастеров за месяц
  const topMasters = db
    .prepare(
      `
    SELECT m.name, COUNT(b.id) as bookings_count
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    WHERE b.booking_date >= ? AND b.status = 'confirmed'
    GROUP BY m.id
    ORDER BY bookings_count DESC
    LIMIT 5
  `
    )
    .all(monthStart);

  // Топ услуг за месяц
  const topServices = db
    .prepare(
      `
    SELECT s.name, COUNT(b.id) as bookings_count
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date >= ? AND b.status = 'confirmed'
    GROUP BY s.id
    ORDER BY bookings_count DESC
    LIMIT 5
  `
    )
    .all(monthStart);

  // Топ филиалов за месяц
  const topBranches = db
    .prepare(
      `
    SELECT br.name, COUNT(b.id) as bookings_count
    FROM bookings b
    JOIN branches br ON b.branch_id = br.id
    WHERE b.booking_date >= ? AND b.status = 'confirmed'
    GROUP BY br.id
    ORDER BY bookings_count DESC
  `
    )
    .all(monthStart);

  return {
    todayCount: todayCount.count,
    monthCount: monthCount.count,
    clientsCount: clientsCount.count,
    topMasters,
    topServices,
    topBranches,
  };
}

function updateBookingStatus(bookingId, status) {
  const result = db
    .prepare(
      `
    UPDATE bookings SET status = ? WHERE id = ?
  `
    )
    .run(status, bookingId);
  return result.changes > 0;
}
function getAllBookings(filters = {}) {
  let query = `
    SELECT b.*, 
           s.name as service_name, 
           m.name as master_name, 
           br.name as branch_name,
           c.name as client_name, 
           c.phone as client_phone
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    JOIN clients c ON b.client_id = c.id
    WHERE 1=1
  `;

  const params = [];

  // Фильтр по дате
  if (filters.date) {
    query += ` AND b.booking_date = ?`;
    params.push(filters.date);
  }

  // Фильтр по мастеру
  if (filters.master_id) {
    query += ` AND b.master_id = ?`;
    params.push(filters.master_id);
  }

  // Фильтр по филиалу
  if (filters.branch_id) {
    query += ` AND b.branch_id = ?`;
    params.push(filters.branch_id);
  }

  // Фильтр по статусу
  if (filters.status) {
    query += ` AND b.status = ?`;
    params.push(filters.status);
  }

  // Поиск по имени или телефону
  if (filters.search) {
    query += ` AND (c.name LIKE ? OR c.phone LIKE ?)`;
    const searchPattern = `%${filters.search}%`;
    params.push(searchPattern, searchPattern);
  }

  query += ` ORDER BY b.booking_date DESC, b.booking_time DESC LIMIT 50`;

  return db.prepare(query).all(...params);
}

function getMasters() {
  return db.prepare(`SELECT * FROM masters ORDER BY name`).all();
}
function getBookingWithClient(bookingId) {
  return db
    .prepare(
      `
    SELECT b.*, 
           s.name as service_name, 
           ms.price as service_price, 
           ms.duration_minutes,
           m.name as master_name, 
           br.name as branch_name, br.address as branch_address,
           c.name as client_name, c.phone as client_phone, c.user_id as client_user_id
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN master_services ms ON ms.service_id = s.id AND ms.master_id = b.master_id
    JOIN masters m ON b.master_id = m.id
    JOIN branches br ON b.branch_id = br.id
    JOIN clients c ON b.client_id = c.id
    WHERE b.id = ?
  `
    )
    .get(bookingId);
}

function updateBookingDateTime(bookingId, newDate, newTime) {
  const result = db
    .prepare(
      `
    UPDATE bookings 
    SET booking_date = ?, booking_time = ?
    WHERE id = ? AND status = 'confirmed'
  `
    )
    .run(newDate, newTime, bookingId);
  return result.changes > 0;
}

function getFreeSlotsForReschedule(masterId, serviceId, date, excludeBookingId = null) {
  const service = db.prepare('SELECT duration_minutes FROM services WHERE id = ?').get(serviceId);
  if (!service) return [];

  const duration = service.duration_minutes;

  // Получаем все записи мастера на эту дату (кроме текущей)
  let query = `
    SELECT booking_time FROM bookings
    WHERE master_id = ? AND booking_date = ? AND status = 'confirmed'
  `;
  const params = [masterId, date];

  if (excludeBookingId) {
    query += ` AND id != ?`;
    params.push(excludeBookingId);
  }

  const bookedSlots = db.prepare(query).all(...params);
  const bookedTimes = bookedSlots.map((b) => b.booking_time);

  // Генерируем все возможные слоты (с 10:00 до 20:00)
  const allSlots = [];
  for (let hour = 10; hour < 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

      // Проверяем, не пересекается ли с занятыми
      const [h, m] = time.split(':').map(Number);
      const startMinutes = h * 60 + m;
      const endMinutes = startMinutes + duration;

      let conflict = false;
      for (const booked of bookedTimes) {
        const [bh, bm] = booked.split(':').map(Number);
        const bookedStart = bh * 60 + bm;
        const bookedEnd = bookedStart + duration;

        if (startMinutes < bookedEnd && endMinutes > bookedStart) {
          conflict = true;
          break;
        }
      }

      if (!conflict && endMinutes <= 20 * 60) {
        allSlots.push(time);
      }
    }
  }

  return allSlots;
}
module.exports = {
  db,
  getBranches,
  getBranch,
  getMastersByBranch,
  getMaster,
  getServicesByMaster,
  getService,
  getFreeTimeSlots,
  getOrCreateClient,
  createBooking,
  getActiveBookingsByClient,
  getPastBookingsByClient,
  cancelBooking,
  getBookingById,
  getTodayBookings,
  getBookingsByDate,
  getStats,
  updateBookingStatus,
  getAllBookings,
  getMasters,
  getBookingWithClient,
  updateBookingDateTime,
  getFreeSlotsForReschedule,
};
