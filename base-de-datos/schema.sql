-- English Cundi - estructura de la base de datos
-- Autor: David Estiven Sánchez Yomayuza
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  correo        TEXT NOT NULL UNIQUE,
  nombre        TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  creado_en     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Progreso de práctica (XP, racha, logros, cuaderno de errores): un JSON por alumno.
-- app.py también la crea sola si falta.
CREATE TABLE IF NOT EXISTS progreso (
  usuario_id  INTEGER PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
  datos       TEXT NOT NULL,
  actualizado TEXT NOT NULL DEFAULT (datetime('now'))
);
