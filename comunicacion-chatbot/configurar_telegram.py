"""Conecta English Cundi con tu bot de Telegram.

USO
  En el servidor (PythonAnywhere -> Consoles -> Bash):
      cd ~/english-cundi/comunicacion-chatbot
      python3 configurar_telegram.py
  Te pide el token que te dio @BotFather, guarda comunicacion-chatbot/telegram.json y le dice
  a Telegram a qué dirección mandar los mensajes (webhook).

  En tu PC, para probar el bot sin subir nada:
      py configurar_telegram.py --local
  (Antes, en el PC: py configurar_telegram.py y como dirección escribe
  http://127.0.0.1:5000.) El bot funciona mientras la terminal esté abierta
  (Ctrl+C para parar). OJO: mientras se prueba en el PC, el bot deja de
  atender desde el servidor; después hay que volver a correr
  configurar_telegram.py en PythonAnywhere (Enter, Enter).

Autor: David Estiven Sánchez Yomayuza
"""
__author__ = "David Estiven Sánchez Yomayuza"

import getpass
import json
import os
import secrets
import sys
import urllib.error
import urllib.request

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "telegram.json")  # privado, no va a GitHub
SITIO_POR_DEFECTO = "https://englishcundi.pythonanywhere.com"


def cargar():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as archivo:
            return json.load(archivo)
    except (FileNotFoundError, ValueError):
        return {}


def guardar(config):
    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
    with open(CONFIG_PATH, "w", encoding="utf-8") as archivo:
        json.dump(config, archivo, indent=2, ensure_ascii=False)
    try:
        os.chmod(CONFIG_PATH, 0o600)  # solo tu usuario puede leerlo (Linux)
    except OSError:
        pass


def telegram(token, metodo, **datos):
    pedido = urllib.request.Request(
        f"https://api.telegram.org/bot{token}/{metodo}",
        data=json.dumps(datos).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(pedido, timeout=30) as respuesta:
            resultado = json.load(respuesta)
    except urllib.error.HTTPError as error:
        try:
            resultado = json.load(error)
        except ValueError:
            resultado = {"ok": False, "description": f"HTTP {error.code}"}
    if not resultado.get("ok"):
        raise RuntimeError(resultado.get("description", "error desconocido"))
    return resultado["result"]


def conectar_webhook(config):
    url = config["url_sitio"].rstrip("/") + "/telegram/webhook"
    telegram(config["token"], "setWebhook", url=url,
             secret_token=config["secreto_webhook"],
             allowed_updates=["message", "callback_query"],
             drop_pending_updates=True)
    return url


def configurar():
    config = cargar()
    print("=== English Cundi · conectar bot de Telegram ===\n")
    if config.get("token"):
        print(f"Ya hay un bot configurado: @{config.get('usuario_bot')}")
        print("Pulsa Enter para dejarlo, o pega un token nuevo.")
    token = getpass.getpass("Token de @BotFather (no se ve al pegarlo): ").strip()
    token = token or config.get("token", "")
    if not token:
        sys.exit("Falta el token. Créalo en Telegram con @BotFather -> /newbot.")

    try:
        bot = telegram(token, "getMe")
    except RuntimeError as error:
        sys.exit(f"Telegram rechazó el token: {error}")

    sitio = input(f"Dirección de la página [{config.get('url_sitio', SITIO_POR_DEFECTO)}]: ").strip()
    config.update({
        "token": token,
        "usuario_bot": bot["username"],
        "url_sitio": (sitio or config.get("url_sitio", SITIO_POR_DEFECTO)).rstrip("/"),
        "secreto_webhook": config.get("secreto_webhook") or secrets.token_urlsafe(32),
        "codigo_admin": config.get("codigo_admin") or secrets.token_hex(4),
    })
    guardar(config)

    if not config["url_sitio"].startswith("https://"):
        print("\n⚠ La dirección no es https://, así que no se conecta el webhook.")
        print("  Para probar en tu PC usa:  py configurar_telegram.py --local")
    else:
        try:
            url = conectar_webhook(config)
        except RuntimeError as error:
            sys.exit(f"No se pudo conectar el webhook: {error}")
        print(f"\n✔ Webhook conectado: {url}")

    telegram(token, "setMyCommands", commands=[
        {"command": "start", "description": "Abrir el menú de ayuda"},
        {"command": "menu", "description": "Volver al menú"},
    ])
    print(f"✔ Bot: @{bot['username']}  (https://t.me/{bot['username']})")
    print("\nSIGUIENTES PASOS")
    print("1. Pestaña Web -> Reload (para que aparezca el botón de ayuda).")
    print(f"2. En Telegram, abre @{bot['username']} y escríbele:")
    print(f"       /admin {config['codigo_admin']}")
    print("   Así te llegan los avisos cuando un alumno necesite a una persona.")
    print("   Kevin y Wilder pueden hacer lo mismo para recibirlos también.")
    print("3. El código de admin es privado: compártelo solo con el equipo.")


def modo_local():
    """Atiende el bot desde el PC preguntándole a Telegram cada pocos segundos."""
    config = cargar()
    if not config.get("token"):
        sys.exit("Primero ejecuta:  py configurar_telegram.py")
    sys.path.insert(0, os.path.join(os.path.dirname(BASE_DIR), "pagina-web"))
    from app import app  # noqa: E402  (usa la base de datos local de prueba)
    import soporte_telegram

    token = config["token"]
    telegram(token, "deleteWebhook")
    print(f"Bot @{config['usuario_bot']} atendiendo desde este PC. Ctrl+C para parar.")
    siguiente = 0
    try:
        while True:
            try:
                updates = telegram(token, "getUpdates", offset=siguiente, timeout=20,
                                   allowed_updates=["message", "callback_query"])
            except (RuntimeError, OSError) as error:
                print("Sin conexión con Telegram, reintentando…", type(error).__name__)
                continue
            for update in updates:
                siguiente = update["update_id"] + 1
                with app.test_request_context():
                    soporte_telegram.manejar_actualizacion(update)
                print("· mensaje atendido")
    except KeyboardInterrupt:
        print("\nBot detenido en este PC.")
        print("Para que vuelva a atender desde la página publicada, en PythonAnywhere")
        print("ejecuta  python3 configurar_telegram.py  y pulsa Enter dos veces.")


if __name__ == "__main__":
    modo_local() if "--local" in sys.argv else configurar()
