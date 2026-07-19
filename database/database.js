const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('./database/barber-one.db');

// Включаем WAL-режим для лучшей производительности
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ========== СОЗДАНИЕ ТАБЛИЦ (Версия One, без branch_id и client_id) ==========

db.exec(`
  CREATE TABLE IF NOT EXISTS masters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    experience INTEGER DEFAULT 0,
    description TEXT,
    photo_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

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

db.exec(`
  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER,
    holiday_date TEXT NOT NULL,
    reason TEXT,
    FOREIGN KEY (master_id) REFERENCES masters(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    user_id INTEGER,
    booking_date TEXT NOT NULL,
    booking_time TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    reminder_24h_sent INTEGER DEFAULT 0,
    reminder_1h_sent INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (master_id) REFERENCES masters(id),
    FOREIGN KEY (service_id) REFERENCES services(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    user_id INTEGER PRIMARY KEY,
    name TEXT,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_states (
    user_id INTEGER PRIMARY KEY,
    state_data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ========== БАЗОВЫЕ ДАННЫЕ ==========

function getMasters() {
  return db.prepare('SELECT * FROM masters WHERE is_active = 1 ORDER BY name').all();
}

function getMaster(id) {
  return db.prepare('SELECT * FROM masters WHERE id = ?').get(id);
}

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

function getService(id) {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(id);
}

function getMasterSchedule(masterId) {
  return db.prepare('SELECT * FROM schedule WHERE master_id = ?').all(masterId);
}

// ========== ЗАПИСИ И РАСПИСАНИЕ ==========

function createBooking(masterId, serviceId, clientName, clientPhone, date, time, userId = null) {
  const result = db
    .prepare(
      `
    INSERT INTO bookings (master_id, service_id, client_name, client_phone, user_id, booking_date, booking_time, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `
    )
    .run(masterId, serviceId, clientName, clientPhone, userId, date, time);
  return result.lastInsertRowid;
}

function getActiveBookingsByClient(phone) {
  const today = new Date().toISOString().split('T')[0];
  return db
    .prepare(
      `
    SELECT b.*, s.name as service_name, m.name as master_name
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    WHERE b.client_phone = ? 
      AND b.booking_date >= ?
      AND b.status IN ('confirmed', 'pending')
    ORDER BY b.booking_date ASC, b.booking_time ASC
  `
    )
    .all(phone, today);
}

function getPastBookingsByClient(phone) {
  const today = new Date().toISOString().split('T')[0];
  return db
    .prepare(
      `
    SELECT b.*, s.name as service_name, m.name as master_name
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    WHERE b.client_phone = ? 
      AND (b.booking_date < ? OR b.status = 'cancelled')
    ORDER BY b.booking_date DESC, b.booking_time DESC
    LIMIT 10
  `
    )
    .all(phone, today);
}

function cancelBooking(bookingId, phone) {
  const result = db
    .prepare(
      `
    UPDATE bookings 
    SET status = 'cancelled' 
    WHERE id = ? AND client_phone = ? AND status IN ('confirmed', 'pending')
  `
    )
    .run(bookingId, phone);
  return result.changes > 0;
}

function getBookingById(bookingId) {
  return db
    .prepare(
      `
    SELECT b.*, s.name as service_name, m.name as master_name
    FROM bookings b
    JOIN services s ON b.service_id = s.id
    JOIN masters m ON b.master_id = m.id
    WHERE b.id = ?
  `
    )
    .get(bookingId);
}

function isTimeSlotFree(masterId, date, timeStr, durationMinutes) {
  const bookings = db
    .prepare(
      `
    SELECT b.booking_time, COALESCE(ms.duration_minutes, s.duration_minutes) as duration
    FROM bookings b
    LEFT JOIN master_services ms ON ms.master_id = b.master_id AND ms.service_id = b.service_id
    JOIN services s ON b.service_id = s.id
    WHERE b.master_id = ? AND b.booking_date = ? AND b.status != 'cancelled'
  `
    )
    .all(masterId, date);

  const [startH, startM] = timeStr.split(':').map(Number);
  const slotStart = startH * 60 + startM;
  const slotEnd = slotStart + durationMinutes;

  for (const booking of bookings) {
    const [bH, bM] = booking.booking_time.split(':').map(Number);
    const bStart = bH * 60 + bM;
    const bEnd = bStart + (booking.duration || 60);

    if (slotStart < bEnd && slotEnd > bStart) {
      return false;
    }
  }
  return true;
}

function getFreeTimeSlots(masterId, date, serviceId = null) {
  const schedule = getMasterSchedule(masterId);
  const dayOfWeek = new Date(date).getDay();
  const daySchedule = schedule.find((s) => s.day_of_week === dayOfWeek);

  if (!daySchedule) return [];

  const holiday = db
    .prepare('SELECT * FROM holidays WHERE master_id = ? AND holiday_date = ?')
    .get(masterId, date);
  if (holiday) return [];

  let durationMinutes = 60;
  if (serviceId) {
    const ms = db
      .prepare(
        'SELECT duration_minutes FROM master_services WHERE master_id = ? AND service_id = ?'
      )
      .get(masterId, serviceId);
    if (ms) {
      durationMinutes = ms.duration_minutes;
    } else {
      const service = db
        .prepare('SELECT duration_minutes FROM services WHERE id = ?')
        .get(serviceId);
      if (service) durationMinutes = service.duration_minutes;
    }
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const isToday = date === todayStr;
  const currentMinutes = today.getHours() * 60 + today.getMinutes();

  const slots = [];
  const [startH, startM] = daySchedule.start_time.split(':').map(Number);
  const [endH, endM] = daySchedule.end_time.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const maxStartMinutes = endMinutes - durationMinutes;

  for (let minutes = startMinutes; minutes <= maxStartMinutes; minutes += 30) {
    if (isToday && minutes <= currentMinutes) continue;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

    try {
      if (isTimeSlotFree(masterId, date, timeStr, durationMinutes)) {
        slots.push(timeStr);
      }
    } catch (error) {
      console.error(`❌ Ошибка проверки слота ${timeStr}:`, error.message);
    }
  }
  return slots;
}

// ========== АДМИН-ПАНЕЛЬ ==========

function getTodayBookings() {
  return db
    .prepare(
      `
    SELECT b.*, m.name as master_name, s.name as service_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date = date('now')
    ORDER BY b.booking_time
  `
    )
    .all();
}

function getBookingsByDate(date) {
  return db
    .prepare(
      `
    SELECT b.*, m.name as master_name, s.name as service_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.booking_date = ?
    ORDER BY b.booking_time
  `
    )
    .all(date);
}

function getStats(startDate, endDate) {
  return db
    .prepare(
      `
    SELECT 
      COUNT(*) as total_bookings,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
      SUM(CASE WHEN status = 'completed' THEN ms.price ELSE 0 END) as revenue
    FROM bookings b
    LEFT JOIN master_services ms ON ms.master_id = b.master_id AND ms.service_id = b.service_id
    WHERE b.booking_date BETWEEN ? AND ?
  `
    )
    .get(startDate, endDate);
}

function updateBookingStatus(bookingId, status) {
  const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, bookingId);
  return result.changes > 0;
}

function getAllBookings(filters = {}) {
  let query = `
    SELECT b.*, m.name as master_name, s.name as service_name
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.date) {
    query += ' AND b.booking_date = ?';
    params.push(filters.date);
  }
  if (filters.master_id) {
    query += ' AND b.master_id = ?';
    params.push(filters.master_id);
  }
  if (filters.status) {
    query += ' AND b.status = ?';
    params.push(filters.status);
  }
  if (filters.search) {
    query += ' AND (b.client_name LIKE ? OR b.client_phone LIKE ?)';
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  query += ' ORDER BY b.booking_date DESC, b.booking_time DESC';
  return db.prepare(query).all(...params);
}

function getBookingWithClient(bookingId) {
  return db
    .prepare(
      `
    SELECT b.*, m.name as master_name, s.name as service_name, s.price_min as price
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    WHERE b.id = ?
  `
    )
    .get(bookingId);
}

function updateBookingDateTime(bookingId, newDate, newTime) {
  const result = db
    .prepare(
      "UPDATE bookings SET booking_date = ?, booking_time = ? WHERE id = ? AND status = 'confirmed'"
    )
    .run(newDate, newTime, bookingId);
  return result.changes > 0;
}

function getFreeSlotsForReschedule(masterId, serviceId, date, excludeBookingId = null) {
  const service = db.prepare('SELECT duration_minutes FROM services WHERE id = ?').get(serviceId);
  if (!service) return [];
  const duration = service.duration_minutes;

  let query =
    "SELECT booking_time FROM bookings WHERE master_id = ? AND booking_date = ? AND status = 'confirmed'";
  const params = [masterId, date];
  if (excludeBookingId) {
    query += ' AND id != ?';
    params.push(excludeBookingId);
  }

  const bookedSlots = db.prepare(query).all(...params);
  const bookedTimes = bookedSlots.map((b) => b.booking_time);
  const allSlots = [];

  for (let hour = 10; hour < 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
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
      if (!conflict && endMinutes <= 20 * 60) allSlots.push(time);
    }
  }
  return allSlots;
}

// ========== УПРАВЛЕНИЕ МАСТЕРАМИ И УСЛУГАМИ ==========

function getMastersList() {
  return db.prepare('SELECT * FROM masters ORDER BY is_active DESC, name').all();
}

function getMasterById(masterId) {
  return db.prepare('SELECT * FROM masters WHERE id = ?').get(masterId);
}

function toggleMasterActive(masterId) {
  const master = db.prepare('SELECT is_active FROM masters WHERE id = ?').get(masterId);
  if (!master) return false;
  const newStatus = master.is_active ? 0 : 1;
  db.prepare('UPDATE masters SET is_active = ? WHERE id = ?').run(newStatus, masterId);
  return true;
}

function updateMaster(masterId, name, specialty, experience, description, photo_url) {
  const result = db
    .prepare(
      `
    UPDATE masters SET name = ?, specialty = ?, experience = ?, description = ?, photo_url = ? WHERE id = ?
  `
    )
    .run(name, specialty, experience, description, photo_url, masterId);
  return result.changes > 0;
}

function createMaster(name, specialty, experience = 0, description = '', photo_url = null) {
  const result = db
    .prepare(
      `
    INSERT INTO masters (name, specialty, experience, description, photo_url, is_active) VALUES (?, ?, ?, ?, ?, 1)
  `
    )
    .run(name, specialty, experience, description, photo_url);
  return result.lastInsertRowid;
}

function getServicesList() {
  return db.prepare('SELECT * FROM services ORDER BY is_active DESC, category, name').all();
}

function createService(name, category, priceMin, priceMax, durationMinutes, description = '') {
  const result = db
    .prepare(
      `
    INSERT INTO services (name, category, price_min, price_max, duration_minutes, description, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)
  `
    )
    .run(name, category, priceMin, priceMax, durationMinutes, description);
  return result.lastInsertRowid;
}

function updateService(
  serviceId,
  name,
  category,
  priceMin,
  priceMax,
  durationMinutes,
  description
) {
  db.prepare(
    `
    UPDATE services SET name = ?, category = ?, price_min = ?, price_max = ?, duration_minutes = ?, description = ? WHERE id = ?
  `
  ).run(name, category, priceMin, priceMax, durationMinutes, description, serviceId);
}

function toggleServiceActive(serviceId) {
  db.prepare(
    'UPDATE services SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?'
  ).run(serviceId);
}

function getServiceById(serviceId) {
  return db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
}

function getMasterServicesWithStatus(masterId) {
  return db
    .prepare(
      `
    SELECT s.id, s.name, s.category, s.price_min, s.price_max, s.duration_minutes, s.is_active,
           ms.price as master_price, ms.duration_minutes as master_duration,
           CASE WHEN ms.id IS NOT NULL THEN 1 ELSE 0 END as is_attached
    FROM services s
    LEFT JOIN master_services ms ON ms.service_id = s.id AND ms.master_id = ?
    WHERE s.is_active = 1
    ORDER BY s.category, s.name
  `
    )
    .all(masterId);
}

function attachServiceToMaster(masterId, serviceId) {
  const service = db
    .prepare('SELECT price_min, duration_minutes FROM services WHERE id = ?')
    .get(serviceId);
  if (!service) return false;
  const existing = db
    .prepare('SELECT id FROM master_services WHERE master_id = ? AND service_id = ?')
    .get(masterId, serviceId);
  if (existing) return false;
  db.prepare(
    'INSERT INTO master_services (master_id, service_id, price, duration_minutes) VALUES (?, ?, ?, ?)'
  ).run(masterId, serviceId, service.price_min, service.duration_minutes);
  return true;
}

function detachServiceFromMaster(masterId, serviceId) {
  const result = db
    .prepare('DELETE FROM master_services WHERE master_id = ? AND service_id = ?')
    .run(masterId, serviceId);
  return result.changes > 0;
}

// ========== ЭКСПОРТ ==========
module.exports = {
  db,
  getMasters,
  getMaster,
  getServicesByMaster,
  getService,
  getMasterSchedule,
  createBooking,
  getActiveBookingsByClient,
  getPastBookingsByClient,
  cancelBooking,
  getBookingById,
  isTimeSlotFree,
  getFreeTimeSlots,
  getTodayBookings,
  getBookingsByDate,
  getStats,
  updateBookingStatus,
  getAllBookings,
  getBookingWithClient,
  updateBookingDateTime,
  getFreeSlotsForReschedule,
  getMastersList,
  getMasterById,
  toggleMasterActive,
  updateMaster,
  createMaster,
  getServicesList,
  createService,
  updateService,
  toggleServiceActive,
  getServiceById,
  getMasterServicesWithStatus,
  attachServiceToMaster,
  detachServiceFromMaster,
};
