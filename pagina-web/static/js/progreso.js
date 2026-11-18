/* English Cundi - progreso del alumno.
   XP y niveles, racha de días, misiones diarias, logros, estadísticas y
   cuaderno de errores. Se guarda en el servidor (tabla progreso, un JSON por
   alumno) y, si no hay conexión, queda una copia en este navegador. */
(function (w) {
  'use strict';

  var COPIA = 'ec-progreso-copia';
  var token = '';
  var enLinea = true;
  var temporizador = null;
  var oyentes = [];

  function nuevo() {
    return {
      v: 1, xp: 0,
      racha: { actual: 0, mejor: 0, dia: null },
      logros: {},
      misiones: { dia: null, items: [], hechas: {}, cobradas: {} },
      stats: { correctas: 0, incorrectas: 0, segundos: 0, tarjetas: 0, limpiados: 0, modos: {}, temas: {} },
      errores: [], tarjetas: {}, records: {}, conv: { total: 0 }, diag: {}, plantillas: {}, pruebas: {}, pref: { nivel: 'A1' }
    };
  }

  var P = { datos: nuevo(), cargada: false };

  /* ------------------------------------------------------------ fechas */
  function hoy() { return new Date().toLocaleDateString('en-CA'); }
  function ayer() { var d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); }

  /* ---------------------------------------------------------- red / copia */
  function mezclar(base, extra) {
    // Rellena lo que falte sin perder lo guardado (por si cambia el formato).
    Object.keys(base).forEach(function (k) {
      if (extra[k] === undefined) { extra[k] = base[k]; }
      else if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof extra[k] === 'object') { mezclar(base[k], extra[k]); }
    });
    return extra;
  }

  P.cargar = function () {
    if (P.cargada) { return Promise.resolve(P.datos); }
    return w.fetch('/api/progreso', { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
      .then(function (r) { if (!r.ok) { throw new Error('http ' + r.status); } return r.json(); })
      .then(function (j) {
        token = j.token || '';
        P.nombre = j.nombre || '';
        P.datos = mezclar(nuevo(), j.datos || {});
        enLinea = true;
      })
      .catch(function () {
        enLinea = false;
        try { P.datos = mezclar(nuevo(), JSON.parse(w.localStorage.getItem(COPIA)) || {}); } catch (e) { P.datos = nuevo(); }
      })
      .then(function () { P.cargada = true; P.revisarDia(); return P.datos; });
  };

  P.guardar = function () {
    try { w.localStorage.setItem(COPIA, JSON.stringify(P.datos)); } catch (e) { /* sin almacenamiento */ }
    if (!enLinea) { return; }
    if (temporizador) { w.clearTimeout(temporizador); }
    temporizador = w.setTimeout(P.guardarYa, 700);
  };

  P.guardarYa = function () {
    temporizador = null;
    if (!enLinea) { return Promise.resolve(); }
    return w.fetch('/api/progreso', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSRF': token },
      body: JSON.stringify(P.datos)
    }).catch(function () { /* se reintenta en el próximo cambio */ });
  };

  w.addEventListener('pagehide', function () { if (temporizador) { P.guardarYa(); } });

  P.alCambiar = function (fn) { oyentes.push(fn); };
  function avisar(tipo, info) { oyentes.forEach(function (f) { try { f(tipo, info); } catch (e) { /* no frena */ } }); }

  /* ----------------------------------------------------------- avisos */
  P.aviso = function (texto, tipo) {
    var cont = document.getElementById('avisos-prog');
    if (!cont) {
      cont = document.createElement('div');
      cont.id = 'avisos-prog'; cont.className = 'avisos-prog';
      cont.setAttribute('role', 'status'); cont.setAttribute('aria-live', 'polite');
      document.body.appendChild(cont);
    }
    var el = document.createElement('p');
    el.className = 'aviso-prog' + (tipo ? ' ' + tipo : '');
    el.textContent = texto;
    cont.appendChild(el);
    w.setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, 4200);
  };

  /* -------------------------------------------------------------- nivel */
  function xpDeNivel(n) { return 50 * n * (n - 1); }   // nivel 2 = 100, 3 = 300, 4 = 600...
  P.infoNivel = function () {
    var xp = P.datos.xp, n = 1;
    while (xp >= xpDeNivel(n + 1)) { n++; }
    var desde = xpDeNivel(n), hasta = xpDeNivel(n + 1);
    return { nivel: n, xp: xp, desde: desde, hasta: hasta, pct: Math.round(((xp - desde) / (hasta - desde)) * 100) };
  };

  P.sumarXP = function (n, motivo, sinMisiones) {
    if (!n) { return; }
    var antes = P.infoNivel().nivel;
    P.datos.xp = Math.max(0, P.datos.xp + n);
    var despues = P.infoNivel().nivel;
    if (despues > antes) { P.aviso('¡Subiste al nivel ' + despues + '!', 'nivel'); }
    if (!sinMisiones && n > 0) { P.evento('xp', n); }
    P.revisarLogros();
    P.guardar();
    avisar('xp', { n: n, motivo: motivo });
  };

  /* -------------------------------------------------------------- racha */
  P.revisarDia = function () {
    var r = P.datos.racha, h = hoy();
    if (r.dia === h) { return; }
    // La racha solo se mantiene si ayer practicó; si no, empieza de nuevo al practicar hoy.
    if (r.dia && r.dia !== ayer()) { r.actual = 0; }
    P.misionesHoy();
  };

  P.registrarDia = function () {
    var r = P.datos.racha, h = hoy();
    if (r.dia === h) { return; }
    r.actual = (r.dia === ayer()) ? r.actual + 1 : 1;
    r.mejor = Math.max(r.mejor, r.actual);
    r.dia = h;
    P.revisarLogros();
    P.guardar();
  };

  /* ----------------------------------------------------------- misiones */
  var POOL = [
    { id: 'xp30', txt: 'Gana 30 XP', tipo: 'xp', meta: 30, premio: 15 },
    { id: 'ok10', txt: 'Acierta 10 preguntas', tipo: 'correct', meta: 10, premio: 20 },
    { id: 'cards8', txt: 'Repasa 8 tarjetas', tipo: 'cards', meta: 8, premio: 15 },
    { id: 'conv1', txt: 'Completa 1 conversación', tipo: 'mode:conversacion', meta: 1, premio: 20 },
    { id: 'surv1', txt: 'Juega 1 ronda de Survival', tipo: 'mode:survival', meta: 1, premio: 15 },
    { id: 'err3', txt: 'Repasa 3 errores del cuaderno', tipo: 'errors', meta: 3, premio: 20 },
    { id: 'word1', txt: 'Juega 1 Word Battle', tipo: 'mode:wordbattle', meta: 1, premio: 15 },
    { id: 'build3', txt: 'Ordena 3 oraciones', tipo: 'builder', meta: 3, premio: 15 },
    { id: 'rev4', txt: 'Traduce 4 frases', tipo: 'reverse', meta: 4, premio: 15 }
  ];
  P.POOL = POOL;

  P.misionesHoy = function () {
    var m = P.datos.misiones, h = hoy();
    if (m.dia !== h) {
      var semilla = 0, i;
      for (i = 0; i < h.length; i++) { semilla = (semilla * 31 + h.charCodeAt(i)) % 9973; }
      // Misma elección para todos el mismo día. Los pasos 2, 4, 5 y 7 no comparten
      // divisor con 9 (las misiones), así que nunca se repite una en el mismo día.
      var pasos = [2, 4, 5, 7], paso = pasos[semilla % pasos.length];
      var ids = [], idx = semilla % POOL.length;
      for (i = 0; i < 3; i++) { ids.push(POOL[idx].id); idx = (idx + paso) % POOL.length; }
      P.datos.misiones = { dia: h, items: ids, hechas: {}, cobradas: {} };
      P.guardar();
    }
    return P.datos.misiones.items.map(function (id) {
      var def = POOL.filter(function (x) { return x.id === id; })[0];
      var hecho = P.datos.misiones.hechas[id] || 0;
      return { id: id, txt: def.txt, meta: def.meta, premio: def.premio, hecho: Math.min(hecho, def.meta), lista: hecho >= def.meta, cobrada: !!P.datos.misiones.cobradas[id] };
    });
  };

  P.evento = function (tipo, cantidad) {
    var m = P.datos.misiones;
    if (m.dia !== hoy()) { P.misionesHoy(); m = P.datos.misiones; }
    m.items.forEach(function (id) {
      var def = POOL.filter(function (x) { return x.id === id; })[0];
      if (def.tipo !== tipo) { return; }
      m.hechas[id] = (m.hechas[id] || 0) + (cantidad || 1);
      if (m.hechas[id] >= def.meta && !m.cobradas[id]) {
        m.cobradas[id] = true;
        P.aviso('Misión cumplida: ' + def.txt + ' (+' + def.premio + ' XP)', 'mision');
        P.sumarXP(def.premio, 'mision', true);
      }
    });
    P.guardar();
  };

  /* -------------------------------------------------------------- logros */
  var LOGROS = [
    { id: 'primera', nombre: 'Primer paso', txt: 'Acierta tu primera pregunta', ok: function (d) { return d.stats.correctas >= 1; } },
    { id: 'diez', nombre: 'Diez aciertos', txt: 'Llega a 10 respuestas correctas', ok: function (d) { return d.stats.correctas >= 10; } },
    { id: 'cien', nombre: 'Cien aciertos', txt: 'Llega a 100 respuestas correctas', ok: function (d) { return d.stats.correctas >= 100; } },
    { id: 'racha3', nombre: 'Tres días seguidos', txt: 'Practica 3 días seguidos', ok: function (d) { return d.racha.mejor >= 3; } },
    { id: 'racha7', nombre: 'Una semana entera', txt: 'Practica 7 días seguidos', ok: function (d) { return d.racha.mejor >= 7; } },
    { id: 'survival10', nombre: 'Sobreviviente', txt: 'Acierta 10 seguidas en Survival', ok: function (d) { return (d.records.survival || 0) >= 10; } },
    { id: 'boss', nombre: 'Jefe vencido', txt: 'Aprueba un Boss Challenge', ok: function (d) { return !!(d.records.boss && (d.records.boss.A1 || d.records.boss.A2)); } },
    { id: 'conv3', nombre: 'Buen conversador', txt: 'Completa 3 conversaciones', ok: function (d) { return d.conv.total >= 3; } },
    { id: 'tarjetas30', nombre: 'Memoria de acero', txt: 'Repasa 30 tarjetas', ok: function (d) { return d.stats.tarjetas >= 30; } },
    { id: 'xp500', nombre: 'Medio millar', txt: 'Junta 500 XP', ok: function (d) { return d.xp >= 500; } },
    { id: 'limpio', nombre: 'Cuaderno al día', txt: 'Supera 5 errores del cuaderno', ok: function (d) { return d.stats.limpiados >= 5; } },
    { id: 'memoria', nombre: 'Buena memoria', txt: 'Completa un Memory Challenge', ok: function (d) { return !!d.records.memoria; } },
    { id: 'diag', nombre: 'Ya sé mi nivel', txt: 'Termina un diagnóstico', ok: function (d) { return Object.keys(d.diag).length > 0; } },
    { id: 'plantilla1', nombre: 'Buen estudiante', txt: 'Completa el primer tema de las plantillas', ok: function (d) { return Object.keys(d.plantillas || {}).length >= 1; } },
    { id: 'plantilla5', nombre: 'Estudiante aplicado', txt: 'Completa 5 temas de las plantillas', ok: function (d) { return Object.keys(d.plantillas || {}).length >= 5; } },
    { id: 'prueba', nombre: 'Conocimiento comprobado', txt: 'Aprueba una prueba de conocimiento', ok: function (d) { var p = d.pruebas || {}; return Object.keys(p).some(function (k) { return p[k].aprobada; }); } }
  ];
  P.LOGROS = LOGROS;

  P.revisarLogros = function () {
    LOGROS.forEach(function (l) {
      if (!P.datos.logros[l.id] && l.ok(P.datos)) {
        P.datos.logros[l.id] = hoy();
        P.aviso('Logro: ' + l.nombre, 'logro');
      }
    });
  };

  /* ---------------------------------------------------------- respuestas */
  function tema(t) {
    var s = P.datos.stats.temas;
    if (!s[t]) { s[t] = { ok: 0, total: 0 }; }
    return s[t];
  }
  function modo(m) {
    var s = P.datos.stats.modos;
    if (!s[m]) { s[m] = { jugadas: 0, ok: 0, total: 0, segundos: 0 }; }
    return s[m];
  }

  /* Registra una respuesta. info: { modo, tema, ok, xp } */
  P.respuesta = function (info) {
    P.registrarDia();
    var s = P.datos.stats, mo = modo(info.modo), te = tema(info.tema || 'General');
    mo.total++; te.total++;
    if (info.ok) {
      s.correctas++; mo.ok++; te.ok++;
      P.evento('correct', 1);
      P.sumarXP(info.xp === undefined ? 5 : info.xp, info.modo);
    } else {
      s.incorrectas++;
    }
    P.revisarLogros();
    P.guardar();
  };

  P.jugada = function (m) { modo(m).jugadas++; P.evento('mode:' + m, 1); P.registrarDia(); P.guardar(); };
  P.tiempo = function (m, segundos) {
    segundos = Math.max(0, Math.min(3600, Math.round(segundos)));
    P.datos.stats.segundos += segundos; modo(m).segundos += segundos; P.guardar();
  };
  P.record = function (clave, valor, mayor) {
    var r = P.datos.records;
    if (mayor === false) { r[clave] = valor; }
    else if (typeof valor === 'number') { if (!(r[clave] >= valor)) { r[clave] = valor; } }
    else { r[clave] = valor; }
    P.revisarLogros(); P.guardar();
  };

  /* --------------------------------------------------- cuaderno de errores */
  P.agregarError = function (preg, tuRespuesta, m) {
    var lista = P.datos.errores;
    var ya = lista.filter(function (e) { return e.p.id === preg.id && e.p.q === preg.q; })[0];
    if (ya) { ya.fallos = (ya.fallos || 1) + 1; ya.aciertos = 0; ya.tu = tuRespuesta; ya.fecha = hoy(); }
    else {
      lista.unshift({ p: { id: preg.id, t: preg.t, q: preg.q, o: preg.o, a: preg.a, e: preg.e, tema: preg.tema, texto: preg.texto, correcta: preg.correcta }, tu: tuRespuesta, modo: m, fallos: 1, aciertos: 0, fecha: hoy() });
      if (lista.length > 150) { lista.length = 150; }
    }
    P.guardar();
  };

  /* Al repasar: dos aciertos seguidos y la pregunta sale del cuaderno. */
  P.repasoError = function (indice, ok) {
    var e = P.datos.errores[indice];
    if (!e) { return false; }
    P.evento('errors', 1);
    if (ok) {
      e.aciertos = (e.aciertos || 0) + 1;
      if (e.aciertos >= 2) {
        P.datos.errores.splice(indice, 1);
        P.datos.stats.limpiados++;
        P.aviso('Error superado. Sale del cuaderno.', 'logro');
        P.sumarXP(10, 'cuaderno');
        P.guardar();
        return true;
      }
    } else { e.aciertos = 0; e.fallos = (e.fallos || 1) + 1; }
    P.guardar();
    return false;
  };

  w.Progreso = P;
})(window);
