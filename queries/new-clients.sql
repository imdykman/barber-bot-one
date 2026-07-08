SELECT 
    c.name AS "Имя",
    c.phone AS "Телефон",
    COUNT(b.id) AS "Визитов"
FROM clients c
LEFT JOIN bookings b ON b.client_id = c.id
WHERE c.user_id IS NOT NULL
GROUP BY c.id
HAVING COUNT(b.id) <= 1
ORDER BY c.id DESC
LIMIT 20;