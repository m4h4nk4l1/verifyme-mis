-- List all admin users for each organization in VerifyMe (PostgreSQL, your schema)
SELECT
    u.id AS user_id,
    u.email AS admin_email,
    u.username AS admin_username,
    u.first_name AS admin_first_name,
    u.last_name AS admin_last_name,
    u.role AS user_role,
    o.name AS organization_name,
    o.id AS organization_id
FROM
    users u
JOIN
    organizations o
ON
    u.organization_id = o.id
WHERE
    u.role = 'ADMIN'
ORDER BY
    o.name, u.username; 