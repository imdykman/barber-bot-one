SELECT 
    m.name AS "Мастер",
    br.name AS "Филиал",
    COUNT(b.id) AS "Записей (месяц)",
    SUM(ms.price) AS "Выручка (₽)"
FROM masters m
JOIN branches br ON m.branch_id = br.id
LEFT JOIN bookings b ON b.master_id = m.id 
    AND b.booking_date >= date('now', 'start of month')
    AND b.status IN ('confirmed', 'completed')
LEFT JOIN master_services ms ON ms.master_id = m.id AND ms.service_id = b.service_id
GROUP BY m.id
ORDER BY COUNT(b.id) DESC;