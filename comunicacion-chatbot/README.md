# La comunicación: chatbot de Telegram (comunicacion-chatbot)

En todas las páginas hay un botón **¿Necesitas ayuda?** que abre el bot **@EnglishCundiAyudaBot**.

| Archivo | Qué es |
|---|---|
| `soporte_telegram.py` | El bot: menú, respuestas automáticas (`PREGUNTAS`), avisos al equipo y la ruta `/telegram/webhook` |
| `configurar_telegram.py` | Conecta el bot: pide el token, guarda `telegram.json` y registra el webhook |
| `telegram.json` | Token y secretos del bot. **Privado**: no se sube a GitHub |

## Qué hace

1. Muestra 3 opciones: **Mi cuenta**, **La plataforma** y **Preguntas generales**, cada una con preguntas frecuentes que responde solo.
2. Si el alumno pulsa **Hablar con una persona**, o escribe algo que el bot no entiende, crea una solicitud y **avisa a los admins** por Telegram.
3. El admin **responde al aviso** (mantener pulsado, *Responder*) y el bot le reenvía la respuesta al alumno.
4. Comandos del admin: `/pendientes` y `/cerrar N`, o el botón **Marcar resuelta**.

## Cómo se comunica

```
Botón de la página ──> t.me/EnglishCundiAyudaBot?start=<id firmado>
Telegram ──POST──> https://englishcundi.pythonanywhere.com/telegram/webhook   (con secreto)
Bot ──sendMessage──> api.telegram.org ──> alumno / admins
```

- **Webhook:** Telegram llama a la página; no hace falta un programa encendido todo el tiempo, por eso funciona en la cuenta gratuita.
- **Enlace firmado (HMAC):** si el alumno inició sesión, el bot sabe quién es y nadie puede hacerse pasar por otro.
- **Sin librerías extra:** usa `urllib` de Python.

## Conectar o cambiar el bot

En la consola Bash de PythonAnywhere:

```
cd ~/english-cundi/comunicacion-chatbot
python3 configurar_telegram.py
```

Pega el token de @BotFather (no se ve al pegarlo) y pulsa Enter en la dirección. Luego pulsa **Reload** en la pestaña Web.

**Para cambiar las preguntas y respuestas**, edita `PREGUNTAS` y `CATEGORIAS` en `soporte_telegram.py`.
