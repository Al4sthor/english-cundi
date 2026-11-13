/* English Cundi - consultas para la exposición
   Autor: David Estiven Sánchez Yomayuza
   Selecciona una consulta y pulsa F5 (Ejecutar). */
USE EnglishCundi;
GO

-- 1. Usuarios registrados (hora de Colombia, sin contraseña)
SELECT * FROM dbo.v_usuarios ORDER BY id;

-- 2. Cuántos usuarios hay
SELECT COUNT(*) AS total_usuarios FROM dbo.usuarios;

-- 3. Las contraseñas están cifradas (hash scrypt), nunca en texto plano
SELECT correo, LEFT(password_hash, 40) + '...' AS password_cifrada FROM dbo.usuarios;

-- 4. Estructura de la tabla
SELECT COLUMN_NAME AS campo, DATA_TYPE AS tipo, CHARACTER_MAXIMUM_LENGTH AS largo, IS_NULLABLE AS permite_nulo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'usuarios'
ORDER BY ORDINAL_POSITION;
