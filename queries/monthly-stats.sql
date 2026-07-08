SELECT 
    m.name AS "Мастер",
    COUNT(b.id) AS "Записей",
    SUM(ms.price) AS "Выручка (₽)"
FROM bookings b
JOIN masters m ON b.master_id = m.id
JOIN master_services ms ON ms.master_id = m.master_id AND ms.service_id = b.service_id
WHERE b.booking_date >= date('now', 'start of month')
    AND b.status IN ('confirmed', 'completed')
GROUP BY m.id
ORDER BY SUM(ms.price) DESC;
