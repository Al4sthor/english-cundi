# La página (pagina-web)

Servidor **Flask (Python)** con registro, inicio de sesión y las páginas de aprendizaje.

| Archivo / carpeta | Qué es |
|---|---|
| `app.py` | Servidor: rutas, login, registro, sesiones y seguridad |
| `templates/` | Páginas HTML (Jinja2): `base`, `login`, `registro`, `inicio`, `privacidad`, `error` |
| `static/css/estilo.css` | Todos los estilos (colores en variables `:root`) |
| `static/img/` | Logo e imágenes públicas |
| `contenido/` | Pruebas y plantillas del equipo; solo se abren con la sesión iniciada |
| `requirements.txt` | Librerías (solo Flask) |
| `clave_secreta.txt` | Se crea sola la primera vez. **Privada**: no se sube |

## Para quien mejora el diseño (front-end)

Puedes cambiar libremente `templates/` y `static/`. No cambies sin avisar:

- Los `name` de los campos de los formularios (`nombre`, `correo`, `password`, `confirmar`, `acepta`, `siguiente`): los lee `app.py`.
- La línea `<input type="hidden" name="csrf" value="{{ token_csrf() }}">` dentro de cada formulario. Sin ella el formulario da error 400.
- Los enlaces `{{ url_for(...) }}`: no los cambies por rutas escritas a mano.
- El bloque `{% if ayuda %}` del botón de ayuda en `base.html`: puedes cambiarle el estilo, pero no la lógica.

## Pruebas y plantillas

Van en `contenido/` con estos nombres: `diagnostico/a1.html`, `diagnostico/a2.html`, `plantillas/a1.html`, `plantillas/a2.html`, `pruebas/a1.html`, `pruebas/a2.html`.
Cuando el archivo existe, la tarjeta de la página de inicio cambia sola de **Próximamente** a **Empezar**.

## Cómo está publicada

En PythonAnywhere, el archivo WSGI apunta a esta carpeta:

```python
import sys
ruta = "/home/englishcundi/english-cundi/pagina-web"
if ruta not in sys.path:
    sys.path.insert(0, ruta)
from app import app as application
```

**Para actualizar:** sube los archivos cambiados y pulsa **Reload** en la pestaña Web.
La cuenta gratuita se renueva cada mes, en la pestaña Web con el botón *Run until 1 month from today*.

## Portada, práctica y progreso

| Ruta | Qué es |
|---|---|
| `/` | Portada pública: quiénes somos (Nodex), misión, visión, video de YouTube y consejos. La misión y la visión son un borrador: el equipo puede cambiarlas en `templates/portada.html`. |
| `/panel` | Panel del alumno (antes era `/`): diagnóstico, plantillas y prueba. Pide sesión. |
| `/practica` | Zona de práctica con 10 modos de juego, cuaderno de errores, logros y estadísticas. Pide sesión. |
| `/api/progreso` | Lee y guarda el progreso (XP, racha, logros, cuaderno de errores). Solo la usa JavaScript. |

- **Contenido de la práctica:** `contenido/practica/a1.json` y `a2.json` (vocabulario, preguntas, Boss Challenge, frases y conversaciones). Para agregar palabras o preguntas basta editar el JSON.
- **Código:** `static/js/progreso.js` (XP, nivel, racha, misiones, logros) y `static/js/practica.js` (los modos). Estilos en `static/css/practica.css`.
- **Base de datos:** la tabla `progreso` guarda un JSON por alumno. `app.py` la crea sola si falta; también está en `base-de-datos/schema.sql`.
- **Sin archivos de audio:** la escucha usa la voz del navegador (Web Speech) y el Speaking usa el reconocimiento de voz de Chrome o Edge.
