/* English Cundi - motor de las pruebas de diagnóstico.
   Sin librerías. Lee los datos de window.DIAGNOSTICO (cada nivel tiene su archivo)
   y arma la prueba por paradas: opción múltiple, completar, unir, ordenar,
   lectura, escucha (voz del navegador) y escritura.
   El avance y el resultado se guardan solo en este navegador (localStorage). */
(function () {
  'use strict';

  var D = window.DIAGNOSTICO;
  if (!D) { return; }

  var KEY = 'ec-diag-' + D.id;
  var raiz = document.getElementById('contenido');
  var pasosEl = document.getElementById('pasos');
  var relojEl = document.getElementById('reloj');
  var MAX_ESCUCHAS = D.escuchas || 2;

  /* ------------------------------------------------------------ utilidades */
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
  function svg(path, extra) {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('width', '20'); s.setAttribute('height', '20');
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '3'); s.setAttribute('stroke-linecap', 'round');
    s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    if (extra) { s.setAttribute('class', extra); }
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', path);
    s.appendChild(p);
    return s;
  }
  var ICONO = {
    ir: 'M5 12h14M13 6l6 6-6 6',
    atras: 'M19 12H5M11 6l-6 6 6 6',
    ok: 'M5 13l4 4L19 7',
    mal: 'M6 6l12 12M18 6L6 18',
    play: 'M8 5v14l11-7z',
    reloj: 'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z'
  };

  function norm(s) {
    return String(s === null || s === undefined ? '' : s).toLowerCase()
      .replace(/[‘’]/g, "'").replace(/[.!?,;:]+$/, '')
      .replace(/\s+/g, ' ').trim();
  }
  function contarPalabras(t) {
    var m = String(t || '').trim().match(/\S+/g);
    return m ? m.length : 0;
  }
  function mezcla(arr) {
    // Orden fijo (no aleatorio) para que no cambie al volver a la parada.
    return arr.slice().sort(function (a, b) { return hash(a) - hash(b); });
  }
  function hash(s) {
    var x = 7;
    for (var i = 0; i < s.length; i++) { x = (x * 31 + s.charCodeAt(i)) % 9973; }
    return x;
  }
  function clave(si, ii) { return si + '.' + ii; }

  /* ---------------------------------------------------------------- estado */
  function nuevo() {
    return { resp: {}, paso: 0, inicio: null, fin: null, usos: {}, sinAudio: false, vista: 'intro' };
  }
  function cargar() {
    try {
      var s = window.localStorage.getItem(KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function guardar() {
    try { window.localStorage.setItem(KEY, JSON.stringify(est)); } catch (e) { /* sin almacenamiento */ }
  }
  var est = cargar() || nuevo();
  if (est.fin) { est.vista = 'resultado'; }

  /* ----------------------------------------------------------- calificación */
  function maxItem(it) {
    if (it.t === 'match') { return it.pares.length; }
    if (it.t === 'write') { return 5; }
    return 1;
  }

  function evaluar(it, r) {
    var max = maxItem(it);
    var pts = 0;
    var detalle = null;
    if (it.t === 'mc') {
      pts = (r === it.a) ? 1 : 0;
    } else if (it.t === 'fill') {
      if (r !== undefined && r !== null && String(r).trim() !== '') {
        if (it.digitos) {
          var d = String(r).replace(/\D/g, '');
          pts = it.a.some(function (x) { return String(x).replace(/\D/g, '') === d && d !== ''; }) ? 1 : 0;
        } else {
          pts = it.a.some(function (x) { return norm(x) === norm(r); }) ? 1 : 0;
        }
      }
    } else if (it.t === 'match') {
      var rr = r || {};
      it.pares.forEach(function (p, i) { if (rr[i] === p[1]) { pts++; } });
    } else if (it.t === 'order') {
      if (Array.isArray(r) && r.length) {
        pts = (unir(r.map(function (i) { return it.fichas[i]; })) === it.a) ? 1 : 0;
      }
    } else if (it.t === 'write') {
      var texto = r || '';
      var n = contarPalabras(texto);
      var largo = n >= it.min ? 2 : (n >= Math.round(it.min * 0.6) ? 1 : 0);
      var pasados = it.checks.map(function (c) { return new RegExp(c.re, 'i').test(texto); });
      var cuantos = pasados.filter(Boolean).length;
      pts = (n === 0) ? 0 : Math.min(2, largo) + Math.min(3, cuantos);
      detalle = { palabras: n, pasados: pasados };
    }
    return { pts: pts, max: max, ok: it.t === 'write' ? pts >= 3 : pts === max, detalle: detalle };
  }

  function unir(tokens) {
    return tokens.join(' ').replace(/\s+([?.!,])/g, '$1');
  }

  function respondido(it, r) {
    if (it.t === 'mc') { return typeof r === 'number'; }
    if (it.t === 'fill' || it.t === 'write') { return !!(r && String(r).trim()); }
    if (it.t === 'match') { return !!r && Object.keys(r).filter(function (k) { return r[k]; }).length === it.pares.length; }
    if (it.t === 'order') { return Array.isArray(r) && r.length > 0; }
    return false;
  }

  function resumenPaso(si) {
    var s = D.secciones[si];
    var hechas = 0;
    s.items.forEach(function (it, ii) { if (respondido(it, est.resp[clave(si, ii)])) { hechas++; } });
    return { hechas: hechas, total: s.items.length };
  }

  function calcular() {
    var total = 0, max = 0, hab = {}, orden = [];
    D.secciones.forEach(function (s, si) {
      if (!hab[s.hab]) { hab[s.hab] = { pts: 0, max: 0 }; orden.push(s.hab); }
      s.items.forEach(function (it, ii) {
        var ev = evaluar(it, est.resp[clave(si, ii)]);
        total += ev.pts; max += ev.max;
        hab[s.hab].pts += ev.pts; hab[s.hab].max += ev.max;
      });
    });
    return { total: total, max: max, hab: hab, orden: orden };
  }

  function nivelDe(pct) {
    var nivel = D.niveles[0];
    D.niveles.forEach(function (n) { if (pct >= n.min) { nivel = n; } });
    return nivel;
  }

  /* ------------------------------------------------------------------ audio */
  var tts = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);
  function vozEn(genero) {
    if (!tts) { return null; }
    var vs = window.speechSynthesis.getVoices().filter(function (v) { return /^en/i.test(v.lang); });
    if (!vs.length) { return null; }
    var pref = genero === 'm' ? /male|david|mark|guy|daniel|george|james|ryan|alex/i
                              : /female|zira|samantha|aria|jenny|susan|hazel|karen|google us english/i;
    var uno = vs.filter(function (v) { return pref.test(v.name) && !(genero !== 'm' && /\bmale\b/i.test(v.name) && !/female/i.test(v.name)); });
    var us = (uno.length ? uno : vs).filter(function (v) { return /en[-_]US/i.test(v.lang); });
    return (us[0] || uno[0] || vs[0]);
  }
  function hablar(lineas, alTerminar) {
    var i = 0;
    window.speechSynthesis.cancel();
    function sig() {
      if (i >= lineas.length) { alTerminar(); return; }
      var u = new window.SpeechSynthesisUtterance(lineas[i].t);
      u.lang = 'en-US';
      u.rate = D.velocidad || 0.85;
      var v = vozEn(lineas[i].v);
      if (v) { u.voice = v; u.lang = v.lang; }
      if (lineas[i].v === 'm') { u.pitch = 0.75; }
      u.onend = function () { i++; window.setTimeout(sig, 350); };
      u.onerror = function () { alTerminar(); };
      window.speechSynthesis.speak(u);
    }
    sig();
  }

  function controlAudio(it, k) {
    var usadas = est.usos[k] || 0;
    var restan = MAX_ESCUCHAS - usadas;
    var btn = h('button', { type: 'button', class: 'boton boton-audio' });
    var info = h('span', { class: 'audio-info', 'aria-live': 'polite' });
    var caja = h('div', { class: 'audio' });

    function pintar(reproduciendo) {
      btn.textContent = '';
      btn.appendChild(svg(ICONO.play));
      btn.appendChild(document.createTextNode(reproduciendo ? ' Reproduciendo…' : ' Escuchar'));
      btn.disabled = reproduciendo || restan <= 0 || !tts;
      btn.classList.toggle('sonando', reproduciendo);
      info.textContent = !tts ? 'Tu navegador no reproduce voz.'
        : restan <= 0 ? 'Ya usaste tus escuchas.'
        : 'Te quedan ' + restan + (restan === 1 ? ' escucha.' : ' escuchas.');
    }
    btn.addEventListener('click', function () {
      if (restan <= 0 || !tts) { return; }
      restan--; est.usos[k] = MAX_ESCUCHAS - restan; guardar();
      pintar(true);
      hablar(it.audio, function () { pintar(false); });
    });
    pintar(false);
    caja.appendChild(btn); caja.appendChild(info);

    if (!tts || est.sinAudio) {
      caja.appendChild(h('p', { class: 'audio-texto' },
        h('strong', { text: 'Texto del audio: ' }),
        it.audio.map(function (l) { return l.t; }).join(' ')));
    }
    return caja;
  }

  /* --------------------------------------------------------- tipos de ítem */
  function guardarResp(k, valor) {
    est.resp[k] = valor; guardar(); pintarPasos();
    var av = document.getElementById('avance');
    if (av) { var r = resumenPaso(est.paso); av.textContent = r.hechas + ' de ' + r.total + ' respondidas'; }
  }

  function pintarMC(it, k, nombre) {
    var actual = est.resp[k];
    var grupo = h('div', { class: 'opciones', role: 'radiogroup', 'aria-label': 'Opciones' });
    it.o.forEach(function (txt, i) {
      var id = nombre + '-' + i;
      var inp = h('input', { type: 'radio', name: nombre, id: id, value: i });
      if (actual === i) { inp.checked = true; }
      var lab = h('label', { class: 'opcion' + (actual === i ? ' sel' : ''), for: id }, inp, h('span', { text: txt }));
      inp.addEventListener('change', function () {
        guardarResp(k, i);
        Array.prototype.forEach.call(grupo.querySelectorAll('.opcion'), function (l) { l.classList.remove('sel'); });
        lab.classList.add('sel');
      });
      grupo.appendChild(lab);
    });
    return grupo;
  }

  function pintarFill(it, k, nombre) {
    var inp = h('input', {
      type: 'text', id: nombre, class: 'hueco', autocomplete: 'off', autocapitalize: 'off',
      spellcheck: 'false', 'aria-label': 'Tu respuesta', placeholder: 'Escribe aquí',
      value: est.resp[k] || ''
    });
    inp.addEventListener('input', function () { guardarResp(k, inp.value); });
    return inp;
  }

  function pintarMatch(it, k) {
    var actual = est.resp[k] || {};
    var derechas = mezcla(it.pares.map(function (p) { return p[1]; }));
    var cont = h('div', { class: 'une' });
    it.pares.forEach(function (p, i) {
      var id = 'u-' + k + '-' + i;
      var sel = h('select', { id: id, class: 'hueco' },
        h('option', { value: '', text: 'Elige el significado…' }),
        derechas.map(function (d) { return h('option', { value: d, text: d }); }));
      if (actual[i]) { sel.value = actual[i]; }
      sel.addEventListener('change', function () {
        var nuevoR = Object.assign({}, est.resp[k] || {});
        nuevoR[i] = sel.value;
        guardarResp(k, nuevoR);
      });
      cont.appendChild(h('div', { class: 'une-fila' },
        h('label', { for: id, class: 'une-palabra', text: p[0] }), sel));
    });
    return cont;
  }

  function pintarOrder(it, k) {
    var cont = h('div', { class: 'orden' });
    function dibujar() {
      var elegidas = est.resp[k] || [];
      cont.textContent = '';
      var linea = h('div', { class: 'orden-linea', 'aria-label': 'Tu oración' });
      if (!elegidas.length) { linea.appendChild(h('span', { class: 'orden-vacio', text: 'Toca las palabras en orden' })); }
      elegidas.forEach(function (idx, pos) {
        linea.appendChild(h('button', {
          type: 'button', class: 'ficha puesta', 'aria-label': 'Quitar ' + it.fichas[idx],
          onclick: function () { var n = elegidas.slice(); n.splice(pos, 1); guardarResp(k, n); dibujar(); }
        }, it.fichas[idx]));
      });
      var banco = h('div', { class: 'orden-banco' });
      it.fichas.forEach(function (f, idx) {
        var usada = elegidas.indexOf(idx) !== -1;
        banco.appendChild(h('button', {
          type: 'button', class: 'ficha', disabled: usada,
          onclick: function () { guardarResp(k, elegidas.concat([idx])); dibujar(); }
        }, f));
      });
      cont.appendChild(linea);
      cont.appendChild(banco);
      if (elegidas.length) {
        cont.appendChild(h('button', {
          type: 'button', class: 'enlace-boton',
          onclick: function () { guardarResp(k, []); dibujar(); }
        }, 'Borrar y empezar de nuevo'));
      }
    }
    dibujar();
    return cont;
  }

  function pintarWrite(it, k, nombre) {
    var ta = h('textarea', {
      id: nombre, class: 'hueco escritura', rows: 7, 'aria-describedby': nombre + '-c',
      spellcheck: 'true', placeholder: 'Escribe tu texto en inglés'
    });
    ta.value = est.resp[k] || '';
    var cuenta = h('p', { id: nombre + '-c', class: 'cuenta', 'aria-live': 'polite' });
    function actualizar() {
      var n = contarPalabras(ta.value);
      cuenta.textContent = n + ' palabras · mínimo ' + it.min + (n >= it.min ? ' (listo)' : '');
      cuenta.classList.toggle('listo', n >= it.min);
    }
    ta.addEventListener('input', function () { guardarResp(k, ta.value); actualizar(); });
    actualizar();
    return h('div', { class: 'escribir' }, ta, cuenta);
  }

  function pintarItem(it, si, ii, num) {
    var k = clave(si, ii);
    var nombre = 'q-' + k.replace('.', '-');
    var cuerpo = [];
    var enunciado;

    if (it.audio) { cuerpo.push(controlAudio(it, k)); }

    if (it.t === 'match' || it.t === 'order' || it.t === 'write') {
      enunciado = it.q;
    } else {
      enunciado = it.q;
    }

    var etiqueta;
    if (it.t === 'mc') {
      etiqueta = h('p', { class: 'q', id: nombre + '-q' }, h('span', { class: 'num', text: num }), h('span', { text: enunciado }));
    } else if (it.t === 'fill' || it.t === 'write') {
      etiqueta = h('label', { class: 'q', for: nombre }, h('span', { class: 'num', text: num }), h('span', { text: enunciado }));
    } else {
      etiqueta = h('p', { class: 'q' }, h('span', { class: 'num', text: num }), h('span', { text: enunciado }));
    }

    var control;
    if (it.t === 'mc') { control = pintarMC(it, k, nombre); }
    else if (it.t === 'fill') { control = pintarFill(it, k, nombre); }
    else if (it.t === 'match') { control = pintarMatch(it, k); }
    else if (it.t === 'order') { control = pintarOrder(it, k); }
    else if (it.t === 'write') { control = pintarWrite(it, k, nombre); }

    return h('div', { class: 'pregunta pregunta-' + it.t, role: it.t === 'mc' ? 'group' : null, 'aria-labelledby': it.t === 'mc' ? nombre + '-q' : null }, etiqueta, cuerpo, control);
  }

  /* --------------------------------------------------------------- pantallas */
  function limpiar() { raiz.textContent = ''; }

  function pintarPasos() {
    if (!pasosEl) { return; }
    pasosEl.textContent = '';
    if (est.vista !== 'prueba') { pasosEl.hidden = true; return; }
    pasosEl.hidden = false;
    D.secciones.forEach(function (s, si) {
      var r = resumenPaso(si);
      var completo = r.hechas === r.total;
      var actual = si === est.paso;
      var li = h('li', { class: 'parada' + (actual ? ' actual' : '') + (completo ? ' completa' : '') },
        h('button', {
          type: 'button', 'aria-current': actual ? 'step' : null,
          'aria-label': 'Parada ' + (si + 1) + ', ' + s.titulo + (completo ? ', completa' : ', ' + r.hechas + ' de ' + r.total),
          onclick: function () { irA(si); }
        },
          h('span', { class: 'punto' }, completo && !actual ? svg(ICONO.ok) : String(si + 1)),
          h('span', { class: 'nombre', text: s.corto || s.titulo })));
      pasosEl.appendChild(li);
    });
  }

  function irA(si) {
    est.paso = Math.max(0, Math.min(D.secciones.length - 1, si));
    guardar();
    pantallaPrueba();
    window.scrollTo(0, 0);
    var t = raiz.querySelector('h2');
    if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
  }

  function pantallaIntro() {
    est.vista = 'intro';
    limpiar(); pintarPasos();
    var empezada = est.inicio && !est.fin;
    var totalItems = 0;
    D.secciones.forEach(function (s) { totalItems += s.items.length; });
    raiz.appendChild(h('section', { class: 'senal senal-ruta intro entra' },
      h('h1', { text: D.titulo }),
      h('p', { class: 'bajada', text: D.descripcion })));
    raiz.appendChild(h('section', { class: 'senal senal-blanca hoja entra' },
      h('h2', { text: 'Antes de empezar' }),
      h('ul', { class: 'reglas' },
        h('li', {}, h('strong', { text: 'Tiempo: ' }), 'unos ' + D.minutos + ' minutos. No hay un límite estricto.'),
        h('li', {}, h('strong', { text: 'Paradas: ' }), D.secciones.length + ' paradas con ' + totalItems + ' ejercicios en total.'),
        h('li', {}, h('strong', { text: 'Escucha: ' }), 'usa audífonos. Cada audio se puede oír ' + MAX_ESCUCHAS + ' veces.'),
        h('li', {}, h('strong', { text: 'Respuestas: ' }), 'puedes volver a una parada anterior y cambiarlas. Si no sabes, intenta, no resta puntos.'),
        h('li', {}, h('strong', { text: 'Avance: ' }), 'se guarda en este navegador, así que puedes cerrar y continuar después.')),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'boton boton-principal', onclick: empezar },
          empezada ? 'Continuar la prueba' : 'Empezar el diagnóstico', svg(ICONO.ir)),
        empezada ? h('button', { type: 'button', class: 'boton boton-claro', onclick: reiniciar }, 'Empezar de nuevo') : null),
      (tts ? null : h('p', { class: 'aviso aviso-error', role: 'alert' },
        'Tu navegador no puede reproducir voz en inglés. Podrás leer el texto de cada audio, pero se recomienda usar Chrome o Edge.')),
      h('label', { class: 'casilla casilla-audio' },
        h('input', { type: 'checkbox', checked: est.sinAudio ? true : null, onchange: function (e) { est.sinAudio = e.target.checked; guardar(); } }),
        h('span', { text: 'Mi dispositivo no reproduce audio en inglés. Mostrar el texto de cada audio.' }))));
    reloj();
  }

  function empezar() {
    if (!est.inicio) { est.inicio = Date.now(); }
    est.vista = 'prueba'; guardar();
    irA(est.paso || 0);
  }

  function reiniciar() {
    if (!window.confirm('Vas a borrar tus respuestas y empezar de cero. ¿Seguro?')) { return; }
    try { if (tts) { window.speechSynthesis.cancel(); } } catch (e) { /* nada */ }
    est = nuevo(); guardar(); pantallaIntro();
  }

  function pantallaPrueba() {
    est.vista = 'prueba';
    var si = est.paso;
    var s = D.secciones[si];
    limpiar(); pintarPasos();
    var r = resumenPaso(si);

    raiz.appendChild(h('section', { class: 'senal senal-ruta cabeza' },
      h('div', { class: 'cabeza-fila' },
        h('span', { class: 'escudo', 'aria-hidden': 'true', text: String(si + 1) }),
        h('div', {},
          h('h2', { text: s.titulo }),
          h('p', { class: 'instr', text: s.instr })))));

    var hoja = h('section', { class: 'senal senal-blanca hoja', 'aria-label': s.titulo });
    if (s.texto) {
      hoja.appendChild(h('div', { class: 'lectura' },
        s.textoTitulo ? h('p', { class: 'lectura-titulo', text: s.textoTitulo }) : null,
        s.texto.map(function (p) { return h('p', { text: p }); })));
    }
    var num = 0;
    s.items.forEach(function (it, ii) {
      num++;
      hoja.appendChild(pintarItem(it, si, ii, String(num)));
    });
    raiz.appendChild(hoja);

    var ultimo = si === D.secciones.length - 1;
    raiz.appendChild(h('nav', { class: 'navegacion', 'aria-label': 'Cambiar de parada' },
      h('button', {
        type: 'button', class: 'boton boton-fantasma', disabled: si === 0 ? true : null,
        onclick: function () { irA(si - 1); }
      }, svg(ICONO.atras), 'Anterior'),
      h('p', { class: 'avance', id: 'avance', 'aria-live': 'polite', text: r.hechas + ' de ' + r.total + ' respondidas' }),
      ultimo
        ? h('button', { type: 'button', class: 'boton boton-principal', onclick: pedirFin }, 'Terminar prueba', svg(ICONO.ok))
        : h('button', { type: 'button', class: 'boton boton-principal', onclick: function () { irA(si + 1); } }, 'Siguiente', svg(ICONO.ir))));
    reloj();
  }

  function pedirFin() {
    var sin = 0;
    D.secciones.forEach(function (s, si) {
      s.items.forEach(function (it, ii) { if (!respondido(it, est.resp[clave(si, ii)])) { sin++; } });
    });
    var msg = sin === 0
      ? 'Ya respondiste todo. ¿Quieres ver tu resultado?'
      : 'Te faltan ' + sin + ' ejercicios por responder. Los que queden vacíos cuentan como incorrectos. ¿Terminar de todos modos?';
    var dlg = document.getElementById('confirmar');
    if (dlg && typeof dlg.showModal === 'function') {
      dlg.querySelector('p').textContent = msg;
      dlg.showModal();
    } else if (window.confirm(msg)) {
      terminar();
    }
  }

  function terminar() {
    try { if (tts) { window.speechSynthesis.cancel(); } } catch (e) { /* nada */ }
    est.fin = Date.now(); est.vista = 'resultado'; guardar();
    guardarEnProgreso();
    pantallaResultado();
    window.scrollTo(0, 0);
  }

  /* Guarda el nivel en el progreso del alumno. La primera vez de cada nivel da XP. */
  function guardarEnProgreso() {
    var Pr = window.Progreso;
    if (!Pr) { return; }
    var c = calcular();
    var pct = c.max ? Math.round((c.total / c.max) * 100) : 0;
    Pr.cargar().then(function () {
      var primera = !Pr.datos.diag[D.id];
      Pr.datos.diag[D.id] = { nivel: nivelDe(pct).id, pct: pct, puntos: c.total, max: c.max, fecha: new Date().toLocaleDateString('en-CA') };
      Pr.registrarDia();
      if (primera) { Pr.sumarXP(Math.round(pct / 2) + 20, 'diagnostico'); }
      Pr.revisarLogros();
      Pr.guardarYa();
    });
  }

  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function duracion(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    return dos(Math.floor(s / 60)) + ':' + dos(s % 60);
  }
  var temporizador = null;
  function reloj() {
    if (temporizador) { window.clearInterval(temporizador); temporizador = null; }
    if (!relojEl) { return; }
    if (!est.inicio || est.fin) {
      relojEl.hidden = !(est.inicio && est.fin);
      if (est.inicio && est.fin) { relojEl.querySelector('span').textContent = duracion(est.fin - est.inicio); }
      return;
    }
    relojEl.hidden = false;
    function tic() { relojEl.querySelector('span').textContent = duracion(Date.now() - est.inicio); }
    tic();
    temporizador = window.setInterval(tic, 1000);
  }

  /* -------------------------------------------------------------- resultado */
  function textoItem(it) { return it.q; }

  function respuestaTexto(it, r) {
    if (it.t === 'mc') { return typeof r === 'number' ? it.o[r] : 'Sin responder'; }
    if (it.t === 'fill') { return r && String(r).trim() ? String(r) : 'Sin responder'; }
    if (it.t === 'order') {
      return (Array.isArray(r) && r.length) ? unir(r.map(function (i) { return it.fichas[i]; })) : 'Sin responder';
    }
    return '';
  }
  function correctaTexto(it) {
    if (it.t === 'mc') { return it.o[it.a]; }
    if (it.t === 'fill') { return it.a[0]; }
    if (it.t === 'order') { return it.a; }
    return '';
  }

  function filaRevision(it, r, num) {
    var ev = evaluar(it, r);
    var li = h('li', { class: 'rev ' + (ev.ok ? 'bien' : 'mal') });
    var marca = h('span', { class: 'marca' }, svg(ev.ok ? ICONO.ok : ICONO.mal),
      ev.ok ? 'Correcta' : (it.t === 'write' || it.t === 'match' ? ev.pts + ' de ' + ev.max : 'Por repasar'));
    li.appendChild(h('div', { class: 'rev-cabeza' }, h('span', { class: 'num', text: num }), h('p', { class: 'rev-q', text: textoItem(it) }), marca));

    if (it.t === 'match') {
      var rr = r || {};
      li.appendChild(h('ul', { class: 'rev-pares' }, it.pares.map(function (p, i) {
        var bien = rr[i] === p[1];
        return h('li', {},
          h('strong', { text: p[0] + ': ' }),
          bien ? p[1] : [h('span', { class: 'tachado', text: rr[i] || 'Sin responder' }), ' → ' + p[1]]);
      })));
    } else if (it.t === 'write') {
      li.appendChild(h('p', { class: 'rev-tu' }, h('strong', { text: 'Tu texto: ' }), (r && r.trim()) ? r : 'Sin responder'));
      li.appendChild(h('ul', { class: 'rev-checks' }, it.checks.map(function (c, i) {
        var pasa = ev.detalle.pasados[i];
        return h('li', { class: pasa ? 'bien' : 'mal' }, svg(pasa ? ICONO.ok : ICONO.mal), ' ' + c.label);
      })));
      li.appendChild(h('p', { class: 'rev-tu' }, h('strong', { text: 'Ejemplo de respuesta: ' }), it.modelo));
      li.appendChild(h('p', { class: 'nota', text: 'La revisión de la escritura es automática y aproximada: mira la longitud y si usaste lo que se pedía. Pide a tu profesor que la lea.' }));
    } else {
      if (!ev.ok) {
        li.appendChild(h('p', { class: 'rev-tu' }, h('strong', { text: 'Tu respuesta: ' }), respuestaTexto(it, r)));
      }
      li.appendChild(h('p', { class: 'rev-tu' }, h('strong', { text: 'Respuesta correcta: ' }), correctaTexto(it)));
    }
    if (it.e) { li.appendChild(h('p', { class: 'rev-e', text: it.e })); }
    return li;
  }

  function pantallaResultado() {
    est.vista = 'resultado';
    limpiar(); pintarPasos();
    var c = calcular();
    var pct = c.max ? Math.round((c.total / c.max) * 100) : 0;
    var nivel = nivelDe(pct);

    raiz.appendChild(h('section', { class: 'senal senal-ruta resultado entra' },
      h('div', { class: 'res-izq' },
        h('h1', { class: 'res-nivel', text: nivel.id }),
        h('p', { class: 'res-titulo', text: nivel.titulo })),
      h('div', { class: 'res-der' },
        h('p', { class: 'res-puntos' }, h('strong', { text: String(c.total) }), ' de ' + c.max + ' puntos'),
        h('p', { class: 'res-pct', text: pct + '% de aciertos' + (est.inicio && est.fin ? ' · ' + duracion(est.fin - est.inicio) + ' min' : '') }))));

    raiz.appendChild(h('section', { class: 'senal senal-blanca hoja entra' },
      h('h2', { text: 'Qué significa' }),
      h('p', { text: nivel.texto }),
      est.sinAudio ? h('p', { class: 'nota', text: 'Marcaste que tu dispositivo no reproduce audio. Si leíste el texto de la escucha, ese puntaje no mide tu comprensión auditiva.' }) : null,
      h('h2', { class: 'sub', text: 'Tu resultado por habilidad' }),
      h('ul', { class: 'habs' }, c.orden.map(function (nom) {
        var x = c.hab[nom];
        var p = x.max ? Math.round((x.pts / x.max) * 100) : 0;
        return h('li', {},
          h('div', { class: 'hab-fila' }, h('span', { class: 'hab-nom', text: nom }), h('span', { class: 'hab-val', text: x.pts + ' de ' + x.max })),
          h('div', { class: 'hab-barra', role: 'img', 'aria-label': nom + ': ' + p + '%' },
            h('span', { style: 'width:' + p + '%' })));
      })),
      h('p', { class: 'nota', text: 'Este resultado es una guía para ubicarte. Se guarda solo en este navegador.' }),
      h('div', { class: 'acciones' },
        h('a', { class: 'boton boton-principal', href: '/panel' }, 'Volver al panel', svg(ICONO.ir)),
        h('button', { type: 'button', class: 'boton boton-claro', onclick: reiniciar }, 'Repetir la prueba'))));

    var revision = h('section', { class: 'senal senal-blanca hoja revision' }, h('h2', { text: 'Revisa tus respuestas' }));
    D.secciones.forEach(function (s, si) {
      var lista = h('ol', { class: 'rev-lista' });
      s.items.forEach(function (it, ii) { lista.appendChild(filaRevision(it, est.resp[clave(si, ii)], String(ii + 1))); });
      var sec = resumenSeccion(si);
      revision.appendChild(h('details', { class: 'rev-sec' },
        h('summary', {}, h('span', { text: 'Parada ' + (si + 1) + ' · ' + s.titulo }), h('span', { class: 'rev-pts', text: sec.pts + ' de ' + sec.max })),
        s.texto ? h('div', { class: 'lectura' }, s.texto.map(function (p) { return h('p', { text: p }); })) : null,
        lista));
    });
    raiz.appendChild(revision);
    reloj();
  }

  function resumenSeccion(si) {
    var pts = 0, max = 0;
    D.secciones[si].items.forEach(function (it, ii) {
      var ev = evaluar(it, est.resp[clave(si, ii)]);
      pts += ev.pts; max += ev.max;
    });
    return { pts: pts, max: max };
  }

  /* ----------------------------------------------------------------- inicio */
  var dlg = document.getElementById('confirmar');
  if (dlg) {
    var si = dlg.querySelector('[data-si]');
    var no = dlg.querySelector('[data-no]');
    if (si) { si.addEventListener('click', function () { dlg.close(); terminar(); }); }
    if (no) { no.addEventListener('click', function () { dlg.close(); }); }
  }
  if (tts && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = function () { /* las voces cargan solas */ };
  }

  if (est.vista === 'resultado' && est.fin) { pantallaResultado(); }
  else if (est.vista === 'prueba' && est.inicio) { pantallaPrueba(); }
  else { pantallaIntro(); }
})();
