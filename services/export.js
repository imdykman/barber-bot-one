const { db } = require('../database/database');

// Генерация CSV с записями за период (Версия One: без филиалов и таблицы clients)
function generateBookingsCSV(filter = {}) {
  let query = `
    SELECT 
      b.booking_date AS "Дата",
      b.booking_time AS "Время",
      b.client_name AS "Клиент",
      b.client_phone AS "Телефон",
      m.name AS "Мастер",
      s.name AS "Услуга",
      COALESCE(ms.price, s.price_min) AS "Цена",
      b.status AS "Статус"
    FROM bookings b
    JOIN masters m ON b.master_id = m.id
    JOIN services s ON b.service_id = s.id
    LEFT JOIN master_services ms ON ms.master_id = b.master_id AND ms.service_id = b.service_id
    WHERE 1=1
  `;

  const params = [];

  // Фильтр по дате
  if (filter.dateFrom) {
    query += ` AND b.booking_date >= ?`;
    params.push(filter.dateFrom);
  }
  if (filter.dateTo) {
    query += ` AND b.booking_date <= ?`;
    params.push(filter.dateTo);
  }

  // Фильтр по статусу
  if (filter.status) {
    query += ` AND b.status = ?`;
    params.push(filter.status);
  }

  query += ` ORDER BY b.booking_date DESC, b.booking_time DESC`;

  const rows = db.prepare(query).all(...params);

  // Переводим статусы на русский
  const statusMap = {
    confirmed: 'Подтверждено',
    cancelled: 'Отменено',
    completed: 'Завершено',
    pending: 'Ожидает',
  };

  // Формируем CSV с BOM для корректного открытия в Excel
  const BOM = '\uFEFF';
  const headers = ['Дата', 'Время', 'Клиент', 'Телефон', 'Мастер', 'Услуга', 'Цена', 'Статус'];

  const csvRows = [headers.join(';')];

  for (const row of rows) {
    const values = [
      row['Дата'],
      row['Время'],
      escapeCsv(row['Клиент']),
      row['Телефон'],
      row['Мастер'],
      escapeCsv(row['Услуга']),
      row['Цена'] || '0',
      statusMap[row['Статус']] || row['Статус'],
    ];
    csvRows.push(values.join(';'));
  }

  return {
    csv: BOM + csvRows.join('\n'),
    count: rows.length,
  };
}

// Экранирование значений для CSV
function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Если есть кавычки, точка с запятой или перенос строки — оборачиваем в кавычки
  if (str.includes('"') || str.includes(';') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Генерация имени файла
function generateFilename(filter = {}) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '-');

  let suffix = '';
  if (filter.dateFrom && filter.dateTo) {
    suffix = `_${filter.dateFrom}_to_${filter.dateTo}`;
  } else if (filter.period) {
    suffix = `_${filter.period}`;
  }

  return `bookings${suffix}_${dateStr}_${timeStr}.csv`;
}

module.exports = {
  generateBookingsCSV,
  generateFilename,
};
