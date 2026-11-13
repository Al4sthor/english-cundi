# La base de datos (base-de-datos)

Base de datos **SQLite**: un solo archivo, `usuarios.db`, que vive en esta carpeta. La página (`pagina-web/app.py`) lo abre directamente con el módulo `sqlite3` de Python. No hay servidor de base de datos aparte ni servicios de terceros.

| Archivo | Qué es |
|---|---|
| `schema.sql` | Estructura de la tabla `usuarios` |
| `init_db.py` | Crea `usuarios.db` vacío (se ejecuta una sola vez: `py base-de-datos/init_db.py`) |
| `usuarios.db` | La base de datos. **Privada**: no se sube a GitHub |
| `sql-server/` | Copia de la base en SQL Server para consultas (ver abajo) |

## Tablas

**usuarios**: `id`, `correo` (único), `nombre`, `password_hash` (contraseña cifrada, nunca la real) y `creado_en`.

Las tablas del chatbot se crean solas la primera vez que se usa el bot:

| Tabla | Qué guarda |
|---|---|
| `soporte_admins` | Chats de Telegram del equipo que reciben los avisos |
| `soporte_alumnos` | Alumnos que escribieron al bot y su usuario de la web |
| `soporte_tickets` | Solicitudes que necesitan a una persona |
| `soporte_mensajes` | Historial de cada solicitud |
| `soporte_avisos` | Qué aviso corresponde a qué solicitud (para responder) |

## Cómo se conecta con la página

```python
DB_PATH = os.path.join(RAIZ, "base-de-datos", "usuarios.db")   # en pagina-web/app.py
g.db = sqlite3.connect(DB_PATH)        # una conexión por visita, se cierra al terminar
db.execute("SELECT ... WHERE correo = ?", (correo,))   # consultas parametrizadas
```

## Copia en SQL Server (`sql-server/`)

1. En PythonAnywhere, Files, `english-cundi/base-de-datos/`: descarga `usuarios.db`.
2. Ejecuta `py importar_sqlserver.py "ruta\a\usuarios.db"` (usa autenticación de Windows con `localhost`).
3. En SQL Server Management Studio abre `consultas_englishcundi.sql` y pulsa F5.

Se crea la base `EnglishCundi`, con la tabla `dbo.usuarios` y la vista `dbo.v_usuarios` (con la hora de Colombia).

**Copia de seguridad:** de vez en cuando descarga `usuarios.db` desde la pestaña Files de PythonAnywhere.
