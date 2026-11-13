# English Cundi — versión de prueba

En línea: https://d4vids4nchez.pythonanywhere.com

**Autor:** David Estiven Sánchez Yomayuza · Ingeniería de Sistemas y Computación, Universidad de Cundinamarca, Extensión Chía (2026).

Página web con registro e inicio de sesión. Usa **Flask (Python)** y **SQLite**, una base de datos propia guardada en un archivo, sin Firebase.
Las pruebas y plantillas del equipo van en `contenido/` y solo se abren con la sesión iniciada.

## Estructura

```
english-cundi/
  app.py            servidor (login, registro, páginas protegidas)
  schema.sql        tabla de usuarios
  init_db.py        crea datos/usuarios.db (se ejecuta una sola vez)
  requirements.txt
  datos/            base de datos (NO se sube a GitHub ni se pisa al actualizar)
  templates/        login, registro, inicio, privacidad, error
  static/           estilos y logo (públicos)
  contenido/        páginas del equipo (solo con sesión)
    diagnostico/a1.html   ← página de ejemplo, se reemplaza por la prueba real
    diagnostico/a2.html
    plantillas/a1.html, a2.html
    pruebas/a1.html, a2.html
```

Las tarjetas de la página de inicio se activan solas: cuando existe el archivo, el botón dice **Empezar**; si no existe, dice **Próximamente**.

## Quién pone qué (según el EDT)

| Integrante | Archivo(s) |
|---|---|
| David Sánchez | `contenido/diagnostico/a1.html`, `contenido/pruebas/a1.html`, `contenido/pruebas/a2.html` |
| Kevin Contreras | `contenido/diagnostico/a2.html`, `contenido/plantillas/a1.html`, `contenido/plantillas/a2.html`, diseño en `templates/` y `static/` |
| Wilder Ortiz | Infografías A2 (imágenes) en `contenido/plantillas/` |

Las imágenes que se usen dentro de una página de `contenido/` se enlazan como `/contenido/plantillas/imagen.png`.

## Soporte por Telegram (botón "¿Necesitas ayuda?")

Abajo a la derecha de todas las páginas hay un botón que abre el bot de Telegram del proyecto.
Si el alumno tiene la sesión iniciada, el bot ya sabe quién es (nombre y correo). El enlace va firmado para que nadie se haga pasar por otro alumno.

**Qué hace el bot**
- Muestra 3 opciones: **👤 Mi cuenta**, **📚 La plataforma** y **💬 Preguntas generales**, cada una con preguntas frecuentes que se responden solas.
- También entiende algunas preguntas escritas a mano (por ejemplo "¿cuánto cuesta?" o "no puedo entrar").
- Si no puede resolverlo, porque el alumno pulsa **🙋 Hablar con una persona**, escribe algo que el bot no entiende, olvidó su contraseña o quiere borrar sus datos, crea una **solicitud #N** y **avisa a los admins** por Telegram.
- El admin **responde al aviso** (deslizar o mantener pulsado → *Responder*) y el bot le reenvía la respuesta al alumno. Se pueden mandar fotos y capturas en los dos sentidos.
- Comandos de admin: `/pendientes` (solicitudes abiertas), `/cerrar 12` (o el botón **✅ Marcar resuelta**).

Archivos: `soporte_telegram.py` (el bot) y `configurar_telegram.py` (lo conecta). Las preguntas y respuestas se editan en `PREGUNTAS` dentro de `soporte_telegram.py`.
Las solicitudes se guardan en `datos/usuarios.db`, en las tablas `soporte_tickets` y `soporte_mensajes`, que se crean solas.
Mientras el bot no esté configurado, el botón no aparece.

**Activarlo (una sola vez)**
1. En Telegram, abre **@BotFather** → `/newbot` → ponle nombre (ej. *English Cundi Ayuda*) y un usuario que termine en `bot`. Copia el **token**. Es como una contraseña: no lo pegues en el código ni en el chat.
2. Sube a PythonAnywhere (Files → `english-cundi/`) los archivos nuevos o cambiados: `app.py`, `soporte_telegram.py`, `configurar_telegram.py`, `templates/base.html`, `static/css/estilo.css`, `README.md`.
3. Consoles → Bash:
   ```
   cd ~/english-cundi
   python3 configurar_telegram.py
   ```
   Pega el token (no se ve al pegarlo) y pulsa Enter en la dirección. Se crea `datos/telegram.json`, que es privado.
4. Pestaña **Web** → **Reload**.
5. En Telegram, escríbele a tu bot `/admin CODIGO` (el código lo muestra el paso 3). Kevin y Wilder pueden hacer lo mismo para recibir los avisos.
6. Prueba: entra a la página → **¿Necesitas ayuda?** → escribe algo raro, por ejemplo "hola tengo un problema con mi nota". Te debe llegar el aviso.

Si no llega nada, revisa el **error log** de la pestaña Web y busca `Telegram`.

## Probar en el computador (Windows)

Abre una terminal dentro de esta carpeta y ejecuta:

```
py -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
py init_db.py
py app.py
```

Después abre http://127.0.0.1:5000. Para apagar el servidor, pulsa Ctrl+C.

## Publicar en PythonAnywhere (gratis)

1. Crea una cuenta *Beginner* en pythonanywhere.com.
2. Comprime la carpeta `english-cundi` en un ZIP **sin** `venv/` ni `datos/`.
3. Pestaña **Files** → sube el ZIP. Pestaña **Consoles** → abre una consola Bash:
   ```
   unzip english-cundi.zip
   cd ~/english-cundi
   python3 init_db.py
   ```
4. Pestaña **Web** → *Add a new web app* → **Manual configuration** → elige la versión de Python más reciente.
5. En la pestaña **Web**, abre el archivo **WSGI configuration file**, borra todo lo que tiene y pega esto (cambia `USUARIO`):
   ```python
   import sys
   ruta = "/home/USUARIO/english-cundi"
   if ruta not in sys.path:
       sys.path.insert(0, ruta)
   from app import app as application
   ```
   La clave secreta se crea sola la primera vez en `datos/clave_secreta.txt`. No la compartas y no la subas a GitHub.
6. En **Web**, activa **Force HTTPS**, pulsa **Reload** y abre `https://USUARIO.pythonanywhere.com`.
7. Si algo falla, revisa el **error log** en la pestaña Web.

**Para actualizar:** sube solo los archivos que cambiaron, sin tocar `datos/`, y pulsa **Reload**.
**Importante:** la app gratis se desactiva si no se renueva cada mes. Entra a la pestaña Web y pulsa *Run until 1 month from today* (PythonAnywhere avisa por correo una semana antes). Primera fecha límite: 11 de diciembre de 2026.
**Copia de seguridad:** de vez en cuando, descarga `datos/usuarios.db` desde la pestaña Files.

## Seguridad incluida

- Las contraseñas se guardan con hash; nunca en texto plano.
- Protección CSRF en todos los formularios.
- Las páginas de `contenido/` solo se abren con sesión iniciada, y no se puede salir de esa carpeta con la URL.
- Casilla de aceptación del tratamiento de datos (Ley 1581 de 2012) y página `/privacidad`.
