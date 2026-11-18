/* English Cundi - motor de las plantillas de conocimiento.
   Lee window.PLANTILLAS (cada nivel tiene su archivo en contenido/plantillas/).
   Cada tema tiene una infografía (explicación, tabla, claves y ejemplos con voz)
   y ejercicios interactivos: elegir (mc), completar (fill), arrastrar a los
   huecos (drag), emparejar (match) y ordenar (order).
   El tema se completa cuando todos sus ejercicios están bien; da XP la primera vez.
   Autor: David Estiven Sánchez Yomayuza */
(function () {
  'use strict';
  var D = window.PLANTILLAS;
  var raiz = document.getElementById('contenido');
  if (!D || !raiz) { return; }
  var Pr = window.Progreso;
  var tts = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  var hechos = {};          // temas completados (id -> fecha)

  /* ------------------------------------------------------------ utilidades */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === 'text') { el.textContent = v; }
      else if (k.slice(0, 2) === 'on') { el.addEventListener(k.slice(2), v); }
      else { el.setAttribute(k, v === true ? '' : v); }
    });
    for (var i = 2; i < arguments.length; i++) { agregar(el, arguments[i]); }
    return el;
  }
  function agregar(el, hijo) {
    if (hijo === null || hijo === undefined || hijo === false) { return; }
    if (Array.isArray(hijo)) { hijo.forEach(function (x) { agregar(el, x); }); return; }
    el.appendChild(typeof hijo === 'string' ? document.createTextNode(hijo) : hijo);
  }
  function limpiar() { while (raiz.firstChild) { raiz.removeChild(raiz.firstChild); } }
  function normal(s) {
    return String(s || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[.!?¿¡,]/g, '').replace(/\s+/g, ' ').trim();
  }
  function mezclar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function claveTema(t) { return D.id + ':' + t.id; }

  function hablar(texto) {
    if (!tts) { return; }
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = 'en-US'; u.rate = 0.9;
      var voz = window.speechSynthesis.getVoices().filter(function (v) { return /^en(-|_)/i.test(v.lang); })[0];
      if (voz) { u.voice = voz; }
      window.speechSynthesis.speak(u);
    } catch (e) { /* sin voz */ }
  }
  function botonVoz(texto) {
    if (!tts) { return null; }
    return h('button', { type: 'button', class: 'voz', 'aria-label': 'Escuchar: ' + texto, title: 'Escuchar', onclick: function () { hablar(texto); } },
      h('span', { 'aria-hidden': 'true', text: '🔊' }));
  }

  /* --------------------------------------------------------------- portada */
  function pantallaIndice() {
    limpiar();
    document.title = D.titulo + ' · English Cundi';
    var total = D.temas.length;
    var listos = D.temas.filter(function (t) { return hechos[claveTema(t)]; }).length;
    var pct = Math.round((listos / total) * 100);

    raiz.appendChild(h('section', { class: 'senal senal-ruta pl-intro entra' },
      h('div', {},
        h('p', { class: 'pl-etiqueta', text: 'Paso 2 · Plantillas de conocimiento' }),
        h('h1', { text: D.titulo }),
        h('p', { class: 'bajada', text: D.descripcion }),
        h('div', { class: 'pl-avance', role: 'img', 'aria-label': 'Avance: ' + listos + ' de ' + total + ' temas' },
          h('span', { class: 'pl-avance-barra' }, h('span', { style: 'width:' + pct + '%' })),
          h('span', { class: 'pl-avance-txt', text: listos + ' de ' + total + ' temas completados' }))),
      h('img', { class: 'pl-intro-img flota', src: '/static/img/ilustraciones/trofeo.svg', alt: '', width: 120, height: 120 })));

    raiz.appendChild(h('section', { class: 'senal senal-blanca hoja pl-como entra' },
      h('h2', { text: 'Cómo funciona' }),
      h('ol', { class: 'pl-pasos' },
        h('li', {}, h('strong', { text: 'Lee la infografía' }), ' de cada tema. Toca 🔊 para oír la pronunciación.'),
        h('li', {}, h('strong', { text: 'Resuelve los ejercicios' }), ': arrastrar, emparejar, completar y ordenar. Puedes intentar las veces que quieras.'),
        h('li', {}, h('strong', { text: 'Completa el tema' }), ' y gana XP. Cuando termines todos, haz la prueba de conocimiento.'))));

    var grilla = h('section', { class: 'pl-grilla', 'aria-label': 'Temas' });
    D.temas.forEach(function (t, i) {
      var listo = !!hechos[claveTema(t)];
      grilla.appendChild(h('a', { class: 'pl-tarjeta entra' + (listo ? ' listo' : ''), href: '#' + t.id, style: 'animation-delay:' + (0.05 * i) + 's' },
        h('img', { src: t.img, alt: '', width: 72, height: 72, loading: 'lazy' }),
        h('span', { class: 'pl-num', text: 'Tema ' + (i + 1) }),
        h('strong', { text: t.titulo }),
        h('span', { class: 'pl-sub', text: t.subtitulo }),
        h('span', { class: 'pl-estado', text: listo ? '✓ Completado' : t.ejercicios.length + ' ejercicios' })));
    });
    raiz.appendChild(grilla);

    if (listos === total) {
      raiz.appendChild(h('section', { class: 'senal senal-aviso pl-final entra' },
        h('div', {}, h('h2', { text: '¡Terminaste todas las plantillas!' }),
          h('p', { text: 'Ya estás listo para la prueba de conocimiento ' + D.nivel + '.' })),
        h('a', { class: 'boton boton-oscuro', href: '/contenido/pruebas/' + D.id + '.html' }, 'Ir a la prueba')));
    }
    window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ tema */
  function pantallaTema(t) {
    limpiar();
    var i = D.temas.indexOf(t);
    document.title = t.titulo + ' · ' + D.titulo;

    raiz.appendChild(h('nav', { class: 'pl-migas', 'aria-label': 'Ubicación' },
      h('a', { href: '#' }, '← Todos los temas'), h('span', { text: 'Tema ' + (i + 1) + ' de ' + D.temas.length })));

    /* infografía */
    var info = h('article', { class: 'senal senal-blanca pl-info entra' },
      h('header', { class: 'pl-info-cab' },
        h('img', { class: 'flota', src: t.img, alt: '', width: 110, height: 110 }),
        h('div', {},
          h('p', { class: 'pl-etiqueta', text: D.nivel + ' · Tema ' + (i + 1) }),
          h('h1', { text: t.titulo }),
          h('p', { class: 'pl-sub', text: t.subtitulo }))),
      h('p', { class: 'pl-idea', text: t.idea }));

    if (t.tabla) {
      info.appendChild(h('div', { class: 'pl-tabla-caja' },
        h('table', { class: 'pl-tabla' },
          h('thead', {}, h('tr', {}, t.tabla.cab.map(function (c) { return h('th', { scope: 'col', text: c }); }))),
          h('tbody', {}, t.tabla.filas.map(function (f) { return h('tr', {}, f.map(function (c) { return h('td', { text: c }); })); })))));
    }
    if (t.claves && t.claves.length) {
      info.appendChild(h('ul', { class: 'pl-claves' }, t.claves.map(function (c) { return h('li', { text: c }); })));
    }
    if (t.ejemplos && t.ejemplos.length) {
      info.appendChild(h('h2', { class: 'pl-h2', text: 'Ejemplos' }));
      info.appendChild(h('ul', { class: 'pl-ejemplos' }, t.ejemplos.map(function (e) {
        return h('li', {}, botonVoz(e[0]), h('span', { class: 'en', text: e[0] }), h('span', { class: 'es', text: e[1] }));
      })));
    }
    raiz.appendChild(info);

    /* ejercicios */
    var estado = t.ejercicios.map(function () { return { bien: false, intentos: 0 }; });
    var hojaEj = h('section', { class: 'senal senal-blanca hoja pl-ejercicios entra', 'aria-labelledby': 'pl-ej-t' },
      h('h2', { id: 'pl-ej-t', text: 'Practica lo que aprendiste' }),
      h('p', { class: 'pl-cuenta', id: 'pl-cuenta' }));
    raiz.appendChild(hojaEj);

    function actualizarCuenta() {
      var n = estado.filter(function (x) { return x.bien; }).length;
      document.getElementById('pl-cuenta').textContent = (hechos[claveTema(t)] ? '✓ Ya completaste este tema. Puedes repasarlo: ' : '') +
        n + ' de ' + estado.length + ' ejercicios correctos';
      if (n === estado.length) { completarTema(t); }
    }

    t.ejercicios.forEach(function (ej, k) {
      hojaEj.appendChild(crearEjercicio(ej, k, t, function (ok) {
        var e = estado[k];
        e.intentos++;
        if (Pr && Pr.cargada && e.intentos === 1) { Pr.respuesta({ modo: 'plantillas', tema: t.tema || t.titulo, ok: ok, xp: 3 }); }
        if (ok && !e.bien) { e.bien = true; actualizarCuenta(); }
      }));
    });
    actualizarCuenta();

    /* navegación */
    var ant = D.temas[i - 1], sig = D.temas[i + 1];
    raiz.appendChild(h('nav', { class: 'pl-nav', 'aria-label': 'Temas vecinos' },
      ant ? h('a', { class: 'boton boton-fantasma', href: '#' + ant.id }, '← ' + ant.titulo) : h('span'),
      sig ? h('a', { class: 'boton boton-principal', href: '#' + sig.id }, sig.titulo + ' →')
          : h('a', { class: 'boton boton-amarillo', href: '#' }, 'Ver todos los temas')));
    window.scrollTo(0, 0);
  }

  function completarTema(t) {
    var k = claveTema(t);
    var cuenta = document.getElementById('pl-cuenta');
    if (cuenta) { cuenta.classList.add('pl-completo'); cuenta.textContent = '¡Tema completado! ✓'; }
    if (hechos[k]) { return; }
    hechos[k] = new Date().toLocaleDateString('en-CA');
    guardarLocal();
    if (window.Fiesta) { window.Fiesta.confeti(); }
    if (Pr && Pr.cargada) {
      Pr.datos.plantillas[k] = hechos[k];
      Pr.sumarXP(15, 'plantilla');
      Pr.aviso('Tema completado: ' + t.titulo + ' (+15 XP)', 'mision');
      Pr.revisarLogros();
      Pr.guardarYa();
    }
  }

  /* ------------------------------------------------------------ ejercicios */
  var TIPOS = { mc: 'Elige la respuesta', fill: 'Escribe la palabra', drag: 'Arrastra las palabras', match: 'Empareja', order: 'Ordena la oración' };

  function crearEjercicio(ej, k, t, alResponder) {
    var caja = h('div', { class: 'pl-ej', 'data-tipo': ej.t });
    caja.appendChild(h('p', { class: 'pl-ej-tipo', text: (k + 1) + '. ' + TIPOS[ej.t] }));
    if (ej.q && ej.t !== 'drag') { caja.appendChild(h('p', { class: 'pl-ej-q', text: ej.q })); }
    var fb = h('p', { class: 'pl-fb', role: 'status', 'aria-live': 'polite' });

    function resultado(ok, texto) {
      caja.classList.remove('bien', 'mal');
      void caja.offsetWidth;                       // reinicia la animación
      caja.classList.add(ok ? 'bien' : 'mal');
      fb.textContent = ok ? '✓ ¡Correcto! ' + (ej.e || '') : '✗ ' + (texto || 'Todavía no. Inténtalo otra vez.') + (ej.pista ? ' Pista: ' + ej.pista : '');
      alResponder(ok);
    }

    if (ej.t === 'mc') {
      var ops = h('div', { class: 'pl-opciones' });
      ej.o.forEach(function (o, idx) {
        ops.appendChild(h('button', { type: 'button', class: 'pl-op', onclick: function (ev) {
          var ok = idx === ej.a;
          ev.currentTarget.classList.add(ok ? 'op-bien' : 'op-mal');
          if (ok) { Array.prototype.forEach.call(ops.children, function (b) { b.disabled = true; }); }
          resultado(ok);
        } }, o));
      });
      caja.appendChild(ops);
    }

    else if (ej.t === 'fill') {
      var inp = h('input', { type: 'text', class: 'pl-input', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'Tu respuesta' });
      var comprobar = function () {
        var ok = ej.a.some(function (r) { return normal(r) === normal(inp.value); });
        if (!inp.value.trim()) { fb.textContent = 'Escribe tu respuesta.'; return; }
        if (ok) { inp.disabled = true; btn.disabled = true; }
        resultado(ok);
      };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { comprobar(); } });
      var btn = h('button', { type: 'button', class: 'boton boton-principal boton-corto', onclick: comprobar }, 'Comprobar');
      caja.appendChild(h('div', { class: 'pl-fila' }, inp, btn));
    }

    else if (ej.t === 'drag') {
      /* Oración con huecos ___ y un banco de palabras.
         Se puede arrastrar (computador) o tocar la palabra y luego el hueco (celular). */
      var partes = ej.q.split('___');
      var huecos = [], elegida = null;
      var frase = h('p', { class: 'pl-frase' });
      partes.forEach(function (p, idx) {
        frase.appendChild(document.createTextNode(p));
        if (idx < partes.length - 1) {
          var hueco = h('button', { type: 'button', class: 'pl-hueco', 'aria-label': 'Hueco ' + (idx + 1) + ', vacío' });
          hueco.dataset.valor = '';
          hueco.addEventListener('click', function () {
            if (elegida) { poner(hueco, elegida); }
            else if (hueco.dataset.valor) { quitar(hueco); }
          });
          hueco.addEventListener('dragover', function (e) { e.preventDefault(); hueco.classList.add('sobre'); });
          hueco.addEventListener('dragleave', function () { hueco.classList.remove('sobre'); });
          hueco.addEventListener('drop', function (e) {
            e.preventDefault(); hueco.classList.remove('sobre');
            var id = e.dataTransfer.getData('text/plain');
            var ficha = banco.querySelector('[data-id="' + id + '"]');
            if (ficha) { poner(hueco, ficha); }
          });
          huecos.push(hueco);
          frase.appendChild(hueco);
        }
      });
      var banco = h('div', { class: 'pl-banco', 'aria-label': 'Palabras' });
      mezclar(ej.banco).forEach(function (palabra, idx) {
        var f = h('button', { type: 'button', class: 'pl-ficha', draggable: 'true', 'data-id': 'f' + k + '-' + idx }, palabra);
        f.addEventListener('dragstart', function (e) { e.dataTransfer.setData('text/plain', f.dataset.id); });
        f.addEventListener('click', function () {
          if (f.classList.contains('usada')) { return; }
          if (elegida) { elegida.classList.remove('elegida'); }
          elegida = (elegida === f) ? null : f;
          if (elegida) { elegida.classList.add('elegida'); }
        });
        banco.appendChild(f);
      });
      function poner(hueco, ficha) {
        if (ficha.classList.contains('usada')) { return; }
        if (hueco.dataset.valor) { quitar(hueco); }
        hueco.dataset.valor = ficha.textContent; hueco.dataset.ficha = ficha.dataset.id;
        hueco.textContent = ficha.textContent; hueco.classList.add('lleno');
        hueco.setAttribute('aria-label', 'Hueco con ' + ficha.textContent + '. Toca para quitar.');
        ficha.classList.add('usada'); ficha.classList.remove('elegida'); ficha.disabled = true;
        elegida = null;
      }
      function quitar(hueco) {
        var f = banco.querySelector('[data-id="' + hueco.dataset.ficha + '"]');
        if (f) { f.classList.remove('usada'); f.disabled = false; }
        hueco.dataset.valor = ''; hueco.textContent = ''; hueco.classList.remove('lleno');
        hueco.setAttribute('aria-label', 'Hueco vacío');
      }
      caja.appendChild(h('p', { class: 'pl-ej-q', text: ej.instr || 'Completa la oración con las palabras del banco.' }));
      caja.appendChild(frase);
      caja.appendChild(banco);
      var btnD = h('button', { type: 'button', class: 'boton boton-principal boton-corto', onclick: function () {
        if (huecos.some(function (x) { return !x.dataset.valor; })) { fb.textContent = 'Llena todos los huecos.'; return; }
        var ok = huecos.every(function (x, idx) { return normal(x.dataset.valor) === normal(ej.a[idx]); });
        huecos.forEach(function (x, idx) { x.classList.toggle('hueco-mal', normal(x.dataset.valor) !== normal(ej.a[idx])); });
        if (ok) { btnD.disabled = true; huecos.forEach(function (x) { x.disabled = true; }); }
        resultado(ok, 'Revisa los huecos marcados en rojo.');
      } }, 'Comprobar');
      caja.appendChild(h('div', { class: 'pl-fila' }, btnD));
    }

    else if (ej.t === 'match') {
      /* Toca una palabra en inglés y luego su significado. */
      var izq = h('div', { class: 'pl-col' }), der = h('div', { class: 'pl-col' });
      var sel = null, unidos = 0;
      var colores = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
      ej.pares.forEach(function (par, idx) {
        izq.appendChild(h('button', { type: 'button', class: 'pl-par', 'data-i': idx, onclick: function (e) {
          var b = e.currentTarget;
          if (b.classList.contains('unido')) { return; }
          if (sel) { sel.classList.remove('elegida'); }
          sel = b; b.classList.add('elegida');
        } }, par[0]));
      });
      mezclar(ej.pares.map(function (p, idx) { return { txt: p[1], i: idx }; })).forEach(function (o) {
        der.appendChild(h('button', { type: 'button', class: 'pl-par', 'data-i': o.i, onclick: function (e) {
          var b = e.currentTarget;
          if (!sel || b.classList.contains('unido')) { return; }
          if (sel.dataset.i === b.dataset.i) {
            var c = colores[unidos % colores.length];
            sel.classList.remove('elegida'); sel.classList.add('unido', c); b.classList.add('unido', c);
            sel.disabled = true; b.disabled = true; sel = null; unidos++;
            if (unidos === ej.pares.length) { resultado(true); }
          } else {
            b.classList.add('op-mal'); window.setTimeout(function () { b.classList.remove('op-mal'); }, 500);
            resultado(false, 'Esa pareja no va. Prueba con otra.');
          }
        } }, o.txt));
      });
      caja.appendChild(h('p', { class: 'pl-ayuda', text: 'Toca una palabra de la izquierda y luego su pareja de la derecha.' }));
      caja.appendChild(h('div', { class: 'pl-match' }, izq, der));
    }

    else if (ej.t === 'order') {
      var armado = [];
      var linea = h('p', { class: 'pl-linea', 'aria-live': 'polite' });
      var fichas = h('div', { class: 'pl-banco' });
      function pintar() {
        linea.textContent = armado.length ? armado.map(function (x) { return x.textContent; }).join(' ') : 'Toca las palabras en orden…';
        linea.classList.toggle('vacia', !armado.length);
      }
      mezclar(ej.fichas).forEach(function (w) {
        var f = h('button', { type: 'button', class: 'pl-ficha' }, w);
        f.addEventListener('click', function () { armado.push(f); f.disabled = true; f.classList.add('usada'); pintar(); });
        fichas.appendChild(f);
      });
      var borrar = h('button', { type: 'button', class: 'boton boton-claro boton-corto', onclick: function () {
        armado.forEach(function (f) { f.disabled = false; f.classList.remove('usada'); }); armado = []; pintar();
      } }, 'Borrar');
      var btnO = h('button', { type: 'button', class: 'boton boton-principal boton-corto', onclick: function () {
        if (armado.length < ej.fichas.length) { fb.textContent = 'Usa todas las palabras.'; return; }
        var ok = normal(armado.map(function (x) { return x.textContent; }).join(' ')) === normal(ej.a);
        if (ok) { btnO.disabled = true; borrar.disabled = true; }
        resultado(ok, 'El orden no es correcto. Toca Borrar y vuelve a intentarlo.');
      } }, 'Comprobar');
      pintar();
      caja.appendChild(linea); caja.appendChild(fichas);
      caja.appendChild(h('div', { class: 'pl-fila' }, btnO, borrar));
    }

    caja.appendChild(fb);
    return caja;
  }

  /* --------------------------------------------------------- guardar avance */
  var CLAVE_LOCAL = 'ec-plantillas';
  function cargarLocal() {
    try { var x = JSON.parse(window.localStorage.getItem(CLAVE_LOCAL)); if (x && typeof x === 'object') { hechos = x; } } catch (e) { /* nada */ }
  }
  function guardarLocal() {
    try { window.localStorage.setItem(CLAVE_LOCAL, JSON.stringify(hechos)); } catch (e) { /* sin almacenamiento */ }
  }

  /* ---------------------------------------------------------------- rutas */
  function mostrar() {
    var id = decodeURIComponent(window.location.hash.slice(1));
    var t = D.temas.filter(function (x) { return x.id === id; })[0];
    if (t) { pantallaTema(t); } else { pantallaIndice(); }
  }
  window.addEventListener('hashchange', mostrar);

  cargarLocal();
  if (Pr) {
    Pr.cargar().then(function () {
      // Une lo guardado en el servidor con lo de este navegador.
      Object.keys(Pr.datos.plantillas || {}).forEach(function (k) { hechos[k] = Pr.datos.plantillas[k]; });
      guardarLocal();
      mostrar();
    });
  } else { mostrar(); }
})();
