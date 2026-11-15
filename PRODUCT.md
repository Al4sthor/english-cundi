# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Estudiantes de la Universidad de Cundinamarca, Extensión Chía (17 a 25 años), desde celular o portátil, en sesiones cortas de estudio. Quieren saber en qué nivel de inglés están (A1 o A2) y practicar.

## Product Purpose
Medir y practicar inglés nivel A1 y A2. Ruta de tres pasos: diagnóstico, plantillas de conocimiento (infografías y ejercicios) y prueba de conocimiento con calificación. Soporte por Telegram desde el botón "¿Necesitas ayuda?".

## Positioning
Plataforma propia de la universidad hecha por estudiantes del programa de Ingeniería de Sistemas y Computación, con cuenta propia y base de datos propia (sin servicios de terceros).

## Capabilities and Constraints
- Flask + Jinja2, SQLite. Publicado en PythonAnywhere. Estilos en `pagina-web/static/css/estilo.css`.
- No cambiar los `name` de los formularios (`nombre`, `correo`, `password`, `confirmar`, `acepta`, `siguiente`), el input oculto `csrf`, los `url_for(...)` ni la lógica de `{% if ayuda %}` en `base.html`.
- Las tarjetas de módulos pasan solas de "Próximamente" a "Empezar" cuando existe el archivo en `contenido/`.
- Tratamiento de datos bajo la Ley 1581 de 2012.
- Interfaz en español. Sin fuentes ni imágenes de terceros que no se puedan servir.

## Brand Commitments
Nombre: English Cundi. Equipo: David Estiven Sánchez Yomayuza, Kevin Contreras, Wilder Ortiz. El usuario pidió un giro total visual (la paleta verde y dorado y el logo actual no son obligatorios).

## Evidence on Hand
Sin fotos, testimonios ni cifras reales. No inventar estadísticas ni opiniones de estudiantes.

## Product Principles
- El siguiente paso siempre es obvio: diagnóstico, plantillas, prueba.
- Funciona bien en un celular con datos limitados.
- Lenguaje sencillo para quien está empezando en inglés.

## Accessibility & Inclusion
Contraste suficiente, foco visible, objetivos táctiles de 44px, respeta reduced-motion.

<!-- Inferido del código y de las respuestas del usuario (público confirmado, giro total, todas las pantallas). -->
