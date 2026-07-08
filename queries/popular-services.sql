SELECT 
    s.name AS "Услуга",
    COUNT(b.id) AS "Записей",
    AVG(ms.price) AS "Средняя цена"
FROM bookings b
JOIN services s ON b.service_id = s.id
JOIN master_services ms ON ms.master_id = b.master_id AND ms.service_id = s.id
WHERE b.status IN ('confirmed', 'completed')
GROUP BY s.id
ORDER BY COUNT(b.id) DESC
LIMIT 10;
