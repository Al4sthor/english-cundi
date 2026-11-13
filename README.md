# English Cundi

Página web para medir y practicar inglés (niveles A1 y A2), con soporte a alumnos por Telegram.

**En línea:** https://englishcundi.pythonanywhere.com
**Equipo:** David Estiven Sánchez Yomayuza · Kevin Contreras · Wilder Ortiz
Ingeniería de Sistemas y Computación, Universidad de Cundinamarca, Extensión Chía (2026).

---

## Dónde está cada cosa

| Carpeta | Qué hay | Lee esto |
|---|---|---|
| [`pagina-web/`](pagina-web/) | **La página**: servidor Flask, páginas HTML, estilos, imágenes y las pruebas del equipo | [pagina-web/README.md](pagina-web/README.md) |
| [`base-de-datos/`](base-de-datos/) | **La base de datos**: estructura (SQLite), script para crearla y copia a SQL Server | [base-de-datos/README.md](base-de-datos/README.md) |
| [`comunicacion-chatbot/`](comunicacion-chatbot/) | **La comunicación (chatbot)**: bot de Telegram del botón "¿Necesitas ayuda?" | [comunicacion-chatbot/README.md](comunicacion-chatbot/README.md) |
| [`docs/`](docs/) | **Documentación técnica** en Word (hosting, base de datos, conexión, chatbot) | [docs/](docs/) |

```
english-cundi/
├── pagina-web/              ← la página
│   ├── app.py                  servidor (login, registro, páginas)
│   ├── templates/              páginas HTML
│   ├── static/                 estilos (css) e imágenes
│   ├── contenido/              pruebas y plantillas del equipo
│   └── requirements.txt        librerías (Flask)
├── base-de-datos/           ← la base de datos
│   ├── schema.sql              tablas
│   ├── init_db.py              crea usuarios.db
│   └── sql-server/             copia y consultas en SQL Server
├── comunicacion-chatbot/    ← la comunicación (chatbot de Telegram)
│   ├── soporte_telegram.py     el bot
│   └── configurar_telegram.py  lo conecta con Telegram
└── docs/                    ← documentación técnica (Word)
```

## Cómo se conectan

```
Alumno ──> pagina-web (Flask) ──> base-de-datos/usuarios.db
              │
              └── botón "¿Necesitas ayuda?" ──> Telegram ──> comunicacion-chatbot
```

## Probarlo en el computador (Windows)

```
git clone https://github.com/Al4sthor/english-cundi.git
cd english-cundi
py -m venv venv
venv\Scripts\activate
pip install -r pagina-web/requirements.txt
py base-de-datos/init_db.py
py pagina-web/app.py
```

Abre http://127.0.0.1:5000 y crea una cuenta de prueba. En VS Code también puedes abrir `English Cundi.code-workspace` y pulsar F5.

## Quién pone qué

| Integrante | Archivo(s) |
|---|---|
| David Sánchez | `pagina-web/contenido/diagnostico/a1.html`, `pagina-web/contenido/pruebas/a1.html`, `pagina-web/contenido/pruebas/a2.html` |
| Kevin Contreras | `pagina-web/contenido/diagnostico/a2.html`, `pagina-web/contenido/plantillas/a1.html`, `pagina-web/contenido/plantillas/a2.html`, diseño en `pagina-web/templates/` y `pagina-web/static/` |
| Wilder Ortiz | Infografías A2 (imágenes) en `pagina-web/contenido/plantillas/` |

## Cómo aportar cambios

1. `git pull` para traer lo último.
2. `git checkout -b mi-cambio` para trabajar en tu propia rama.
3. Haz los cambios y pruébalos con `py pagina-web/app.py`.
4. `git add .`, `git commit -m "Qué cambié"` y `git push -u origin mi-cambio`.
5. En GitHub abre un **Pull Request** hacia `main`. David lo revisa y lo publica.

## Lo que nunca se sube

`base-de-datos/usuarios.db` (datos reales), `pagina-web/clave_secreta.txt`, `comunicacion-chatbot/telegram.json` (token del bot) y `venv/`. El `.gitignore` ya los bloquea. Nunca escribas tokens ni contraseñas dentro del código.
