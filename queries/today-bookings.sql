SELECT 
    b.booking_time AS "Время",
    c.name AS "Клиент",
    c.phone AS "Телефон",
    m.name AS "Мастер",
    s.name AS "Услуга",
    ms.price AS "Цена"
FROM bookings b
JOIN clients c ON b.client_id = c.id
JOIN masters m ON b.master_id = m.id
JOIN services s ON b.service_id = s.id
JOIN master_services ms ON ms.master_id = m.master_id AND ms.service_id = s.id
WHERE b.booking_date = date('now')
    AND b.status = 'confirmed'
ORDER BY b.booking_time;