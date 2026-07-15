const express = require('express');
const router = express.Router();
const {
  getBranches,
  getMastersByBranch,
  getServicesByMaster,
  getFreeTimeSlots,
  getOrCreateClient,
  createBooking,
  getActiveBookingsByClient,
  cancelBooking,
  getBookingWithClient,
} = require('../database/database');
const { notifyNewBooking } = require('../services/email');

// Получить все филиалы
router.get('/branches', (req, res) => {
  try {
    const branches = getBranches();
    res.json({ success: true, data: branches });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить мастеров филиала
router.get('/masters/:branchId', (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const masters = getMastersByBranch(branchId);
    res.json({ success: true, data: masters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить услуги мастера
router.get('/services/:masterId', (req, res) => {
  try {
    const masterId = parseInt(req.params.masterId);
    const services = getServicesByMaster(masterId);
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить свободные слоты
router.get('/free-slots/:masterId/:serviceId/:date', (req, res) => {
  try {
    const masterId = parseInt(req.params.masterId);
    const serviceId = parseInt(req.params.serviceId);
    const date = req.params.date;

    // ✅ Правильный порядок параметров: masterId, date, serviceId
    const slots = getFreeTimeSlots(masterId, date, serviceId);
    res.json({ success: true, data: slots });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Создать запись
router.post('/bookings', async (req, res) => {
  try {
    const {
      client_name,
      client_phone,
      branch_id,
      master_id,
      service_id,
      booking_date,
      booking_time,
    } = req.body;

    // Валидация
    if (
      !client_name ||
      !client_phone ||
      !branch_id ||
      !master_id ||
      !service_id ||
      !booking_date ||
      !booking_time
    ) {
      return res.status(400).json({ success: false, error: 'Все поля обязательны' });
    }
    // Создаём или получаем клиента
    console.log('🔍 Создаём клиента:', { client_name, client_phone });
    const clientId = getOrCreateClient(null, client_name, client_phone);
    console.log('✅ Клиент создан, ID:', clientId);

    if (!clientId) {
      throw new Error('Не удалось создать клиента');
    }

    // Создаём запись
    const booking = createBooking(
      clientId, // ← теперь используем clientId напрямую
      master_id,
      service_id,
      branch_id,
      booking_date,
      booking_time
    );
    // Отправляем email админу
    try {
      const bookingWithDetails = getBookingWithClient(booking.id);
      if (bookingWithDetails) {
        // Передаем null вторым аргументом, так как веб-запись не знает user_id
        // (или передайте bookingDetails.user_id, если он там есть, но null безопаснее для гарантии проверки)
        await notifyNewBooking(bookingDetails, null);
      }
    } catch (error) {
      console.error('❌ Ошибка отправки email:', error.message);
    }

    res.json({ success: true, data: { booking_id: booking.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Получить мои записи
router.get('/bookings/:phone', (req, res) => {
  try {
    const phone = req.params.phone;

    // Находим клиента по телефону
    const { db } = require('../database/database');
    const client = db.prepare('SELECT * FROM clients WHERE phone = ?').get(phone);

    if (!client) {
      return res.json({ success: true, data: [] });
    }

    const bookings = getActiveBookingsByClient(client.id);
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отменить запись
router.put('/bookings/:id/cancel', (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { phone } = req.body;

    // Проверяем, что клиент имеет право отменять
    const { db } = require('../database/database');
    const booking = db
      .prepare(
        'SELECT b.* FROM bookings b JOIN clients c ON b.client_id = c.id WHERE b.id = ? AND c.phone = ?'
      )
      .get(bookingId, phone);

    if (!booking) {
      return res.status(404).json({ success: false, error: 'Запись не найдена' });
    }

    const success = cancelBooking(bookingId, booking.client_id);

    if (!success) {
      return res.status(400).json({ success: false, error: 'Не удалось отменить запись' });
    }

    res.json({ success: true, message: 'Запись отменена' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
