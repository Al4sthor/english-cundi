/* English Cundi - celebraciones livianas (confeti) sin librerías.
   window.Fiesta.confeti() lanza confeti de colores de señal vial.
   Respeta "reducir movimiento": en ese caso no hace nada.
   Autor: David Estiven Sánchez Yomayuza */
(function (w) {
  'use strict';
  var COLORES = ['#ffc400', '#0a4fa8', '#ff6a13', '#f6f7f2', '#0f6a45'];
  var quieto = w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function confeti(cantidad) {
    if (quieto || !document.body) { return; }
    cantidad = cantidad || 70;
    var capa = document.createElement('div');
    capa.className = 'confeti';
    capa.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < cantidad; i++) {
      var p = document.createElement('i');
      var tam = 6 + Math.random() * 8;
      p.style.left = (Math.random() * 100) + 'vw';
      p.style.width = tam + 'px';
      p.style.height = (tam * (Math.random() < 0.5 ? 0.45 : 1)) + 'px';
      p.style.background = COLORES[i % COLORES.length];
      p.style.setProperty('--x', (Math.random() * 40 - 20) + 'vw');
      p.style.setProperty('--giro', (Math.random() * 900 - 450) + 'deg');
      p.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
      p.style.animationDelay = (Math.random() * 0.35) + 's';
      capa.appendChild(p);
    }
    document.body.appendChild(capa);
    w.setTimeout(function () { if (capa.parentNode) { capa.parentNode.removeChild(capa); } }, 3600);
  }

  w.Fiesta = { confeti: confeti };
})(window);
