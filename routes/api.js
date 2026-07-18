const express = require('express');
const router = express.Router();
const {
  getMasters,
  getServicesByMaster,
  getFreeTimeSlots,
  createBooking,
  getBookingWithClient,
  db,
} = require('../database/database');
const { notifyNewBooking } = require('../services/email');

// 🆕 1. Получить ВСЕХ мастеров (без фильтра по филиалу)
router.get('/masters', (req, res) => {
  try {
    const masters = getMasters();
    res.json({ success: true, data: masters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Получить услуги конкретного мастера
router.get('/masters/:masterId/services', (req, res) => {
  try {
    const masterId = parseInt(req.params.masterId);
    const services = getServicesByMaster(masterId);
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Получить свободные слоты
router.get('/free-slots/:masterId/:serviceId/:date', (req, res) => {
  try {
    const masterId = parseInt(req.params.masterId);
    const serviceId = parseInt(req.params.serviceId);
    const date = req.params.date;

    const slots = getFreeTimeSlots(masterId, date, serviceId);
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🆕 4. Создать запись (без branch_id и отдельной таблицы clients)
router.post('/bookings', async (req, res) => {
  try {
    const { client_name, client_phone, master_id, service_id, booking_date, booking_time } =
      req.body;

    // Валидация
    if (
      !client_name ||
      !client_phone ||
      !master_id ||
      !service_id ||
      !booking_date ||
      !booking_time
    ) {
      return res.status(400).json({ success: false, error: 'Все поля обязательны' });
    }

    // Создаём запись напрямую с именем и телефоном
    const bookingId = createBooking(
      master_id,
      service_id,
      client_name,
      client_phone,
      booking_date,
      booking_time,
      null // user_id для веб-клиентов пока null (или можно передавать, если есть авторизация)
    );

    // Отправляем email админу
    try {
      const bookingWithDetails = getBookingWithClient(bookingId);
      if (bookingWithDetails) {
        await notifyNewBooking(bookingWithDetails, null);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error.message);
    }

    res.json({ success: true, data: { booking_id: bookingId } });
  } catch (error) {
    console.error('❌ Ошибка создания записи:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🆕 5. Получить мои записи (ищем прямо по телефону в таблице bookings)
router.get('/bookings/:phone', (req, res) => {
  try {
    const phone = req.params.phone;

    // Ищем записи напрямую по телефону, исключая отмененные
    const bookings = db
      .prepare(
        `
      SELECT b.*, m.name as master_name, s.name as service_name
      FROM bookings b
      JOIN masters m ON b.master_id = m.id
      JOIN services s ON b.service_id = s.id
      WHERE b.client_phone = ? AND b.status != 'cancelled'
      ORDER BY b.booking_date DESC, b.booking_time DESC
    `
      )
      .all(phone);

    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🆕 6. Отменить запись (проверяем владение по телефону)
router.put('/bookings/:id/cancel', (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { phone } = req.body;

    // Проверяем, что запись с таким ID и телефоном существует и не отменена
    const booking = db
      .prepare(
        `
      SELECT * FROM bookings 
      WHERE id = ? AND client_phone = ? AND status != 'cancelled'
    `
      )
      .get(bookingId, phone);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Запись не найдена или уже отменена' });
    }

    // Обновляем статус на 'cancelled'
    db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE id = ?`).run(bookingId);

    res.json({ success: true, message: 'Запись успешно отменена' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
