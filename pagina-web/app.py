"""English Cundi - versión de prueba.

Login y registro con Flask + SQLite (base de datos propia, sin Firebase).
Las páginas de las pruebas y plantillas van en contenido/ y solo se abren
con sesión iniciada.

Autor: David Estiven Sánchez Yomayuza
Proyecto: English Cundi - Ingeniería de Sistemas y Computación,
Universidad de Cundinamarca, Extensión Chía (2026).
"""
__author__ = "David  Sánchez wilder ortiz kevin contreras"
import os
import re
import secrets
import sqlite3
from functools import wraps

from flask import (Flask, abort, flash, g, redirect, render_template, request,
                   send_from_directory, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

# Carpetas del proyecto:
#   pagina-web/            esta carpeta (servidor Flask, plantillas, estilos)
#   base-de-datos/         usuarios.db y los scripts de la base de datos
#   comunicacion-chatbot/  bot de Telegram
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
RAIZ = os.path.dirname(BASE_DIR)
DB_PATH = os.path.join(RAIZ, "base-de-datos", "usuarios.db")
CONTENIDO_DIR = os.path.join(BASE_DIR, "contenido")

import sys  # noqa: E402
sys.path.insert(0, os.path.join(RAIZ, "comunicacion-chatbot"))
import soporte_telegram  # noqa: E402


def cargar_clave_secreta():
    """Usa SECRET_KEY si existe; si no, crea pagina-web/clave_secreta.txt
    la primera vez y la reutiliza. Así nunca hay que copiarla a mano."""
    if os.environ.get("SECRET_KEY"):
        return os.environ["SECRET_KEY"]
    ruta = os.path.join(BASE_DIR, "clave_secreta.txt")
    if not os.path.isfile(ruta):
        os.makedirs(os.path.dirname(ruta), exist_ok=True)
        with open(ruta, "w", encoding="utf-8") as archivo:
            archivo.write(secrets.token_hex(32))
    with open(ruta, encoding="utf-8") as archivo:
        return archivo.read().strip()


app = Flask(__name__)
app.secret_key = cargar_clave_secreta()
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

# Soporte por Telegram: botón "¿Necesitas ayuda?" + bot (ver soporte_telegram.py).
soporte_telegram.iniciar(app)

CORREO_VALIDO = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

# Módulos que aparecen en la página de inicio.
# Cada integrante deja su archivo HTML en la ruta indicada dentro de contenido/.
# Si el archivo todavía no existe, la tarjeta sale como "Próximamente".
MODULOS = [
    {
        "titulo": "Diagnóstico",
        "descripcion": "Descubre tu nivel de inglés con una prueba interactiva.",
        "color": "verde",
        "niveles": [("A1", "diagnostico/a1.html"), ("A2", "diagnostico/a2.html")],
    },
    {
        "titulo": "Plantillas de conocimiento",
        "descripcion": "Infografías y ejercicios para reforzar cada tema.",
        "color": "azul",
        "niveles": [("A1", "plantillas/a1.html"), ("A2", "plantillas/a2.html")],
    },
    {
        "titulo": "Prueba de conocimiento",
        "descripcion": "Demuestra lo que aprendiste y obtén tu calificación.",
        "color": "dorado",
        "niveles": [("A1", "pruebas/a1.html"), ("A2", "pruebas/a2.html")],
    },
]


# ---------------------------------------------------------------- base de datos
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def cerrar_db(error):
    db = g.pop("db", None)
    if db is not None:
        db.close()


# ------------------------------------------------------------------- seguridad
def token_csrf():
    """Token por sesión que viaja oculto en cada formulario."""
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


app.jinja_env.globals["token_csrf"] = token_csrf


@app.before_request
def verificar_csrf():
    # Telegram no envía formularios: su webhook se protege con un secreto propio.
    if request.method == "POST" and request.endpoint != "soporte.webhook":
        enviado = request.form.get("csrf", "")
        if not enviado or not secrets.compare_digest(enviado, session.get("csrf", "")):
            abort(400)


def login_required(vista):
    @wraps(vista)
    def envoltura(*args, **kwargs):
        if "usuario_id" not in session:
            return redirect(url_for("login", siguiente=request.path))
        # Si el usuario fue borrado de la base de datos, su sesión deja de valer.
        existe = get_db().execute(
            "SELECT 1 FROM usuarios WHERE id = ?", (session["usuario_id"],)
        ).fetchone()
        if existe is None:
            session.clear()
            return redirect(url_for("login", siguiente=request.path))
        return vista(*args, **kwargs)
    return envoltura


def destino_seguro(ruta):
    # Solo se permite volver a rutas de este mismo sitio.
    if ruta and ruta.startswith("/") and not ruta.startswith("//") and "\\" not in ruta:
        return ruta
    return url_for("inicio")


# ---------------------------------------------------------------------- vistas
@app.route("/")
@login_required
def inicio():
    modulos = []
    for modulo in MODULOS:
        niveles = [
            {
                "nombre": nombre,
                "ruta": ruta,
                "listo": os.path.isfile(os.path.join(CONTENIDO_DIR, ruta)),
            }
            for nombre, ruta in modulo["niveles"]
        ]
        modulos.append({**modulo, "niveles": niveles})
    return render_template("inicio.html", modulos=modulos)


@app.route("/registro", methods=["GET", "POST"])
def registro():
    if "usuario_id" in session:
        return redirect(url_for("inicio"))

    if request.method == "POST":
        nombre = request.form.get("nombre", "").strip()
        correo = request.form.get("correo", "").strip().lower()
        password = request.form.get("password", "")
        confirmar = request.form.get("confirmar", "")
        acepta = request.form.get("acepta") == "si"

        error = None
        if not (2 <= len(nombre) <= 60):
            error = "El nombre debe tener entre 2 y 60 caracteres."
        elif not CORREO_VALIDO.match(correo) or len(correo) > 120:
            error = "Escribe un correo válido."
        elif len(password) < 8:
            error = "La contraseña debe tener 8 caracteres o más."
        elif password != confirmar:
            error = "Las contraseñas no coinciden."
        elif not acepta:
            error = "Debes aceptar el tratamiento de datos para crear la cuenta."

        if error is None:
            try:
                db = get_db()
                db.execute(
                    "INSERT INTO usuarios (correo, nombre, password_hash) VALUES (?, ?, ?)",
                    (correo, nombre, generate_password_hash(password)),
                )
                db.commit()
            except sqlite3.IntegrityError:
                error = "Ese correo ya está registrado."

        if error is None:
            flash("Cuenta creada. Ya puedes iniciar sesión.", "ok")
            return redirect(url_for("login"))
        flash(error, "error")
        return render_template("registro.html", nombre=nombre, correo=correo)

    return render_template("registro.html", nombre="", correo="")


@app.route("/login", methods=["GET", "POST"])
def login():
    if "usuario_id" in session:
        return redirect(url_for("inicio"))

    if request.method == "POST":
        correo = request.form.get("correo", "").strip().lower()
        password = request.form.get("password", "")
        siguiente = request.form.get("siguiente", "")

        fila = get_db().execute(
            "SELECT id, nombre, password_hash FROM usuarios WHERE correo = ?",
            (correo,),
        ).fetchone()

        if fila is not None and check_password_hash(fila["password_hash"], password):
            session.clear()
            session["usuario_id"] = fila["id"]
            session["nombre"] = fila["nombre"]
            return redirect(destino_seguro(siguiente))

        flash("Correo o contraseña incorrectos.", "error")
        return render_template("login.html", correo=correo, siguiente=siguiente)

    return render_template("login.html", correo="",
                           siguiente=request.args.get("siguiente", ""))


@app.route("/salir", methods=["POST"])
def salir():
    session.clear()
    flash("Sesión cerrada.", "ok")
    return redirect(url_for("login"))


@app.route("/privacidad")
def privacidad():
    return render_template("privacidad.html")


@app.route("/contenido/<path:ruta>")
@login_required
def contenido(ruta):
    # send_from_directory impide salirse de la carpeta contenido/.
    return send_from_directory(CONTENIDO_DIR, ruta)


@app.errorhandler(404)
def no_encontrado(error):
    return render_template("error.html", codigo=404,
                           mensaje="Esta página no existe o todavía no está lista."), 404


@app.errorhandler(400)
def solicitud_invalida(error):
    return render_template("error.html", codigo=400,
                           mensaje="El formulario expiró. Vuelve atrás, recarga la página e inténtalo de nuevo."), 400


if __name__ == "__main__":
    # Solo para probar en tu computador. PythonAnywhere no usa este bloque.
    app.run(debug=True)
