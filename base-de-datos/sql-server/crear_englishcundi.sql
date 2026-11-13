/* English Cundi - copia de la base de datos en SQL Server
   Autor: David Estiven Sánchez Yomayuza

   La base de datos real (nativa) es SQLite y está en el servidor:
     PythonAnywhere -> /home/D4vidS4nchez/english-cundi/datos/usuarios.db
   Esta base de SQL Server es una COPIA para consultarla en el PC con
   SQL Server Management Studio. Se actualiza con importar_sqlserver.py.
*/
IF DB_ID(N'EnglishCundi') IS NULL
    CREATE DATABASE EnglishCundi;
GO
USE EnglishCundi;
GO
IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios (
        id            INT            NOT NULL CONSTRAINT PK_usuarios PRIMARY KEY,
        correo        NVARCHAR(120)  NOT NULL CONSTRAINT UQ_usuarios_correo UNIQUE,
        nombre        NVARCHAR(60)   NOT NULL,
        password_hash NVARCHAR(255)  NOT NULL,
        creado_en     DATETIME2(0)   NOT NULL,  -- hora UTC, igual que en SQLite
        copiado_en    DATETIME2(0)   NOT NULL CONSTRAINT DF_usuarios_copiado DEFAULT SYSDATETIME()
    );
END
GO
/* Vista con la hora de Colombia (UTC-5) y sin la contraseña cifrada */
CREATE OR ALTER VIEW dbo.v_usuarios AS
SELECT id,
       nombre,
       correo,
       DATEADD(HOUR, -5, creado_en) AS creado_en_colombia
FROM dbo.usuarios;
GO
