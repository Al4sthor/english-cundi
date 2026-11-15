/* English Cundi - zona de práctica.
   Modos: Survival, Word Battle, Memory, Boss Challenge, Smart Flashcards,
   Reverse Translation, Sentence Builder, Listening, Speaking, Conversaciones,
   Cuaderno de errores, Logros y Estadísticas. Los datos viven en
   contenido/practica/a1.json y a2.json; el avance lo guarda progreso.js. */
(function () {
  'use strict';

  var P = window.Progreso;
  var raiz = document.getElementById('app');
  if (!raiz || !P) { return; }

  var S = { nivel: 'A1', cache: {}, D: null, limpiar: null };
  var tts = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);

  /* ------------------------------------------------------------- utilidades */
  function h(tag, props) {
    var el = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v === null || v === undefined || v === false) { return; }
      if (k === 'class') { el.className = v; }
      else if (k === 'text') { el.textContent = v; }
      else if (k.indexOf('on') === 0) { el.addEventListener(k.slice(2), v); }
      else { el.setAttribute(k, v === true ? '' : v); }
    });
    for (var i = 2; i < arguments.length; i++) { agregar(el, arguments[i]); }
    return el;
  }
  function agregar(el, kid) {
    if (kid === null || kid === undefined || kid === false) { return; }
    if (Array.isArray(kid)) { kid.forEach(function (k) { agregar(el, k); }); return; }
    el.appendChild(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }

  var RUTA = {
    vida: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    rayo: 'M13 3L5 14h6l-1 7 8-11h-6z',
    memoria: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    jefe: 'M4 18h16M5 18l-1-9 5 4 3-7 3 7 5-4-1 9',
    tarjetas: 'M6 8h12v12H6zM9 4h12v12',
    cambio: 'M4 8h13l-3-3M20 16H7l3 3',
    bloques: 'M4 4h7v7H4zM13 13h7v7h-7zM13 4h7v4h-7zM4 15h7v5H4z',
    audifonos: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v5H4zM17 14h3v5h-3z',
    mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4',
    charla: 'M4 5h16v11H9l-5 4z',
    libro: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
    copa: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8',
    grafico: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
    llama: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z',
    ok: 'M5 13l4 4L19 7',
    mal: 'M6 6l12 12M18 6L6 18',
    play: 'M8 5v14l11-7z',
    atras: 'M19 12H5M11 6l-6 6 6 6',
    ir: 'M5 12h14M13 6l6 6-6 6',
    estrella: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'
  };
  function icono(nombre, tam) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam || 24); s.setAttribute('height', tam || 24);
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.4');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', RUTA[nombre]); s.appendChild(p);
    return s;
  }

  function barajar(a) {
    var r = a.slice(), i, j, t;
    for (i = r.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = r[i]; r[i] = r[j]; r[j] = t; }
    return r;
  }
  function elegir(a, n) { return barajar(a).slice(0, n); }

  /* Compara respuestas escritas sin fijarse en mayúsculas, tildes, puntuación ni contracciones. */
  function norm(s) {
    var t = String(s === null || s === undefined ? '' : s).toLowerCase();
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* navegador antiguo */ }
    t = t.replace(/[‘’]/g, "'")
      .replace(/\bcan't\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/\bi'm\b/g, 'i am')
      .replace(/\b(he|she|it|that|there|what|who|where)'s\b/g, '$1 is')
      .replace(/\b(you|we|they)'re\b/g, '$1 are').replace(/n't\b/g, ' not')
      .replace(/'ll\b/g, ' will').replace(/'ve\b/g, ' have').replace(/'d\b/g, ' would')
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return t;
  }
  function distancia(a, b) {
    var m = a.length, n = b.length, i, j, d = [], c;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) { d[0][j] = j; }
    for (i = 1; i <= m; i++) {
      for (j = 1; j <= n; j++) {
        c = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      }
    }
    return d[m][n];
  }
  /* 'si' exacto, 'casi' con un error de ortografía en frases largas, 'no' en otro caso. */
  function comparar(resp, variantes) {
    var r = norm(resp), i, v;
    if (!r) { return 'no'; }
    for (i = 0; i < variantes.length; i++) { if (norm(variantes[i]) === r) { return 'si'; } }
    for (i = 0; i < variantes.length; i++) {
      v = norm(variantes[i]);
      if (v.length >= 12 && distancia(r, v) <= 1) { return 'casi'; }
    }
    return 'no';
  }
  /* Qué porción de las palabras del objetivo aparece en lo que dijo o escribió. */
  function coincidencia(dicho, objetivo) {
    var o = norm(objetivo).split(' '), d = norm(dicho).split(' '), usadas = {}, ok = 0, marcas = [];
    o.forEach(function (pal) {
      var idx = -1, k;
      for (k = 0; k < d.length; k++) { if (d[k] === pal && !usadas[k]) { idx = k; break; } }
      if (idx >= 0) { usadas[idx] = true; ok++; marcas.push({ t: pal, ok: true }); } else { marcas.push({ t: pal, ok: false }); }
    });
    return { pct: o.length ? Math.round((ok / o.length) * 100) : 0, marcas: marcas };
  }

  /* ------------------------------------------------------------------ voz */
  function vozEn() {
    if (!tts) { return null; }
    var vs = window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    var us = vs.filter(function (v) { return /en[-_]US/i.test(v.lang); });
    return us[0] || vs[0] || null;
  }
  function decir(texto, lento, alTerminar) {
    if (!tts) { if (alTerminar) { alTerminar(); } return; }
    window.speechSynthesis.cancel();
    var u = new window.SpeechSynthesisUtterance(texto);
    u.lang = 'en-US'; u.rate = lento ? 0.6 : 0.85;
    var v = vozEn(); if (v) { u.voice = v; u.lang = v.lang; }
    if (alTerminar) { u.onend = alTerminar; u.onerror = alTerminar; }
    window.speechSynthesis.speak(u);
  }
  function botonVoz(texto, etiqueta) {
    if (!tts) { return null; }
    return h('button', { type: 'button', class: 'boton boton-audio', 'aria-label': etiqueta || 'Escuchar en inglés', onclick: function () { decir(texto, false); } }, icono('play', 20), ' Escuchar');
  }

  /* ----------------------------------------------------------------- datos */
  function cargarDatos(nivel) {
    if (S.cache[nivel]) { return Promise.resolve(S.cache[nivel]); }
    return window.fetch('/contenido/practica/' + nivel.toLowerCase() + '.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) { throw new Error('http ' + r.status); } return r.json(); })
      .then(function (d) { S.cache[nivel] = d; return d; });
  }

  /* Copia de una pregunta con las opciones mezcladas. */
  function preparar(p) {
    var c = JSON.parse(JSON.stringify(p));
    if (c.t === 'mc') {
      var correcta = c.o[c.a], mezcladas = barajar(c.o);
      c.o = mezcladas; c.a = mezcladas.indexOf(correcta);
    }
    return c;
  }
  function textoCorrecto(p) { return p.t === 'mc' ? p.o[p.a] : p.a[0]; }

  /* Dibuja una pregunta. cfg: { sinFb, alResponder(ok, tu), siguiente, siguienteTxt } */
  function pregunta(cont, p, cfg) {
    cont.textContent = '';
    var respondida = false;
    if (p.texto) { cont.appendChild(h('div', { class: 'lectura' }, h('p', { text: p.texto }))); }
    cont.appendChild(h('p', { class: 'q', id: 'enunciado' }, h('span', { text: p.q })));
    var zona = h('div', { class: 'zona-resp' });
    var fb = h('div', { class: 'fb', 'aria-live': 'polite' });
    cont.appendChild(zona); cont.appendChild(fb);

    function cerrar(ok, tu, casi) {
      if (respondida) { return; }
      respondida = true;
      if (!cfg.sinFb) {
        fb.className = 'fb ' + (ok ? 'ok' : 'mal');
        fb.appendChild(h('p', { class: 'fb-titulo' }, icono(ok ? 'ok' : 'mal', 20), ok ? (casi ? ' Casi: revisa la ortografía' : ' Correcto') : ' Incorrecto'));
        if (!ok) { fb.appendChild(h('p', {}, h('strong', { text: 'Respuesta correcta: ' }), textoCorrecto(p))); }
        if (p.e) { fb.appendChild(h('p', { class: 'fb-e', text: p.e })); }
      }
      cfg.alResponder(ok, tu);
      if (cfg.siguiente) {
        var b = h('button', { type: 'button', class: 'boton boton-principal boton-sig', onclick: cfg.siguiente }, cfg.siguienteTxt || 'Siguiente', icono('ir', 20));
        fb.appendChild(b);
        b.focus({ preventScroll: true });
      }
    }

    if (p.t === 'mc') {
      var grupo = h('div', { class: 'opciones', role: 'group', 'aria-labelledby': 'enunciado' });
      p.o.forEach(function (txt, i) {
        var b = h('button', { type: 'button', class: 'opcion', 'data-i': i, onclick: function () {
          if (respondida) { return; }
          var ok = i === p.a;
          Array.prototype.forEach.call(grupo.children, function (x, k) {
            x.disabled = true;
            if (cfg.sinFb) { if (k === i) { x.classList.add('sel'); } }
            else if (k === p.a) { x.classList.add('acierto'); }
            else if (k === i) { x.classList.add('fallo'); }
          });
          cerrar(ok, txt);
        } }, h('span', { text: txt }));
        grupo.appendChild(b);
      });
      zona.appendChild(grupo);
    } else {
      var inp = h('input', { type: 'text', class: 'hueco', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-labelledby': 'enunciado', placeholder: 'Escribe aquí' });
      var go = function () {
        if (respondida || !inp.value.trim()) { return; }
        var r = comparar(inp.value, p.a);
        inp.disabled = true; btn.disabled = true;
        cerrar(r !== 'no', inp.value, r === 'casi');
      };
      var btn = h('button', { type: 'button', class: 'boton boton-principal', onclick: go }, 'Comprobar');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      zona.appendChild(h('div', { class: 'fila-resp' }, inp, btn));
      inp.focus({ preventScroll: true });
    }
  }

  /* -------------------------------------------------------- estructura común */
  function salir() { if (S.limpiar) { S.limpiar(); S.limpiar = null; } if (tts) { window.speechSynthesis.cancel(); } }

  function pantalla(titulo, estado) {
    salir();
    raiz.textContent = '';
    var cab = h('section', { class: 'senal senal-ruta cabeza-juego' },
      h('button', { type: 'button', class: 'boton boton-fantasma volver-menu', onclick: menu }, icono('atras', 20), 'Menú'),
      h('h2', { text: titulo }),
      h('div', { class: 'estado', 'aria-live': 'polite' }, estado || null));
    var cuerpo = h('section', { class: 'senal senal-blanca hoja juego' });
    raiz.appendChild(cab); raiz.appendChild(cuerpo);
    window.scrollTo(0, 0);
    return { cab: cab, estado: cab.querySelector('.estado'), cuerpo: cuerpo };
  }
  function chip(texto, clase) { return h('span', { class: 'chip' + (clase ? ' ' + clase : ''), text: texto }); }
  function mm(seg) { var m = Math.floor(seg / 60), s = seg % 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s; }

  function finalizar(p, datos) {
    // datos: { titulo, lineas[], xp, mensaje, otra: fn }
    p.cuerpo.textContent = '';
    p.cuerpo.appendChild(h('div', { class: 'fin' },
      h('h3', { text: datos.titulo }),
      datos.lineas.map(function (l) { return h('p', { class: 'fin-linea' }, h('strong', { text: l[0] + ' ' }), String(l[1])); }),
      datos.mensaje ? h('p', { class: 'nota', text: datos.mensaje }) : null,
      datos.xp ? h('p', { class: 'fin-xp' }, icono('estrella', 22), ' +' + datos.xp + ' XP') : null,
      h('div', { class: 'acciones' },
        datos.otra ? h('button', { type: 'button', class: 'boton boton-principal', onclick: datos.otra }, datos.otraTxt || 'Jugar otra vez') : null,
        h('button', { type: 'button', class: 'boton boton-claro', onclick: menu }, 'Volver al menú'))));
  }

  /* ============================================================ SURVIVAL */
  function survival() {
    var D = S.D, t0 = Date.now();
    var banco = barajar(D.preguntas.concat(D.boss)), i = 0, vidas = 3, seguidas = 0, mejor = 0, aciertos = 0, xp = 0;
    var p = pantalla('Survival Mode');
    P.jugada('survival');
    function estado() {
      p.estado.textContent = '';
      var c = h('span', { class: 'vidas', 'aria-label': 'Vidas: ' + vidas + ' de 3' });
      for (var k = 0; k < 3; k++) { c.appendChild(h('span', { class: 'vida' + (k < vidas ? '' : ' perdida') }, icono('vida', 22))); }
      p.estado.appendChild(c);
      p.estado.appendChild(chip('Seguidas: ' + seguidas));
      p.estado.appendChild(chip('Récord: ' + Math.max(mejor, P.datos.records.survival || 0)));
    }
    function fin(motivo) {
      P.record('survival', mejor);
      P.tiempo('survival', (Date.now() - t0) / 1000);
      finalizar(p, { titulo: motivo, lineas: [['Aciertos:', aciertos], ['Mejor racha:', mejor]], xp: xp,
        mensaje: 'Las preguntas que fallaste quedaron en tu cuaderno de errores.', otra: survival });
    }
    function sig() {
      if (vidas <= 0) { fin('Te quedaste sin vidas'); return; }
      if (i >= banco.length) { fin('¡Respondiste todo el banco!'); return; }
      var q = preparar(banco[i++]);
      pregunta(p.cuerpo, q, {
        alResponder: function (ok, tu) {
          var ganado = ok ? 5 + (seguidas >= 4 ? 3 : 0) : 0;
          if (ok) { seguidas++; aciertos++; mejor = Math.max(mejor, seguidas); xp += ganado; }
          else { vidas--; seguidas = 0; P.agregarError(q, tu, 'Survival'); }
          P.respuesta({ modo: 'survival', tema: q.tema, ok: ok, xp: ganado });
          estado();
        },
        siguiente: sig, siguienteTxt: 'Siguiente'
      });
    }
    estado(); sig();
  }

  /* ============================================================ BOSS */
  function boss() {
    var D = S.D, t0 = Date.now();
    var qs = D.boss.map(preparar), i = 0, resp = [];
    var p = pantalla('Boss Challenge');
    P.jugada('boss');
    p.estado.appendChild(chip('Aprueba con 70 % o más'));
    function mostrar() {
      p.estado.textContent = '';
      p.estado.appendChild(chip('Pregunta ' + (i + 1) + ' de ' + qs.length));
      pregunta(p.cuerpo, qs[i], {
        sinFb: true,
        alResponder: function (ok, tu) { resp[i] = { ok: ok, tu: tu }; },
        siguiente: function () { i++; if (i < qs.length) { mostrar(); } else { terminar(); } },
        siguienteTxt: i === qs.length - 1 ? 'Ver resultado' : 'Siguiente'
      });
    }
    function terminar() {
      var buenas = resp.filter(function (r) { return r.ok; }).length;
      var pct = Math.round((buenas / qs.length) * 100), aprobo = pct >= 70;
      var primera = !(P.datos.records.boss && P.datos.records.boss[S.nivel]);
      qs.forEach(function (q, k) {
        P.respuesta({ modo: 'boss', tema: q.tema, ok: resp[k].ok, xp: 0 });
        if (!resp[k].ok) { P.agregarError(q, resp[k].tu, 'Boss'); }
      });
      var xp = buenas * 6 + (aprobo ? (primera ? 60 : 20) : 0);
      if (aprobo) {
        var r = P.datos.records; r.boss = r.boss || {};
        r.boss[S.nivel] = Math.max(r.boss[S.nivel] || 0, pct);
        P.revisarLogros();
      }
      P.sumarXP(xp, 'boss'); P.tiempo('boss', (Date.now() - t0) / 1000);
      p.estado.textContent = ''; p.estado.appendChild(chip(pct + ' %', aprobo ? 'bien' : 'mal'));
      p.cuerpo.textContent = '';
      p.cuerpo.appendChild(h('div', { class: 'fin' },
        h('h3', { text: aprobo ? '¡Superaste el nivel ' + S.nivel + '!' : 'Todavía no, pero casi' }),
        h('p', { class: 'fin-linea' }, h('strong', { text: 'Aciertos: ' }), buenas + ' de ' + qs.length + ' (' + pct + ' %)'),
        h('p', { class: 'fin-xp' }, icono('estrella', 22), ' +' + xp + ' XP'),
        h('ul', { class: 'revisa' }, qs.map(function (q, k) {
          return h('li', { class: resp[k].ok ? 'ok' : 'mal' },
            h('span', { class: 'marca' }, icono(resp[k].ok ? 'ok' : 'mal', 16), resp[k].ok ? ' Correcta' : ' Incorrecta'),
            h('span', { class: 'rq', text: q.q }),
            resp[k].ok ? null : h('span', { class: 're', text: 'Correcta: ' + textoCorrecto(q) + (q.e ? '. ' + q.e : '') }));
        })),
        h('div', { class: 'acciones' },
          h('button', { type: 'button', class: 'boton boton-principal', onclick: boss }, 'Intentarlo otra vez'),
          h('button', { type: 'button', class: 'boton boton-claro', onclick: menu }, 'Volver al menú'))));
    }
    mostrar();
  }

  /* ====================================================== SMART FLASHCARDS */
  var INTERVALOS = [0, 1, 2, 4, 8, 16];
  function diaHoy() { return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }

  function pendientesTarjetas() {
    var hoy = diaHoy(), t = P.datos.tarjetas;
    var vencidas = S.D.vocab.filter(function (v) { var s = t[S.nivel + v.id]; return s && s.p <= hoy; });
    var nuevas = S.D.vocab.filter(function (v) { return !t[S.nivel + v.id]; });
    return { vencidas: vencidas, nuevas: nuevas };
  }

  function flashcards(repasarTodo) {
    var D = S.D, t0 = Date.now();
    var pend = pendientesTarjetas();
    var cola = elegir(pend.vencidas, 12).concat(elegir(pend.nuevas, 5));
    if (repasarTodo) { cola = elegir(D.vocab, 10); }
    var p = pantalla('Smart Flashcards');
    P.jugada('flashcards');
    if (!cola.length) {
      p.cuerpo.appendChild(h('div', { class: 'fin' },
        h('h3', { text: 'Hoy no tienes tarjetas pendientes' }),
        h('p', { text: 'Las tarjetas vuelven a aparecer cuando toca repasarlas: las difíciles pronto y las fáciles dentro de varios días. Vuelve mañana o repasa algunas ahora.' }),
        h('div', { class: 'acciones' },
          h('button', { type: 'button', class: 'boton boton-principal', onclick: function () { flashcards(true); } }, 'Repasar igual'),
          h('button', { type: 'button', class: 'boton boton-claro', onclick: menu }, 'Volver al menú'))));
      return;
    }
    var total = cola.length, hechas = 0, vistas = 0, buenas = 0, repetida = {};
    function mostrar() {
      p.estado.textContent = ''; p.estado.appendChild(chip('Tarjeta ' + Math.min(hechas + 1, total) + ' de ' + total));
      if (!cola.length) { return fin(); }
      var v = cola[0], id = S.nivel + v.id, est = P.datos.tarjetas[id];
      p.cuerpo.textContent = '';
      var anverso = h('div', { class: 'tarjeta' },
        h('p', { class: 'tarjeta-en', text: v.en }),
        h('p', { class: 'tarjeta-tema', text: v.tema + (est ? ' · caja ' + est.c + ' de 5' : ' · nueva') }),
        botonVoz(v.en, 'Escuchar ' + v.en));
      var rev = h('div', { class: 'tarjeta-rev', hidden: true });
      var mostrarBtn = h('button', { type: 'button', class: 'boton boton-principal', onclick: function () {
        rev.hidden = false; mostrarBtn.hidden = true; botones.hidden = false;
        rev.appendChild(h('p', { class: 'tarjeta-es', text: v.es }));
        botones.querySelector('button').focus();
      } }, 'Mostrar significado');
      var botones = h('div', { class: 'calif', hidden: true, role: 'group', 'aria-label': '¿Qué tal te fue?' });
      [['Otra vez', 1, 'mal'], ['Difícil', 2, ''], ['Bien', 3, 'bien'], ['Fácil', 4, 'bien']].forEach(function (o) {
        botones.appendChild(h('button', { type: 'button', class: 'boton boton-calif ' + o[2], onclick: function () { calificar(v, id, o[1]); } }, o[0]));
      });
      p.cuerpo.appendChild(anverso); p.cuerpo.appendChild(rev); p.cuerpo.appendChild(mostrarBtn); p.cuerpo.appendChild(botones);
      mostrarBtn.focus({ preventScroll: true });
    }
    function calificar(v, id, nota) {
      var est = P.datos.tarjetas[id] || { c: 1, p: diaHoy(), n: 0 };
      est.n++;
      if (nota === 1) { est.c = 1; est.p = diaHoy(); }
      else if (nota === 2) { est.p = diaHoy() + 1; }
      else { est.c = Math.min(5, est.c + (nota === 4 ? 2 : 1)); est.p = diaHoy() + INTERVALOS[est.c]; }
      P.datos.tarjetas[id] = est;
      P.datos.stats.tarjetas++; P.evento('cards', 1);
      vistas++; if (nota >= 3) { buenas++; }
      P.respuesta({ modo: 'flashcards', tema: v.tema, ok: nota >= 3, xp: 2 });
      cola.shift();
      if (nota === 1 && !repetida[id]) { repetida[id] = true; cola.push(v); } else { hechas++; }
      P.guardar();
      mostrar();
    }
    function fin() {
      P.tiempo('flashcards', (Date.now() - t0) / 1000);
      var cajas = [0, 0, 0, 0, 0, 0];
      S.D.vocab.forEach(function (v) { var e = P.datos.tarjetas[S.nivel + v.id]; if (e) { cajas[e.c]++; } });
      finalizar(p, { titulo: '¡Sesión terminada!', lineas: [['Repasos:', vistas], ['Recordadas bien:', buenas], ['Tarjetas en caja 4 o 5:', cajas[4] + cajas[5] + ' de ' + S.D.vocab.length]],
        mensaje: 'Las que se te olvidaron vuelven antes. Las que sabes bien, dentro de más días.', otra: function () { flashcards(false); }, otraTxt: 'Otra sesión' });
    }
    mostrar();
  }

  /* ===================================================== CUADERNO DE ERRORES */
  function cuaderno() {
    var p = pantalla('Cuaderno de errores');
    var lista = P.datos.errores;
    p.estado.appendChild(chip(lista.length + (lista.length === 1 ? ' pendiente' : ' pendientes')));
    if (!lista.length) {
      p.cuerpo.appendChild(h('div', { class: 'fin' },
        h('h3', { text: 'Tu cuaderno está vacío' }),
        h('p', { text: 'Cuando falles una pregunta en cualquier modo, quedará guardada aquí para repasarla. Acierta una pregunta dos veces seguidas y sale del cuaderno.' }),
        h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'boton boton-principal', onclick: menu }, 'Volver al menú'))));
      return;
    }
    p.cuerpo.appendChild(h('div', { class: 'acciones arriba' },
      h('button', { type: 'button', class: 'boton boton-principal', onclick: repasar }, 'Repasar ahora', icono('ir', 20))));
    p.cuerpo.appendChild(h('ul', { class: 'revisa' }, lista.map(function (e) {
      return h('li', { class: 'mal' },
        h('span', { class: 'marca' }, (e.modo || 'Práctica') + ' · ' + (e.p.tema || '') + ' · fallos: ' + (e.fallos || 1) + ' · aciertos seguidos: ' + (e.aciertos || 0)),
        h('span', { class: 'rq', text: e.p.q }),
        h('span', { class: 're', text: 'Correcta: ' + textoCorrecto(e.p) + (e.tu ? ' · Tu respuesta: ' + e.tu : '') }));
    })));
    function repasar() {
      var cola = lista.slice(0, 10), k = 0;
      var q = pantalla('Repaso del cuaderno');
      function sig() {
        if (k >= cola.length) { return cuaderno(); }
        var e = cola[k++], pr = preparar(e.p);
        q.estado.textContent = ''; q.estado.appendChild(chip('Pregunta ' + k + ' de ' + cola.length));
        pregunta(q.cuerpo, pr, {
          alResponder: function (ok) {
            var idx = P.datos.errores.indexOf(e);
            P.respuesta({ modo: 'cuaderno', tema: pr.tema, ok: ok, xp: 0 });
            var sale = P.repasoError(idx, ok);
            if (!ok) { return; }
            q.estado.appendChild(chip(sale ? 'Superado' : 'Falta un acierto más', 'bien'));
          },
          siguiente: sig, siguienteTxt: k >= cola.length ? 'Terminar' : 'Siguiente'
        });
      }
      sig();
    }
  }

  /* ===================================================== CONVERSACIONES */
  function conversaciones() {
    var p = pantalla('Virtual Conversations');
    p.cuerpo.appendChild(h('p', { class: 'intro-juego', text: 'Elige una situación y responde como lo harías. Cada respuesta se califica: la mejor suma 2 puntos.' }));
    p.cuerpo.appendChild(h('div', { class: 'escenas' }, S.D.conversaciones.map(function (c) {
      var mejor = (P.datos.records.conv || {})[S.nivel + c.id];
      return h('button', { type: 'button', class: 'escena', onclick: function () { conversar(c); } },
        icono('charla', 26),
        h('span', { class: 'escena-t', text: c.titulo }),
        h('span', { class: 'escena-d', text: c.pasos.length + ' turnos' + (mejor !== undefined ? ' · mejor: ' + mejor + ' %' : '') }));
    })));
  }

  function conversar(c) {
    var t0 = Date.now(), k = 0, puntos = 0, max = c.pasos.length * 2, mejoras = [];
    var p = pantalla(c.titulo);
    P.jugada('conversacion');
    var chat = h('div', { class: 'chat', 'aria-live': 'polite' });
    var opcs = h('div', { class: 'opciones' });
    var voz = h('label', { class: 'casilla' }, h('input', { type: 'checkbox', id: 'leer-voz', checked: tts ? true : null, disabled: tts ? null : true }), h('span', { text: tts ? 'Leer en voz alta lo que dice el otro' : 'Tu navegador no puede leer en voz alta' }));
    p.cuerpo.appendChild(voz); p.cuerpo.appendChild(chat); p.cuerpo.appendChild(opcs);
    function burbuja(quien, texto, extra) {
      var b = h('div', { class: 'burbuja ' + quien + (extra ? ' ' + extra : '') }, h('p', { text: texto }));
      chat.appendChild(b); b.scrollIntoView({ block: 'nearest' });
      return b;
    }
    function turno() {
      p.estado.textContent = ''; p.estado.appendChild(chip('Turno ' + (k + 1) + ' de ' + c.pasos.length)); p.estado.appendChild(chip('Puntos: ' + puntos));
      var paso = c.pasos[k];
      burbuja('otro', paso.npc);
      var leer = document.getElementById('leer-voz');
      if (leer && leer.checked) { decir(paso.npc, false); }
      opcs.textContent = '';
      barajar(paso.opciones).forEach(function (o) {
        opcs.appendChild(h('button', { type: 'button', class: 'opcion', onclick: function () { elegir_(paso, o); } }, h('span', { text: o.t })));
      });
    }
    function elegir_(paso, o) {
      puntos += o.pts;
      burbuja('yo', o.t);
      burbuja('nota', o.fb, o.pts === 2 ? 'bien' : (o.pts === 1 ? 'medio' : 'mal'));
      if (o.pts < 2) { var mejor = paso.opciones.filter(function (x) { return x.pts === 2; })[0]; mejoras.push(mejor.t); }
      opcs.textContent = '';
      k++;
      var sig = h('button', { type: 'button', class: 'boton boton-principal', onclick: function () { sig.remove(); if (k < c.pasos.length) { turno(); } else { terminar(); } } }, k < c.pasos.length ? 'Seguir' : 'Ver resultado', icono('ir', 20));
      opcs.appendChild(sig); sig.focus({ preventScroll: true });
      P.respuesta({ modo: 'conversacion', tema: 'Conversación', ok: o.pts === 2, xp: o.pts * 3 });
    }
    function terminar() {
      var pct = Math.round((puntos / max) * 100);
      var xp = (pct >= 75 ? 20 : 0);
      P.sumarXP(xp, 'conversacion');
      P.datos.conv.total++;
      var r = P.datos.records; r.conv = r.conv || {};
      r.conv[S.nivel + c.id] = Math.max(r.conv[S.nivel + c.id] || 0, pct);
      P.revisarLogros(); P.guardar(); P.tiempo('conversacion', (Date.now() - t0) / 1000);
      salirVoz();
      p.cuerpo.textContent = '';
      p.cuerpo.appendChild(h('div', { class: 'fin' },
        h('h3', { text: pct >= 75 ? '¡Muy buena conversación!' : (pct >= 40 ? 'Buen intento' : 'Sigue practicando') }),
        h('p', { class: 'fin-linea' }, h('strong', { text: 'Puntos: ' }), puntos + ' de ' + max + ' (' + pct + ' %)'),
        xp ? h('p', { class: 'fin-xp' }, icono('estrella', 22), ' +' + xp + ' XP (más los puntos de cada turno)') : null,
        mejoras.length ? h('div', { class: 'mejoras' }, h('p', { class: 'fin-linea' }, h('strong', { text: 'Podías decir:' })), h('ul', {}, mejoras.map(function (m) { return h('li', { text: m }); }))) : h('p', { class: 'nota', text: 'Todas tus respuestas fueron las mejores.' }),
        h('div', { class: 'acciones' },
          h('button', { type: 'button', class: 'boton boton-principal', onclick: function () { conversar(c); } }, 'Repetir'),
          h('button', { type: 'button', class: 'boton boton-claro', onclick: conversaciones }, 'Otra situación'))));
    }
    function salirVoz() { if (tts) { window.speechSynthesis.cancel(); } }
    S.limpiar = salirVoz;
    turno();
  }

  /* ============================================================ WORD BATTLE */
  function wordBattle() {
    var D = S.D, DURACION = 60, vocab = D.vocab, usadas = [], score = 0, combo = 0, mejorCombo = 0, ok = 0, total = 0, vivo = true, fin_ = false;
    var p = pantalla('Word Battle');
    P.jugada('wordbattle');
    var restante = DURACION, t0 = Date.now();
    var reloj = chip('60 s'), pts = chip('Puntos: 0'), cb = chip('Combo: 0');
    p.estado.appendChild(reloj); p.estado.appendChild(pts); p.estado.appendChild(cb);
    var intervalo = window.setInterval(function () {
      restante = Math.max(0, DURACION - Math.round((Date.now() - t0) / 1000));
      reloj.textContent = restante + ' s';
      if (restante <= 0) { acabar(); }
    }, 250);
    S.limpiar = function () { window.clearInterval(intervalo); vivo = false; };
    function siguiente() {
      if (!vivo) { return; }
      if (!usadas.length) { usadas = barajar(vocab); }
      var v = usadas.pop();
      var malas = elegir(vocab.filter(function (x) { return x.id !== v.id; }), 3);
      var ops = barajar([v].concat(malas));
      p.cuerpo.textContent = '';
      p.cuerpo.appendChild(h('p', { class: 'palabra-es', id: 'enunciado', text: v.es }));
      p.cuerpo.appendChild(h('p', { class: 'nota', text: '¿Cómo se dice en inglés?' }));
      var grupo = h('div', { class: 'opciones dos', role: 'group', 'aria-labelledby': 'enunciado' });
      ops.forEach(function (o) {
        grupo.appendChild(h('button', { type: 'button', class: 'opcion', onclick: function () { responder(v, o, grupo); } }, h('span', { text: o.en })));
      });
      p.cuerpo.appendChild(grupo);
    }
    function responder(v, o, grupo) {
      if (!vivo) { return; }
      var bien = o.id === v.id;
      total++;
      if (bien) { ok++; combo++; mejorCombo = Math.max(mejorCombo, combo); score += 10 + (combo >= 3 ? 5 : 0); }
      else { combo = 0; score = Math.max(0, score - 3); }
      pts.textContent = 'Puntos: ' + score; cb.textContent = 'Combo: ' + combo;
      P.respuesta({ modo: 'wordbattle', tema: v.tema, ok: bien, xp: 0 });
      siguiente();
    }
    function acabar() {
      if (fin_) { return; } fin_ = true; vivo = false; window.clearInterval(intervalo);
      var xp = Math.min(60, Math.round(score / 4));
      P.sumarXP(xp, 'wordbattle'); P.record('wordbattle', score); P.tiempo('wordbattle', DURACION);
      finalizar(p, { titulo: '¡Se acabó el tiempo!', lineas: [['Puntos:', score], ['Palabras acertadas:', ok + ' de ' + total], ['Mejor combo:', mejorCombo], ['Récord:', P.datos.records.wordbattle || score]], xp: xp, otra: wordBattle });
    }
    siguiente();
  }

  /* ================================================== REVERSE TRANSLATION */
  function reverse() {
    var D = S.D, t0 = Date.now(), items = elegir(D.frases, 10), i = 0, buenas = 0, xp = 0;
    var p = pantalla('Reverse Translation');
    P.jugada('reverse');
    function sig() {
      if (i >= items.length) {
        P.tiempo('reverse', (Date.now() - t0) / 1000);
        return finalizar(p, { titulo: 'Sesión terminada', lineas: [['Aciertos:', buenas + ' de ' + items.length]], xp: xp, otra: reverse });
      }
      var f = items[i];
      p.estado.textContent = ''; p.estado.appendChild(chip('Frase ' + (i + 1) + ' de ' + items.length));
      p.estado.appendChild(chip(i % 2 === 0 ? 'Español → inglés' : 'Inglés → español'));
      var q;
      if (i % 2 === 0) { q = { id: 'r' + f.id, t: 'fill', tema: 'Traducción', q: 'Traduce al inglés: ' + f.es, a: f.en, e: 'Otra forma de decirlo: ' + f.en[0] }; }
      else {
        var distr = elegir(D.frases.filter(function (x) { return x.id !== f.id; }), 2).map(function (x) { return x.es; });
        q = preparar({ id: 'r' + f.id, t: 'mc', tema: 'Traducción', q: '¿Qué significa? ' + f.en[0], o: [f.es].concat(distr), a: 0, e: '' });
      }
      i++;
      pregunta(p.cuerpo, q, {
        alResponder: function (ok, tu) {
          var casi = ok && q.t === 'fill' && comparar(tu, q.a) === 'casi';
          if (ok) { buenas++; var g = casi ? 3 : 6; xp += g; P.respuesta({ modo: 'reverse', tema: 'Traducción', ok: true, xp: g }); }
          else { P.respuesta({ modo: 'reverse', tema: 'Traducción', ok: false }); P.agregarError(q, tu, 'Traducción'); }
          P.evento('reverse', 1);
        },
        siguiente: sig
      });
    }
    sig();
  }

  /* ========================================================= SENTENCE BUILDER */
  function builder() {
    var D = S.D, t0 = Date.now(), items = elegir(D.frases, 8), i = 0, buenas = 0, xp = 0;
    var p = pantalla('Sentence Builder');
    P.jugada('builder');
    function sig() {
      if (i >= items.length) {
        P.tiempo('builder', (Date.now() - t0) / 1000);
        return finalizar(p, { titulo: 'Sesión terminada', lineas: [['Oraciones correctas:', buenas + ' de ' + items.length]], xp: xp, otra: builder });
      }
      var f = items[i++], fichas = f.en[0].split(' ').map(function (t, k) { return { t: t, k: k }; });
      fichas = barajar(fichas);
      var puestas = [], revisada = false;
      p.estado.textContent = ''; p.estado.appendChild(chip('Oración ' + i + ' de ' + items.length));
      p.cuerpo.textContent = '';
      p.cuerpo.appendChild(h('p', { class: 'q', id: 'enunciado' }, h('span', { text: 'Ordena en inglés: ' + f.es })));
      var linea = h('div', { class: 'orden-linea', 'aria-label': 'Tu oración' });
      var banco = h('div', { class: 'orden-banco' });
      var fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      var comprobar = h('button', { type: 'button', class: 'boton boton-principal', disabled: true, onclick: revisar }, 'Comprobar');
      var borrar = h('button', { type: 'button', class: 'enlace-boton', onclick: function () { if (!revisada) { puestas = []; dibujar(); } } }, 'Borrar');
      function dibujar() {
        linea.textContent = ''; banco.textContent = '';
        if (!puestas.length) { linea.appendChild(h('span', { class: 'orden-vacio', text: 'Toca las palabras en orden' })); }
        puestas.forEach(function (f_, pos) {
          linea.appendChild(h('button', { type: 'button', class: 'ficha puesta', disabled: revisada, onclick: function () { puestas.splice(pos, 1); dibujar(); } }, f_.t));
        });
        fichas.forEach(function (f_) {
          var usada = puestas.indexOf(f_) !== -1;
          banco.appendChild(h('button', { type: 'button', class: 'ficha', disabled: usada || revisada, onclick: function () { puestas.push(f_); dibujar(); } }, f_.t));
        });
        comprobar.disabled = revisada || puestas.length !== fichas.length;
      }
      function revisar() {
        revisada = true; dibujar();
        var armada = puestas.map(function (x) { return x.t; }).join(' ');
        var bien = comparar(armada, f.en) === 'si';
        fb.className = 'fb ' + (bien ? 'ok' : 'mal');
        fb.appendChild(h('p', { class: 'fb-titulo' }, icono(bien ? 'ok' : 'mal', 20), bien ? ' Correcto' : ' Incorrecto'));
        if (!bien) { fb.appendChild(h('p', {}, h('strong', { text: 'Respuesta correcta: ' }), f.en[0])); }
        if (bien) { buenas++; xp += 6; }
        P.respuesta({ modo: 'builder', tema: 'Gramática', ok: bien, xp: bien ? 6 : 0 });
        P.evento('builder', 1);
        if (!bien) { P.agregarError({ id: 'bd' + f.id, t: 'fill', tema: 'Gramática', q: 'Ordena y escribe en inglés: ' + f.es, a: f.en, e: '' }, armada, 'Sentence Builder'); }
        var b = h('button', { type: 'button', class: 'boton boton-principal boton-sig', onclick: sig }, i >= items.length ? 'Ver resultado' : 'Siguiente', icono('ir', 20));
        fb.appendChild(b); b.focus({ preventScroll: true });
      }
      p.cuerpo.appendChild(linea); p.cuerpo.appendChild(banco);
      p.cuerpo.appendChild(h('div', { class: 'fila-resp' }, comprobar, borrar));
      p.cuerpo.appendChild(fb);
      dibujar();
    }
    sig();
  }

  /* ============================================================== LISTENING */
  function listening() {
    var D = S.D, t0 = Date.now(), items = elegir(D.frases, 8), i = 0, buenas = 0, xp = 0, lento = false;
    var p = pantalla('Listening Challenge');
    P.jugada('listening');
    if (!tts) {
      p.cuerpo.appendChild(h('div', { class: 'fin' }, h('h3', { text: 'Tu navegador no puede reproducir voz' }), h('p', { text: 'Prueba con Chrome o Edge para usar este modo.' }),
        h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'boton boton-claro', onclick: menu }, 'Volver al menú'))));
      return;
    }
    function sig() {
      if (i >= items.length) {
        P.tiempo('listening', (Date.now() - t0) / 1000);
        return finalizar(p, { titulo: 'Sesión terminada', lineas: [['Frases entendidas:', buenas + ' de ' + items.length]], xp: xp, otra: listening });
      }
      var f = items[i++];
      p.estado.textContent = ''; p.estado.appendChild(chip('Frase ' + i + ' de ' + items.length));
      p.cuerpo.textContent = '';
      p.cuerpo.appendChild(h('p', { class: 'q', id: 'enunciado' }, h('span', { text: 'Escucha y escribe lo que oyes.' })));
      var fila = h('div', { class: 'fila-resp' },
        h('button', { type: 'button', class: 'boton boton-audio', onclick: function () { decir(f.en[0], lento); } }, icono('play', 20), ' Escuchar'),
        h('label', { class: 'casilla' }, h('input', { type: 'checkbox', checked: lento ? true : null, onchange: function (e) { lento = e.target.checked; } }), h('span', { text: 'Más despacio' })));
      var inp = h('input', { type: 'text', class: 'hueco', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-labelledby': 'enunciado', placeholder: 'Escribe lo que escuchaste' });
      var fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      var enviado = false;
      var go = function () {
        if (enviado || !inp.value.trim()) { return; } enviado = true; inp.disabled = true; btn.disabled = true;
        var c = coincidencia(inp.value, f.en[0]), bien = c.pct >= 85;
        fb.className = 'fb ' + (bien ? 'ok' : 'mal');
        fb.appendChild(h('p', { class: 'fb-titulo' }, icono(bien ? 'ok' : 'mal', 20), bien ? ' Entendiste la frase (' + c.pct + ' %)' : ' Entendiste ' + c.pct + ' %'));
        fb.appendChild(h('p', { class: 'palabras' }, c.marcas.map(function (m) { return h('span', { class: 'pal ' + (m.ok ? 'ok' : 'mal'), text: m.t }); })));
        fb.appendChild(h('p', {}, h('strong', { text: 'Decía: ' }), f.en[0]));
        fb.appendChild(h('p', { class: 'fb-e', text: 'Significa: ' + f.es }));
        if (bien) { buenas++; xp += 6; }
        P.respuesta({ modo: 'listening', tema: 'Escucha', ok: bien, xp: bien ? 6 : 0 });
        if (!bien) { P.agregarError({ id: 'ls' + f.id, t: 'fill', tema: 'Escucha', q: 'Escribe lo que dice el audio: "' + f.es + '" (en inglés)', a: f.en, e: '' }, inp.value, 'Listening'); }
        var b = h('button', { type: 'button', class: 'boton boton-principal boton-sig', onclick: sig }, i >= items.length ? 'Ver resultado' : 'Siguiente', icono('ir', 20));
        fb.appendChild(b); b.focus({ preventScroll: true });
      };
      var btn = h('button', { type: 'button', class: 'boton boton-principal', onclick: go }, 'Comprobar');
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      p.cuerpo.appendChild(fila);
      p.cuerpo.appendChild(h('div', { class: 'fila-resp' }, inp, btn));
      p.cuerpo.appendChild(fb);
      decir(f.en[0], lento);
    }
    sig();
  }

  /* =============================================================== SPEAKING */
  function speaking() {
    var D = S.D, t0 = Date.now(), items = elegir(D.frases, 6), i = 0, buenas = 0, xp = 0;
    var Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    var p = pantalla('Speaking Practice');
    P.jugada('speaking');
    var rec = null;
    S.limpiar = function () { try { if (rec) { rec.abort(); } } catch (e) { /* nada */ } };
    function sig() {
      if (i >= items.length) {
        P.tiempo('speaking', (Date.now() - t0) / 1000);
        return finalizar(p, { titulo: 'Sesión terminada', lineas: [['Frases bien dichas:', buenas + ' de ' + items.length]], xp: xp, otra: speaking });
      }
      var f = items[i++];
      p.estado.textContent = ''; p.estado.appendChild(chip('Frase ' + i + ' de ' + items.length));
      p.cuerpo.textContent = '';
      p.cuerpo.appendChild(h('p', { class: 'palabra-es', text: f.en[0] }));
      p.cuerpo.appendChild(h('p', { class: 'nota', text: 'Significa: ' + f.es }));
      var fb = h('div', { class: 'fb', 'aria-live': 'polite' });
      var fila = h('div', { class: 'fila-resp' }, botonVoz(f.en[0], 'Escuchar cómo se dice'));
      var cerrada = false;
      function terminar(bien, detalle) {
        if (cerrada) { return; } cerrada = true;
        fb.className = 'fb ' + (bien ? 'ok' : 'mal');
        fb.appendChild(h('p', { class: 'fb-titulo' }, icono(bien ? 'ok' : 'mal', 20), bien ? ' ¡Bien dicho!' : ' Inténtalo otra vez'));
        if (detalle) { fb.appendChild(detalle); }
        if (bien) { buenas++; xp += 8; }
        P.respuesta({ modo: 'speaking', tema: 'Pronunciación', ok: bien, xp: bien ? 8 : 0 });
        var b = h('button', { type: 'button', class: 'boton boton-principal boton-sig', onclick: sig }, i >= items.length ? 'Ver resultado' : 'Siguiente', icono('ir', 20));
        fb.appendChild(b); b.focus({ preventScroll: true });
      }
      if (Rec) {
        var hablar = h('button', { type: 'button', class: 'boton boton-principal', onclick: function () {
          if (cerrada) { return; }
          try {
            rec = new Rec(); rec.lang = 'en-US'; rec.interimResults = false; rec.maxAlternatives = 3;
            hablar.disabled = true; hablar.textContent = 'Escuchando…';
            rec.onresult = function (e) {
              var mejor = null, k, c;
              for (k = 0; k < e.results[0].length; k++) { c = coincidencia(e.results[0][k].transcript, f.en[0]); c.texto = e.results[0][k].transcript; if (!mejor || c.pct > mejor.pct) { mejor = c; } }
              var detalle = h('div', {}, h('p', {}, h('strong', { text: 'Escuché: ' }), mejor.texto), h('p', { class: 'palabras' }, mejor.marcas.map(function (m) { return h('span', { class: 'pal ' + (m.ok ? 'ok' : 'mal'), text: m.t }); })), h('p', { class: 'fb-e', text: 'Coincidencia: ' + mejor.pct + ' %' }));
              terminar(mejor.pct >= 70, detalle);
            };
            rec.onerror = function () { hablar.disabled = false; hablar.textContent = 'Hablar'; fb.className = 'fb mal'; fb.textContent = 'No pude oír tu voz. Revisa que el navegador tenga permiso para usar el micrófono.'; };
            rec.onend = function () { if (!cerrada) { hablar.disabled = false; hablar.textContent = 'Hablar'; } };
            rec.start();
          } catch (err) { fb.className = 'fb mal'; fb.textContent = 'No se pudo iniciar el micrófono.'; }
        } }, icono('mic', 20), ' Hablar');
        fila.appendChild(hablar);
      } else {
        p.cuerpo.appendChild(h('p', { class: 'aviso aviso-error', role: 'alert', text: 'Tu navegador no tiene reconocimiento de voz. Usa Chrome o Edge para que la pronunciación se compruebe sola. Mientras tanto, léela en voz alta y califícate tú mismo.' }));
        fila.appendChild(h('button', { type: 'button', class: 'boton boton-principal', onclick: function () { terminar(true, null); } }, 'La dije bien'));
        fila.appendChild(h('button', { type: 'button', class: 'boton boton-claro', onclick: function () { terminar(false, null); } }, 'Debo repetirla'));
      }
      p.cuerpo.appendChild(fila); p.cuerpo.appendChild(fb);
    }
    sig();
  }

  /* ================================================================= MEMORY */
  function memoria() {
    var D = S.D, t0 = Date.now(), pares = elegir(D.vocab, 6), movs = 0, halladas = 0, abiertas = [], bloqueo = false;
    var cartas = [];
    pares.forEach(function (v) { cartas.push({ id: v.id, txt: v.en, lado: 'en' }); cartas.push({ id: v.id, txt: v.es, lado: 'es' }); });
    cartas = barajar(cartas);
    var p = pantalla('Memory Challenge');
    P.jugada('memoria');
    var cm = chip('Movimientos: 0'), cp = chip('Parejas: 0 de 6');
    p.estado.appendChild(cm); p.estado.appendChild(cp);
    p.cuerpo.appendChild(h('p', { class: 'intro-juego', text: 'Encuentra cada palabra en inglés con su traducción al español.' }));
    var malla = h('div', { class: 'memoria' });
    p.cuerpo.appendChild(malla);
    cartas.forEach(function (c) {
      c.el = h('button', { type: 'button', class: 'carta', 'aria-label': 'Carta cerrada', onclick: function () { voltear(c); } }, h('span', { class: 'cara', text: '?' }));
      malla.appendChild(c.el);
    });
    function voltear(c) {
      if (bloqueo || c.abierta || c.hecha) { return; }
      c.abierta = true; c.el.classList.add('abierta'); c.el.querySelector('.cara').textContent = c.txt; c.el.setAttribute('aria-label', c.txt);
      abiertas.push(c);
      if (abiertas.length < 2) { return; }
      movs++; cm.textContent = 'Movimientos: ' + movs;
      var a = abiertas[0], b = abiertas[1];
      if (a.id === b.id && a.lado !== b.lado) {
        a.hecha = b.hecha = true; a.el.classList.add('hecha'); b.el.classList.add('hecha'); halladas++; abiertas = [];
        cp.textContent = 'Parejas: ' + halladas + ' de 6';
        P.respuesta({ modo: 'memoria', tema: 'Vocabulario', ok: true, xp: 2 });
        if (halladas === 6) { acabar(); }
      } else {
        bloqueo = true;
        P.respuesta({ modo: 'memoria', tema: 'Vocabulario', ok: false });
        window.setTimeout(function () {
          [a, b].forEach(function (x) { x.abierta = false; x.el.classList.remove('abierta'); x.el.querySelector('.cara').textContent = '?'; x.el.setAttribute('aria-label', 'Carta cerrada'); });
          abiertas = []; bloqueo = false;
        }, 900);
      }
    }
    function acabar() {
      var xp = Math.max(10, 40 - (movs - 6) * 3);
      var r = P.datos.records; r.memoria = true;
      if (!r.memoriaMejor || movs < r.memoriaMejor) { r.memoriaMejor = movs; }
      P.sumarXP(xp, 'memoria'); P.tiempo('memoria', (Date.now() - t0) / 1000); P.revisarLogros();
      finalizar(p, { titulo: '¡Encontraste todas las parejas!', lineas: [['Movimientos:', movs], ['Mejor marca:', r.memoriaMejor + ' movimientos']], xp: xp, otra: memoria });
    }
  }

  /* ================================================================ LOGROS */
  function logros() {
    var p = pantalla('Logros');
    var tot = P.LOGROS.length, ya = P.LOGROS.filter(function (l) { return P.datos.logros[l.id]; }).length;
    p.estado.appendChild(chip(ya + ' de ' + tot + ' desbloqueados'));
    p.cuerpo.appendChild(h('ul', { class: 'logros' }, P.LOGROS.map(function (l) {
      var f = P.datos.logros[l.id];
      return h('li', { class: 'logro' + (f ? ' ganado' : '') },
        icono(f ? 'copa' : 'estrella', 28),
        h('span', { class: 'logro-n', text: l.nombre }),
        h('span', { class: 'logro-d', text: l.txt }),
        h('span', { class: 'logro-f', text: f ? 'Desbloqueado el ' + f : 'Pendiente' }));
    })));
  }

  /* ============================================================ ESTADÍSTICAS */
  var NOMBRES = { survival: 'Survival', boss: 'Boss Challenge', flashcards: 'Flashcards', cuaderno: 'Cuaderno', conversacion: 'Conversaciones', wordbattle: 'Word Battle', reverse: 'Reverse Translation', builder: 'Sentence Builder', listening: 'Listening', speaking: 'Speaking', memoria: 'Memory' };
  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
  function barra(valor, etiqueta) {
    return h('div', { class: 'hab-barra', role: 'img', 'aria-label': etiqueta }, h('span', { style: 'width:' + valor + '%' }));
  }
  function estadisticas() {
    var p = pantalla('Mi progreso');
    var s = P.datos.stats, total = s.correctas + s.incorrectas, info = P.infoNivel();
    p.estado.appendChild(chip('Nivel ' + info.nivel)); p.estado.appendChild(chip(info.xp + ' XP'));
    p.cuerpo.appendChild(h('ul', { class: 'cifras' },
      [['Respuestas', total], ['Precisión', pct(s.correctas, total) + ' %'], ['Tiempo practicado', Math.round(s.segundos / 60) + ' min'], ['Racha actual', P.datos.racha.actual + ' días'], ['Mejor racha', P.datos.racha.mejor + ' días']].map(function (c) {
        return h('li', {}, h('strong', { text: String(c[1]) }), h('span', { text: c[0] }));
      })));
    var modos = Object.keys(s.modos);
    p.cuerpo.appendChild(h('h3', { text: 'Por modo' }));
    p.cuerpo.appendChild(modos.length ? h('ul', { class: 'habs' }, modos.map(function (m) {
      var x = s.modos[m], pr = pct(x.ok, x.total);
      return h('li', {}, h('div', { class: 'hab-fila' }, h('span', { class: 'hab-nom', text: NOMBRES[m] || m }), h('span', { class: 'hab-val', text: x.jugadas + ' jugadas · ' + pr + ' % de aciertos' })), barra(pr, (NOMBRES[m] || m) + ': ' + pr + '%'));
    })) : h('p', { class: 'nota', text: 'Todavía no has jugado. Elige un modo del menú.' }));
    var temas = Object.keys(s.temas);
    p.cuerpo.appendChild(h('h3', { text: 'Por tema' }));
    p.cuerpo.appendChild(temas.length ? h('ul', { class: 'habs' }, temas.map(function (t) {
      var x = s.temas[t], pr = pct(x.ok, x.total), dom = x.total >= 8 && pr >= 80;
      return h('li', {}, h('div', { class: 'hab-fila' }, h('span', { class: 'hab-nom', text: t }), h('span', { class: 'hab-val', text: x.ok + ' de ' + x.total + (dom ? ' · dominado' : '') })), barra(pr, t + ': ' + pr + '%'));
    })) : h('p', { class: 'nota', text: 'Los temas aparecen cuando respondes preguntas.' }));
    var d = Object.keys(P.datos.diag);
    if (d.length) {
      p.cuerpo.appendChild(h('h3', { text: 'Diagnósticos' }));
      p.cuerpo.appendChild(h('ul', { class: 'diag-lista' }, d.map(function (k) { var x = P.datos.diag[k]; return h('li', { text: k.toUpperCase() + ': ' + x.nivel + ' (' + x.pct + ' %) el ' + x.fecha }); })));
    }
  }

  /* ================================================================== MENÚ */
  var MODOS = [
    { grupo: 'Juegos', items: [
      { id: 'survival', icono: 'vida', t: 'Survival Mode', d: 'Tienes 3 vidas. Cada error cuesta una.', f: survival },
      { id: 'wordbattle', icono: 'rayo', t: 'Word Battle', d: '60 segundos para traducir palabras.', f: wordBattle },
      { id: 'memoria', icono: 'memoria', t: 'Memory Challenge', d: 'Une cada palabra con su traducción.', f: memoria },
      { id: 'boss', icono: 'jefe', t: 'Boss Challenge', d: 'Prueba final del nivel. Aprueba con 70 %.', f: boss } ] },
    { grupo: 'Aprende', items: [
      { id: 'flashcards', icono: 'tarjetas', t: 'Smart Flashcards', d: 'Repaso espaciado: lo difícil vuelve antes.', f: function () { flashcards(false); } },
      { id: 'reverse', icono: 'cambio', t: 'Reverse Translation', d: 'Traduce frases entre español e inglés.', f: reverse },
      { id: 'builder', icono: 'bloques', t: 'Sentence Builder', d: 'Ordena palabras y arma la oración.', f: builder },
      { id: 'listening', icono: 'audifonos', t: 'Listening Challenge', d: 'Escucha una frase y escríbela.', f: listening },
      { id: 'speaking', icono: 'mic', t: 'Speaking Practice', d: 'Dila en voz alta y mira tu pronunciación.', f: speaking },
      { id: 'conversaciones', icono: 'charla', t: 'Virtual Conversations', d: 'Restaurante, aeropuerto, universidad y entrevista.', f: conversaciones } ] },
    { grupo: 'Mi progreso', items: [
      { id: 'cuaderno', icono: 'libro', t: 'Cuaderno de errores', d: 'Repasa lo que fallaste.', f: cuaderno },
      { id: 'logros', icono: 'copa', t: 'Logros', d: 'Medallas por tus objetivos.', f: logros },
      { id: 'stats', icono: 'grafico', t: 'Estadísticas', d: 'Precisión, tiempo y temas dominados.', f: estadisticas } ] }
  ];

  function insignia(id) {
    if (id === 'cuaderno') { return P.datos.errores.length ? P.datos.errores.length + ' por repasar' : null; }
    if (id === 'flashcards' && S.D) { var pe = pendientesTarjetas(); var n = pe.vencidas.length; return n ? n + ' para hoy' : (pe.nuevas.length ? pe.nuevas.length + ' nuevas' : null); }
    if (id === 'logros') { var g = Object.keys(P.datos.logros).length; return g + ' de ' + P.LOGROS.length; }
    if (id === 'wordbattle' && P.datos.records.wordbattle) { return 'Récord ' + P.datos.records.wordbattle; }
    if (id === 'survival' && P.datos.records.survival) { return 'Récord ' + P.datos.records.survival; }
    if (id === 'boss') { var b = P.datos.records.boss; if (b && b[S.nivel]) { return 'Aprobado ' + b[S.nivel] + ' %'; } }
    return null;
  }

  function resumen() {
    var info = P.infoNivel(), r = P.datos.racha;
    var nivelBtn = function (n) { return h('button', { type: 'button', class: 'boton boton-nivel', 'aria-pressed': S.nivel === n ? 'true' : 'false', onclick: function () { cambiarNivel(n); } }, n); };
    return h('section', { class: 'senal senal-ruta resumen' },
      h('div', { class: 'res-nv' }, h('span', { class: 'escudo grande', text: String(info.nivel) }),
        h('div', { class: 'res-xp' }, h('p', { class: 'res-t' }, h('strong', { text: 'Nivel ' + info.nivel }), ' · ' + info.xp + ' XP'),
          h('div', { class: 'xp-barra', role: 'img', 'aria-label': info.pct + ' % hacia el nivel ' + (info.nivel + 1) }, h('span', { style: 'width:' + info.pct + '%' })),
          h('p', { class: 'res-s', text: 'Te faltan ' + (info.hasta - info.xp) + ' XP para el nivel ' + (info.nivel + 1) }))),
      h('div', { class: 'res-racha' }, icono('llama', 28), h('p', {}, h('strong', { text: r.actual + (r.actual === 1 ? ' día' : ' días') }), ' de racha')),
      h('div', { class: 'res-sel', role: 'group', 'aria-label': 'Nivel de práctica' }, h('span', { text: 'Nivel de inglés' }), nivelBtn('A1'), nivelBtn('A2')));
  }

  function misiones() {
    var lista = P.misionesHoy();
    return h('section', { class: 'senal senal-aviso misiones' },
      h('h2', { text: 'Misiones de hoy' }),
      h('ul', { class: 'lista-mis' }, lista.map(function (m) {
        return h('li', { class: m.cobrada ? 'hecha' : '' },
          h('span', { class: 'mis-ic' }, m.cobrada ? icono('ok', 18) : null),
          h('span', { class: 'mis-t', text: m.txt }),
          h('span', { class: 'mis-p', text: m.cobrada ? '+' + m.premio + ' XP ganados' : m.hecho + ' de ' + m.meta + ' · +' + m.premio + ' XP' }));
      })));
  }

  function menu() {
    salir();
    raiz.textContent = '';
    raiz.appendChild(resumen());
    raiz.appendChild(misiones());
    MODOS.forEach(function (g) {
      raiz.appendChild(h('section', { class: 'grupo-modos n' + g.items.length, 'aria-label': g.grupo },
        h('h2', { text: g.grupo }),
        h('div', { class: 'modos' }, g.items.map(function (m) {
          var ins = insignia(m.id);
          return h('button', { type: 'button', class: 'modo', 'data-modo': m.id, onclick: m.f },
            h('span', { class: 'modo-ic' }, icono(m.icono, 28)),
            h('span', { class: 'modo-t', text: m.t }),
            h('span', { class: 'modo-d', text: m.d }),
            ins ? h('span', { class: 'modo-ins', text: ins }) : null);
        }))));
    });
    window.scrollTo(0, 0);
  }

  function cambiarNivel(n) {
    S.nivel = n; P.datos.pref.nivel = n; P.guardar();
    cargarDatos(n).then(function (d) { S.D = d; menu(); });
  }

  /* ================================================================ inicio */
  raiz.appendChild(h('p', { class: 'nota', text: 'Cargando tu práctica…' }));
  P.alCambiar(function () { /* el menú se vuelve a dibujar al volver */ });
  P.cargar().then(function () {
    S.nivel = P.datos.pref.nivel === 'A2' ? 'A2' : 'A1';
    P.registrarDia();
    return cargarDatos(S.nivel);
  }).then(function (d) { S.D = d; menu(); })
    .catch(function () {
      raiz.textContent = '';
      raiz.appendChild(h('p', { class: 'aviso aviso-error', role: 'alert', text: 'No pude cargar la práctica. Recarga la página; si sigue igual, avisa al equipo.' }));
    });
})();
