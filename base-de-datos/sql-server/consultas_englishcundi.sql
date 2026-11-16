/* English Cundi - consultas para la exposición
   Autor: David Estiven Sánchez Yomayuza
   Abrir en SQL Server Management Studio, seleccionar una consulta y pulsar F5 (Ejecutar).
   Antes de consultar, actualizar la copia: descargar usuarios.db del servidor y
   ejecutar  py importar_sqlserver.py  en esta carpeta. */
USE EnglishCundi;
GO

-- 1. Usuarios registrados (hora de Colombia, sin contraseña)
SELECT * FROM dbo.v_usuarios ORDER BY id;

-- 2. Cuántos usuarios hay
SELECT COUNT(*) AS total_usuarios FROM dbo.usuarios;

-- 3. Últimos 5 registrados (el más reciente primero)
SELECT TOP 5 * FROM dbo.v_usuarios ORDER BY id DESC;

-- 4. Registros por día (hora de Colombia)
SELECT CAST(DATEADD(HOUR, -5, creado_en) AS date) AS dia, COUNT(*) AS registros
FROM dbo.usuarios
GROUP BY CAST(DATEADD(HOUR, -5, creado_en) AS date)
ORDER BY dia;

-- 5. Nombres repetidos (alguien que se registró con dos correos)
SELECT nombre, COUNT(*) AS veces
FROM dbo.usuarios
GROUP BY nombre
HAVING COUNT(*) > 1;

-- 6. Las contraseñas están cifradas (hash scrypt), nunca en texto plano
SELECT correo, LEFT(password_hash, 40) + '...' AS password_cifrada FROM dbo.usuarios;

-- 7. Estructura de la tabla
SELECT COLUMN_NAME AS campo, DATA_TYPE AS tipo, CHARACTER_MAXIMUM_LENGTH AS largo, IS_NULLABLE AS permite_nulo
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'usuarios'
ORDER BY ORDINAL_POSITION;
