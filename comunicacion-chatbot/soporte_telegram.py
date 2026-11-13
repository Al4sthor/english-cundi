"""English Cundi - soporte a alumnos por Telegram.

Cómo funciona:
  1. En la web hay un botón flotante "¿Necesitas ayuda?" que abre el bot.
  2. El bot muestra 3 opciones (Mi cuenta, La plataforma, Preguntas generales),
     cada una con preguntas frecuentes que se responden solas.
  3. Si el alumno pide "Hablar con una persona", o escribe algo que el bot no
     entiende, se crea una solicitud y el bot avisa al equipo (los admins).
  4. El admin RESPONDE al aviso en Telegram (deslizar / "Responder") y el bot
     le reenvía la respuesta al alumno.

Telegram llama a /telegram/webhook (no hace falta un proceso corriendo siempre,
por eso sirve en la cuenta gratis de PythonAnywhere).

La configuración (token del bot, etc.) vive en comunicacion-chatbot/telegram.json y la crea
configurar_telegram.py. Ese archivo NO se comparte ni se sube a GitHub.

Autor: David Estiven Sánchez Yomayuza
Proyecto: English Cundi - Ingeniería de Sistemas y Computación,
Universidad de Cundinamarca, Extensión Chía (2026).
"""
__author__ = "David Estiven Sánchez Yomayuza"

import base64
import hashlib
import hmac
import html
import json
import logging
import os
import re
import secrets
import sqlite3
import unicodedata
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

from flask import Blueprint, current_app, request, session

BASE_DIR = os.path.abspath(os.path.dirname(__file__))      # comunicacion-chatbot/
RAIZ = os.path.dirname(BASE_DIR)
DB_PATH = os.path.join(RAIZ, "base-de-datos", "usuarios.db")
CONFIG_PATH = os.path.join(BASE_DIR, "telegram.json")       # privado, no va a GitHub
HORA_COLOMBIA = timezone(timedelta(hours=-5))

soporte = Blueprint("soporte", __name__)
log = logging.getLogger("english_cundi.telegram")

TABLAS = """
CREATE TABLE IF NOT EXISTS soporte_admins (
  chat_id     INTEGER PRIMARY KEY,
  nombre      TEXT,
  agregado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS soporte_alumnos (
  chat_id         INTEGER PRIMARY KEY,
  usuario_id      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  nombre_telegram TEXT,
  usuario_tg      TEXT,
  esperando       TEXT,
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS soporte_tickets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id    INTEGER NOT NULL,
  usuario_id INTEGER,
  tema       TEXT NOT NULL,
  estado     TEXT NOT NULL DEFAULT 'abierto',
  creado_en  TEXT NOT NULL DEFAULT (datetime('now')),
  cerrado_en TEXT
);
CREATE TABLE IF NOT EXISTS soporte_mensajes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES soporte_tickets(id),
  autor     TEXT NOT NULL,
  texto     TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS soporte_avisos (
  admin_chat_id INTEGER NOT NULL,
  message_id    INTEGER NOT NULL,
  ticket_id     INTEGER NOT NULL REFERENCES soporte_tickets(id),
  PRIMARY KEY (admin_chat_id, message_id)
);
"""

# ------------------------------------------------------- preguntas frecuentes
# Cada categoría es uno de los 3 botones del menú. "palabras" sirve para que
# el bot reconozca la pregunta aunque el alumno la escriba con sus palabras.
# "escalar": el bot no puede resolverlo solo; pide un dato y avisa al equipo.
CATEGORIAS = {
    "cuenta": ("Mi cuenta", ["clave", "entrar", "datos"]),
    "plataforma": ("La plataforma", ["empezar", "pronto", "falla"]),
    "general": ("Preguntas generales", ["que_es", "costo", "privacidad"]),
}

PREGUNTAS = {
    "clave": {
        "titulo": "Olvidé mi contraseña",
        "respuesta": "Por ahora English Cundi no tiene recuperación automática de "
                     "contraseña, así que un integrante del equipo te ayuda a "
                     "restablecerla.",
        "escalar": "Escribe aquí <b>el correo con el que te registraste</b> y se lo "
                   "paso al equipo.",
        "palabras": ["contrasena", "clave", "password", "olvide", "recuperar"],
    },
    "entrar": {
        "titulo": "No puedo iniciar sesión",
        "respuesta": "Revisa esto:\n"
                     "• Escribe el correo <b>exactamente</b> como lo registraste.\n"
                     "• La contraseña distingue mayúsculas y minúsculas: revisa Bloq Mayús.\n"
                     "• La contraseña tiene 8 caracteres o más.\n"
                     "• Si nunca creaste la cuenta, usa <b>Regístrate gratis</b> en la página.\n"
                     "• Si dice <i>“Correo o contraseña incorrectos”</i> y estás seguro de "
                     "tus datos, pide ayuda a una persona.",
        "palabras": ["iniciar sesion", "entrar", "ingresar", "login", "no me deja",
                     "incorrectos", "acceder"],
    },
    "datos": {
        "titulo": "Cambiar mis datos o borrar mi cuenta",
        "respuesta": "Según la Ley 1581 de 2012 puedes pedir que actualicemos, "
                     "corrijamos o borremos tus datos. Lo hace el equipo a mano.",
        "escalar": "Escribe aquí <b>tu correo y qué quieres cambiar o borrar</b>, y "
                   "se lo paso al equipo.",
        "palabras": ["borrar", "eliminar", "cambiar mi nombre", "cambiar correo",
                     "actualizar", "mis datos"],
    },
    "empezar": {
        "titulo": "¿Cómo empiezo?",
        "respuesta": "Inicia sesión y sigue la ruta de la página de inicio:\n"
                     "1. <b>Diagnóstico</b>: descubre tu nivel (A1 o A2).\n"
                     "2. <b>Plantillas</b>: infografías y ejercicios para reforzar.\n"
                     "3. <b>Prueba de conocimiento</b>: demuestra lo que aprendiste.\n"
                     "Elige el nivel y pulsa <b>Empezar →</b>.",
        "palabras": ["empiezo", "empezar", "comenzar", "como funciona", "como se usa",
                     "que hago", "ruta"],
    },
    "pronto": {
        "titulo": "Un módulo dice “Próximamente”",
        "respuesta": "Significa que el equipo todavía está preparando esa sección. "
                     "Se activa sola apenas esté lista; no tienes que hacer nada. "
                     "Mientras tanto, usa los módulos que dicen <b>Empezar →</b>.",
        "palabras": ["proximamente", "no esta lista", "bloqueado", "no abre el modulo"],
    },
    "falla": {
        "titulo": "La página no carga o sale un error",
        "respuesta": "Prueba en este orden:\n"
                     "• Si dice <i>“El formulario expiró”</i>: vuelve atrás, recarga la "
                     "página (F5) e inténtalo otra vez.\n"
                     "• Cierra sesión con <b>Salir</b> y vuelve a entrar.\n"
                     "• Prueba en otro navegador o en modo incógnito.\n"
                     "Si sigue fallando, pide ayuda a una persona y cuéntale qué "
                     "error ves (puedes mandar captura).",
        "palabras": ["error", "no carga", "no funciona", "falla", "se cae", "expiro",
                     "pantalla en blanco", "404", "400", "500"],
    },
    "que_es": {
        "titulo": "¿Qué es English Cundi?",
        "respuesta": "Es un proyecto de estudiantes de Ingeniería de Sistemas y "
                     "Computación de la Universidad de Cundinamarca, Extensión Chía, "
                     "para medir y practicar tu inglés en los niveles A1 y A2.",
        "palabras": ["que es", "quienes son", "proyecto", "para que sirve"],
    },
    "costo": {
        "titulo": "¿Tiene algún costo?",
        "respuesta": "No. English Cundi es <b>gratis</b>: solo necesitas crear tu cuenta.",
        "palabras": ["costo", "cuesta", "pagar", "precio", "gratis", "valor"],
    },
    "privacidad": {
        "titulo": "¿Qué hacen con mis datos?",
        "respuesta": "Solo guardamos tu nombre, correo y contraseña (cifrada: nadie, ni "
                     "el equipo, puede leerla). Se usan únicamente para que inicies "
                     "sesión; no se venden ni se comparten.{enlace}",
        "palabras": ["privacidad", "datos personales", "seguridad", "comparten"],
    },
}

# Palabras que significan "quiero hablar con alguien" escritas a mano.
PIDE_PERSONA = ["una persona", "un humano", "asesor", "hablar con alguien"]


# ---------------------------------------------------------------- utilidades
def cargar_config():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as archivo:
            return json.load(archivo)
    except (FileNotFoundError, ValueError):
        return {}


def guardar_config(config):
    os.makedirs(BASE_DIR, exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as archivo:
        json.dump(config, archivo, indent=2, ensure_ascii=False)


def conectar():
    conexion = sqlite3.connect(DB_PATH)
    conexion.row_factory = sqlite3.Row
    conexion.executescript(TABLAS)
    return conexion


def normalizar(texto):
    """Minúsculas y sin tildes, para comparar palabras clave."""
    texto = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in texto if unicodedata.category(c) != "Mn")


def e(texto):
    return html.escape(str(texto or ""), quote=False)


def hora_colombia(utc_sqlite):
    fecha = datetime.strptime(utc_sqlite, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)
    return fecha.astimezone(HORA_COLOMBIA).strftime("%d/%m/%Y %I:%M %p")


# ------------------------------------------------------------- API Telegram
def api(metodo, **datos):
    """Llama a la API de Telegram. Devuelve el "result" o None si falla.
    Nunca escribe el token en el log."""
    token = cargar_config().get("token")
    if not token:
        log.warning("Telegram sin configurar: falta comunicacion-chatbot/telegram.json")
        return None
    cuerpo = json.dumps({k: v for k, v in datos.items() if v is not None}).encode("utf-8")
    pedido = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{metodo}", data=cuerpo,
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(pedido, timeout=10) as respuesta:
            resultado = json.load(respuesta)
    except urllib.error.HTTPError as error:
        try:
            detalle = json.load(error).get("description")
        except Exception:
            detalle = error.code
        log.warning("Telegram %s falló: %s", metodo, detalle)
        return None
    except (urllib.error.URLError, OSError) as error:
        log.warning("Telegram %s sin conexión: %s", metodo, type(error).__name__)
        return None
    return resultado.get("result") if resultado.get("ok") else None


def teclado(filas):
    return {"inline_keyboard": [
        [{"text": texto, "callback_data": dato} for texto, dato in fila] for fila in filas
    ]}


def enviar(chat_id, texto, filas=None, responder_a=None):
    return api("sendMessage", chat_id=chat_id, text=texto, parse_mode="HTML",
               disable_web_page_preview=True,
               reply_markup=teclado(filas) if filas else None,
               reply_parameters={"message_id": responder_a,
                                 "allow_sending_without_reply": True} if responder_a else None)


# ------------------------------------------------- enlace desde la página web
def _firma(usuario_id, clave):
    digest = hmac.new(clave.encode(), f"u{usuario_id}".encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest)[:16].decode()


def codigo_inicio(usuario_id, clave):
    """Texto que viaja en t.me/bot?start=... para saber qué alumno escribe.
    Va firmado para que nadie pueda hacerse pasar por otro alumno."""
    return f"u{usuario_id}-{_firma(usuario_id, clave)}"


def leer_codigo_inicio(codigo, clave):
    coincide = re.fullmatch(r"u(\d+)-([A-Za-z0-9_-]{16})", codigo or "")
    if not coincide:
        return None
    usuario_id = int(coincide.group(1))
    if hmac.compare_digest(coincide.group(2), _firma(usuario_id, clave)):
        return usuario_id
    return None


def enlace_ayuda():
    """URL del botón flotante, o None si el bot aún no está configurado."""
    usuario_bot = cargar_config().get("usuario_bot")
    if not usuario_bot:
        return None
    enlace = f"https://t.me/{usuario_bot}"
    if "usuario_id" in session:
        enlace += "?start=" + codigo_inicio(session["usuario_id"], current_app.secret_key)
    return enlace


# --------------------------------------------------------- lógica del bot
def menu_principal():
    filas = [[(nombre, f"cat:{clave}")] for clave, (nombre, _) in CATEGORIAS.items()]
    filas.append([("Hablar con una persona", "humano")])
    return filas


def acciones_despues_de_respuesta(categoria):
    return [
        [("Eso me ayudó", "ok")],
        [("Hablar con una persona", "humano")],
        [("Otra pregunta", f"cat:{categoria}"), ("Menú", "menu")],
    ]


def categoria_de(pregunta):
    for clave, (_, preguntas) in CATEGORIAS.items():
        if pregunta in preguntas:
            return clave
    return "general"


def texto_respuesta(clave):
    respuesta = PREGUNTAS[clave]["respuesta"]
    if "{enlace}" in respuesta:
        sitio = cargar_config().get("url_sitio", "")
        enlace = f"\nLee todo aquí: {sitio}/privacidad" if sitio.startswith("https://") else ""
        respuesta = respuesta.replace("{enlace}", enlace)
    return f"<b>{e(PREGUNTAS[clave]['titulo'])}</b>\n\n{respuesta}"


def adivinar_pregunta(texto):
    """Busca la pregunta frecuente que mejor coincide con lo que escribió."""
    texto = normalizar(texto)
    mejor, puntos_mejor = None, 0
    for clave, datos in PREGUNTAS.items():
        puntos = sum(1 for palabra in datos["palabras"] if palabra in texto)
        if puntos > puntos_mejor:
            mejor, puntos_mejor = clave, puntos
    return mejor


def registrar_alumno(db, desde, usuario_id=None):
    nombre = " ".join(filter(None, [desde.get("first_name"), desde.get("last_name")]))
    db.execute(
        """INSERT INTO soporte_alumnos (chat_id, usuario_id, nombre_telegram, usuario_tg)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(chat_id) DO UPDATE SET
             usuario_id = COALESCE(excluded.usuario_id, soporte_alumnos.usuario_id),
             nombre_telegram = excluded.nombre_telegram,
             usuario_tg = excluded.usuario_tg,
             actualizado_en = datetime('now')""",
        (desde["id"], usuario_id, nombre, desde.get("username")))


def datos_alumno(db, chat_id):
    return db.execute(
        """SELECT a.*, u.nombre AS nombre_web, u.correo
           FROM soporte_alumnos a LEFT JOIN usuarios u ON u.id = a.usuario_id
           WHERE a.chat_id = ?""", (chat_id,)).fetchone()


def ticket_abierto(db, chat_id):
    return db.execute(
        "SELECT * FROM soporte_tickets WHERE chat_id = ? AND estado = 'abierto' "
        "ORDER BY id DESC LIMIT 1", (chat_id,)).fetchone()


def admins(db):
    return [fila["chat_id"] for fila in db.execute("SELECT chat_id FROM soporte_admins")]


def es_admin(db, chat_id):
    return db.execute("SELECT 1 FROM soporte_admins WHERE chat_id = ?",
                      (chat_id,)).fetchone() is not None


def avisar_admins(db, ticket_id, texto, mensaje_original=None, chat_origen=None):
    """Manda el aviso a cada admin y guarda qué mensaje corresponde a qué
    solicitud, para que el admin pueda contestar con "Responder"."""
    lista = admins(db)
    if not lista:
        log.warning("Solicitud #%s sin admins registrados (usa /admin en el bot)", ticket_id)
    for admin in lista:
        enviado = enviar(admin, texto, [[("Marcar resuelta", f"cerrar:{ticket_id}")]])
        if enviado:
            db.execute("INSERT OR IGNORE INTO soporte_avisos VALUES (?, ?, ?)",
                       (admin, enviado["message_id"], ticket_id))
        # Fotos, capturas, audios: se copian tal cual debajo del aviso.
        if mensaje_original is not None and chat_origen is not None:
            copia = api("copyMessage", chat_id=admin, from_chat_id=chat_origen,
                        message_id=mensaje_original)
            if copia:
                db.execute("INSERT OR IGNORE INTO soporte_avisos VALUES (?, ?, ?)",
                           (admin, copia["message_id"], ticket_id))
    return bool(lista)


def describir_alumno(alumno):
    partes = []
    if alumno["nombre_web"]:
        partes.append(f"{e(alumno['nombre_web'])} ({e(alumno['correo'])})")
    else:
        partes.append(f"{e(alumno['nombre_telegram'])} <i>(no entró desde la web)</i>")
    if alumno["usuario_tg"]:
        partes.append(f"@{e(alumno['usuario_tg'])}")
    return " · ".join(partes)


def crear_ticket(db, chat_id, tema, texto, mensaje_id=None, es_texto=True):
    alumno = datos_alumno(db, chat_id)
    cursor = db.execute(
        "INSERT INTO soporte_tickets (chat_id, usuario_id, tema) VALUES (?, ?, ?)",
        (chat_id, alumno["usuario_id"], tema))
    ticket_id = cursor.lastrowid
    db.execute("INSERT INTO soporte_mensajes (ticket_id, autor, texto) VALUES (?, 'alumno', ?)",
               (ticket_id, texto))
    creado = db.execute("SELECT creado_en FROM soporte_tickets WHERE id = ?",
                        (ticket_id,)).fetchone()["creado_en"]
    aviso = (f"<b>Nueva solicitud #{ticket_id}</b>\n"
             f"Alumno: {describir_alumno(alumno)}\n"
             f"Tema: {e(tema)}\n"
             f"Hora: {hora_colombia(creado)}\n\n"
             f"Mensaje: {e(texto)}\n\n"
             f"<i>Responde a este mensaje para contestarle.</i>")
    hay_admins = avisar_admins(db, ticket_id, aviso,
                               None if es_texto else mensaje_id, None if es_texto else chat_id)
    db.execute("UPDATE soporte_alumnos SET esperando = NULL WHERE chat_id = ?", (chat_id,))
    if hay_admins:
        enviar(chat_id, f"Listo, le avisé al equipo (solicitud <b>#{ticket_id}</b>).\n"
                        "Te van a responder <b>aquí mismo</b> en Telegram. Si quieres "
                        "agregar algo, solo escríbelo.")
    else:
        enviar(chat_id, f"Guardé tu solicitud <b>#{ticket_id}</b>. El equipo te "
                        "responderá aquí en Telegram apenas la vea.")
    return ticket_id


def contenido_mensaje(mensaje):
    """Texto del mensaje, o una descripción si es foto/archivo/audio."""
    if mensaje.get("text"):
        return mensaje["text"], True
    descripcion = mensaje.get("caption") or ""
    for tipo, nombre in (("photo", "Foto"), ("document", "Archivo"),
                         ("voice", "Audio"), ("video", "Video"),
                         ("sticker", "Sticker")):
        if tipo in mensaje:
            return f"[{nombre}] {descripcion}".strip(), False
    return "[mensaje no compatible]", False


# ------------------------------------------------------------ manejadores
def manejar_actualizacion(update):
    db = conectar()
    try:
        if "callback_query" in update:
            manejar_boton(db, update["callback_query"])
        elif "message" in update:
            manejar_mensaje(db, update["message"])
        db.commit()
    finally:
        db.close()


def manejar_boton(db, consulta):
    chat_id = consulta["message"]["chat"]["id"]
    dato = consulta.get("data", "")
    api("answerCallbackQuery", callback_query_id=consulta["id"])
    registrar_alumno(db, consulta["from"])

    if dato == "menu":
        db.execute("UPDATE soporte_alumnos SET esperando = NULL WHERE chat_id = ?", (chat_id,))
        enviar(chat_id, "¿En qué te puedo ayudar? Elige una opción", menu_principal())
    elif dato.startswith("cat:") and dato[4:] in CATEGORIAS:
        nombre, preguntas = CATEGORIAS[dato[4:]]
        filas = [[(PREGUNTAS[p]["titulo"], f"faq:{p}")] for p in preguntas]
        filas.append([("Mi duda no está aquí", "humano"), ("Menú", "menu")])
        enviar(chat_id, f"<b>{nombre}</b>\nElige tu pregunta:", filas)
    elif dato.startswith("faq:") and dato[4:] in PREGUNTAS:
        responder_pregunta(db, chat_id, dato[4:])
    elif dato == "ok":
        enviar(chat_id, "¡Genial! Si necesitas algo más, aquí estoy.",
               [[("Menú", "menu")]])
    elif dato == "humano":
        pedir_mensaje(db, chat_id, "Hablar con una persona",
                      "Escribe tu pregunta en un mensaje (puedes mandar captura) y "
                      "se la paso al equipo.")
    elif dato.startswith("cerrar:") and es_admin(db, chat_id):
        cerrar_ticket(db, int(dato[7:]), consulta["from"].get("first_name", "un admin"))


def responder_pregunta(db, chat_id, clave):
    pregunta = PREGUNTAS[clave]
    if "escalar" in pregunta:
        enviar(chat_id, texto_respuesta(clave))
        pedir_mensaje(db, chat_id, pregunta["titulo"], pregunta["escalar"])
    else:
        enviar(chat_id, texto_respuesta(clave),
               acciones_despues_de_respuesta(categoria_de(clave)))


def pedir_mensaje(db, chat_id, tema, instruccion):
    """Deja al alumno 'esperando': su próximo mensaje se convierte en solicitud."""
    abierto = ticket_abierto(db, chat_id)
    if abierto:
        enviar(chat_id, f"Ya tienes la solicitud <b>#{abierto['id']}</b> abierta con el "
                        "equipo. Escribe aquí lo que quieras agregar y se lo paso.")
        return
    db.execute("UPDATE soporte_alumnos SET esperando = ? WHERE chat_id = ?", (tema, chat_id))
    enviar(chat_id, instruccion, [[("Cancelar", "menu")]])


def manejar_mensaje(db, mensaje):
    chat = mensaje["chat"]
    if chat.get("type") != "private":
        return  # el bot solo atiende chats privados
    chat_id = chat["id"]
    texto, es_texto = contenido_mensaje(mensaje)

    # --- comandos
    if es_texto and texto.startswith("/"):
        comando, _, resto = texto.partition(" ")
        comando = comando.split("@")[0].lower()
        if comando == "/start":
            usuario_id = leer_codigo_inicio(resto.strip(), current_app.secret_key)
            registrar_alumno(db, mensaje["from"], usuario_id)
            alumno = datos_alumno(db, chat_id)
            nombre = (alumno["nombre_web"] or alumno["nombre_telegram"] or "").split(" ")[0]
            enviar(chat_id, f"¡Hola{', ' + e(nombre) if nombre else ''}! Soy el asistente "
                            "de <b>English Cundi</b>.\n¿En qué te puedo ayudar? Elige una "
                            "opción", menu_principal())
            return
        if comando == "/admin":
            registrar_admin(db, mensaje, resto.strip())
            return
        if comando == "/pendientes" and es_admin(db, chat_id):
            listar_pendientes(db, chat_id)
            return
        if comando == "/cerrar" and es_admin(db, chat_id) and resto.strip().isdigit():
            cerrar_ticket(db, int(resto.strip()), mensaje["from"].get("first_name", "un admin"))
            return
        if comando in ("/menu", "/ayuda", "/help"):
            registrar_alumno(db, mensaje["from"])
            enviar(chat_id, "¿En qué te puedo ayudar?", menu_principal())
            return

    # --- un admin contesta un aviso con "Responder"
    respondido = mensaje.get("reply_to_message")
    if respondido and es_admin(db, chat_id):
        fila = db.execute("SELECT ticket_id FROM soporte_avisos WHERE admin_chat_id = ? "
                          "AND message_id = ?", (chat_id, respondido["message_id"])).fetchone()
        if fila:
            responder_alumno(db, chat_id, fila["ticket_id"], mensaje, texto, es_texto)
            return

    # --- mensaje de un alumno
    registrar_alumno(db, mensaje["from"])
    alumno = datos_alumno(db, chat_id)
    abierto = ticket_abierto(db, chat_id)

    if abierto:  # ya hay conversación con el equipo: se reenvía
        db.execute("INSERT INTO soporte_mensajes (ticket_id, autor, texto) VALUES (?, 'alumno', ?)",
                   (abierto["id"], texto))
        avisar_admins(db, abierto["id"],
                      f"<b>#{abierto['id']}</b> · {describir_alumno(alumno)} escribió:\n\n"
                      f"{e(texto)}\n\n<i>Responde a este mensaje para contestarle.</i>",
                      None if es_texto else mensaje["message_id"],
                      None if es_texto else chat_id)
        enviar(chat_id, "Enviado al equipo.")
        return

    if alumno["esperando"]:  # el bot le pidió que escribiera su duda
        crear_ticket(db, chat_id, alumno["esperando"], texto, mensaje["message_id"], es_texto)
        return

    # --- texto libre: el bot intenta responder solo
    if es_texto:
        if any(palabra in normalizar(texto) for palabra in PIDE_PERSONA):
            crear_ticket(db, chat_id, "Pidió hablar con una persona", texto)
            return
        clave = adivinar_pregunta(texto)
        if clave and "escalar" not in PREGUNTAS[clave]:
            enviar(chat_id, "Creo que esto te puede servir\n\n" + texto_respuesta(clave),
                   acciones_despues_de_respuesta(categoria_de(clave)))
            return
        if clave:  # pregunta que siempre necesita al equipo (contraseña, borrar datos)
            crear_ticket(db, chat_id, PREGUNTAS[clave]["titulo"], texto)
            return
    # No la entendió: va directo al equipo.
    crear_ticket(db, chat_id, "Pregunta que el bot no supo responder", texto,
                 mensaje["message_id"], es_texto)


def responder_alumno(db, admin_id, ticket_id, mensaje, texto, es_texto):
    ticket = db.execute("SELECT * FROM soporte_tickets WHERE id = ?", (ticket_id,)).fetchone()
    if ticket is None:
        enviar(admin_id, "No encontré esa solicitud.")
        return
    if es_texto:
        ok = enviar(ticket["chat_id"], f"<b>Equipo English Cundi</b>:\n{e(texto)}")
    else:
        enviar(ticket["chat_id"], "<b>Equipo English Cundi</b> te envió:")
        ok = api("copyMessage", chat_id=ticket["chat_id"], from_chat_id=admin_id,
                 message_id=mensaje["message_id"])
    if not ok:
        enviar(admin_id, "No pude entregar la respuesta (¿el alumno bloqueó el bot?).")
        return
    db.execute("INSERT INTO soporte_mensajes (ticket_id, autor, texto) VALUES (?, 'equipo', ?)",
               (ticket_id, texto))
    if ticket["estado"] != "abierto":  # si escriben a una cerrada, se reabre
        db.execute("UPDATE soporte_tickets SET estado = 'abierto', cerrado_en = NULL "
                   "WHERE id = ?", (ticket_id,))
    confirmacion = enviar(admin_id, f"Respuesta enviada a la solicitud #{ticket_id}.",
                          [[("Marcar resuelta", f"cerrar:{ticket_id}")]])
    if confirmacion:  # así también se puede "Responder" a esta confirmación
        db.execute("INSERT OR IGNORE INTO soporte_avisos VALUES (?, ?, ?)",
                   (admin_id, confirmacion["message_id"], ticket_id))


def cerrar_ticket(db, ticket_id, quien):
    ticket = db.execute("SELECT * FROM soporte_tickets WHERE id = ?", (ticket_id,)).fetchone()
    if ticket is None or ticket["estado"] == "cerrado":
        return
    db.execute("UPDATE soporte_tickets SET estado = 'cerrado', cerrado_en = datetime('now') "
               "WHERE id = ?", (ticket_id,))
    enviar(ticket["chat_id"], f"Tu solicitud <b>#{ticket_id}</b> quedó resuelta. "
                              "Si necesitas algo más, aquí estoy.", [[("Menú", "menu")]])
    for admin in admins(db):
        enviar(admin, f"Solicitud #{ticket_id} marcada como resuelta por {e(quien)}.")


def registrar_admin(db, mensaje, codigo):
    chat_id = mensaje["chat"]["id"]
    esperado = cargar_config().get("codigo_admin", "")
    if not esperado or not secrets.compare_digest(codigo, esperado):
        enviar(chat_id, "Código incorrecto.")
        return
    db.execute("INSERT OR REPLACE INTO soporte_admins (chat_id, nombre) VALUES (?, ?)",
               (chat_id, mensaje["from"].get("first_name")))
    enviar(chat_id, "Quedaste registrado como <b>admin</b> de soporte.\n"
                    "• Te llegarán los avisos cuando un alumno necesite a una persona.\n"
                    "• Para contestar, <b>responde</b> al aviso (deslízalo o "
                    "mantén pulsado → Responder).\n"
                    "• /pendientes muestra las solicitudes abiertas.\n"
                    "• /cerrar 12 marca la #12 como resuelta.")


def listar_pendientes(db, chat_id):
    filas = db.execute(
        """SELECT t.id, t.tema, t.creado_en, a.nombre_telegram, u.nombre AS nombre_web
           FROM soporte_tickets t
           LEFT JOIN soporte_alumnos a ON a.chat_id = t.chat_id
           LEFT JOIN usuarios u ON u.id = t.usuario_id
           WHERE t.estado = 'abierto' ORDER BY t.id""").fetchall()
    if not filas:
        enviar(chat_id, "No hay solicitudes pendientes.")
        return
    lineas = [f"• <b>#{f['id']}</b> {e(f['nombre_web'] or f['nombre_telegram'])} — "
              f"{e(f['tema'])} ({hora_colombia(f['creado_en'])})" for f in filas]
    enviar(chat_id, "<b>Solicitudes abiertas</b>\n" + "\n".join(lineas))


# ----------------------------------------------------------------- webhook
@soporte.route("/telegram/webhook", methods=["POST"])
def webhook():
    secreto = cargar_config().get("secreto_webhook", "")
    enviado = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
    if not secreto or not secrets.compare_digest(enviado, secreto):
        return "", 403
    try:
        manejar_actualizacion(request.get_json(force=True, silent=True) or {})
    except Exception:
        # Se responde 200 igual: si no, Telegram reintenta el mismo mensaje sin fin.
        log.exception("Error atendiendo un mensaje de Telegram")
    return "ok"


def iniciar(app):
    app.register_blueprint(soporte)
    app.jinja_env.globals["enlace_ayuda"] = enlace_ayuda
