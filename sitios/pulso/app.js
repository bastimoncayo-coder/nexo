/* Pulso — gimnasio ficticio · Sitio de demostración de Estudio Norte.
   Sin dependencias. Todo queda en este navegador: no hay envíos a servidores. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Utilidades
  ------------------------------------------------------------------ */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  var almacen = (function () {
    var disponible = false;
    try {
      var k = 'pulso:__prueba';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      disponible = true;
    } catch (e) { disponible = false; }
    return {
      disponible: disponible,
      leer: function (clave, porDefecto) {
        try {
          var v = window.localStorage.getItem('pulso:' + clave);
          return v === null ? porDefecto : JSON.parse(v);
        } catch (e) { return porDefecto; }
      },
      guardar: function (clave, valor) {
        try { window.localStorage.setItem('pulso:' + clave, JSON.stringify(valor)); return true; } catch (e) { return false; }
      }
    };
  })();

  function el(tag, attrs, hijos) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') n.textContent = attrs[k];
        else if (k === 'class') n.className = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== false) n.setAttribute(k, attrs[k]);
      });
    }
    (hijos || []).forEach(function (h) { if (h) n.appendChild(typeof h === 'string' ? document.createTextNode(h) : h); });
    return n;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hoyLocal() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function aISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function desdeISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
    return d;
  }
  function sumarDias(d, n) { var r = new Date(d); r.setDate(r.getDate() + n); return r; }
  function fechaLarga(d) { return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); }
  function fechaCorta(d) { return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }); }
  function minutos(hhmm) { var p = hhmm.split(':'); return (+p[0]) * 60 + (+p[1]); }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }

  var reducirMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Datos (de ejemplo)
  ------------------------------------------------------------------ */
  var DISCIPLINAS = {
    funcional: { nombre: 'Funcional', duracion: 50, sala: 'Box funcional' },
    spinning: { nombre: 'Spinning', duracion: 45, sala: 'Sala ciclo' },
    yoga: { nombre: 'Yoga', duracion: 60, sala: 'Estudio' },
    boxeo: { nombre: 'Boxeo', duracion: 60, sala: 'Ring' },
    hiit: { nombre: 'HIIT', duracion: 30, sala: 'Box funcional' },
    movilidad: { nombre: 'Movilidad', duracion: 40, sala: 'Estudio' }
  };
  var ENTRENADORES = { fernanda: 'Fernanda', matias: 'Matías', catalina: 'Catalina', tomas: 'Tomás' };

  var DIAS = [
    { clave: 'lun', nombre: 'Lunes', js: 1, abre: '06:30', cierra: '22:30' },
    { clave: 'mar', nombre: 'Martes', js: 2, abre: '06:30', cierra: '22:30' },
    { clave: 'mie', nombre: 'Miércoles', js: 3, abre: '06:30', cierra: '22:30' },
    { clave: 'jue', nombre: 'Jueves', js: 4, abre: '06:30', cierra: '22:30' },
    { clave: 'vie', nombre: 'Viernes', js: 5, abre: '06:30', cierra: '22:30' },
    { clave: 'sab', nombre: 'Sábado', js: 6, abre: '08:00', cierra: '20:00' },
    { clave: 'dom', nombre: 'Domingo', js: 0, abre: '09:00', cierra: '14:00' }
  ];
  var DIA_POR_JS = {}; DIAS.forEach(function (d) { DIA_POR_JS[d.js] = d; });
  var DIA_POR_CLAVE = {}; DIAS.forEach(function (d) { DIA_POR_CLAVE[d.clave] = d; });

  // [día, hora, disciplina, entrenador]
  var AGENDA_BASE = [
    ['lun', '07:00', 'spinning', 'tomas'], ['lun', '08:00', 'funcional', 'fernanda'], ['lun', '12:30', 'hiit', 'fernanda'],
    ['lun', '18:00', 'boxeo', 'matias'], ['lun', '19:15', 'funcional', 'fernanda'], ['lun', '20:30', 'spinning', 'tomas'],
    ['mar', '07:00', 'funcional', 'fernanda'], ['mar', '09:00', 'yoga', 'catalina'], ['mar', '13:00', 'movilidad', 'catalina'],
    ['mar', '18:30', 'hiit', 'tomas'], ['mar', '19:30', 'boxeo', 'matias'], ['mar', '20:45', 'yoga', 'catalina'],
    ['mie', '07:00', 'spinning', 'tomas'], ['mie', '08:00', 'funcional', 'fernanda'], ['mie', '12:30', 'hiit', 'fernanda'],
    ['mie', '18:00', 'boxeo', 'matias'], ['mie', '19:15', 'spinning', 'tomas'], ['mie', '20:30', 'movilidad', 'catalina'],
    ['jue', '07:00', 'funcional', 'fernanda'], ['jue', '09:00', 'yoga', 'catalina'], ['jue', '13:00', 'movilidad', 'catalina'],
    ['jue', '18:30', 'hiit', 'tomas'], ['jue', '19:30', 'boxeo', 'matias'], ['jue', '20:45', 'funcional', 'fernanda'],
    ['vie', '07:00', 'spinning', 'tomas'], ['vie', '08:00', 'funcional', 'fernanda'], ['vie', '12:30', 'hiit', 'fernanda'],
    ['vie', '18:00', 'boxeo', 'matias'], ['vie', '19:15', 'yoga', 'catalina'],
    ['sab', '09:00', 'funcional', 'fernanda'], ['sab', '10:15', 'spinning', 'tomas'], ['sab', '11:30', 'yoga', 'catalina'], ['sab', '13:00', 'boxeo', 'matias'],
    ['dom', '10:00', 'yoga', 'catalina'], ['dom', '11:30', 'movilidad', 'catalina']
  ];

  var CLASES = AGENDA_BASE.map(function (c) {
    var disc = DISCIPLINAS[c[2]];
    var inicio = minutos(c[1]);
    return {
      id: c[0] + '-' + c[1].replace(':', '') + '-' + c[2],
      dia: c[0], hora: c[1], fin: hhmm(inicio + disc.duracion), inicio: inicio,
      disc: c[2], entrenador: ENTRENADORES[c[3]], duracion: disc.duracion, sala: disc.sala
    };
  }).sort(function (a, b) { return a.inicio - b.inicio; });
  var CLASE_POR_ID = {}; CLASES.forEach(function (c) { CLASE_POR_ID[c.id] = c; });

  var PLANES = {
    libre: { nombre: 'Libre', mensual: 27990 },
    clases: { nombre: 'Clases', mensual: 32990 },
    full: { nombre: 'Full', mensual: 41990 },
    estudiante: { nombre: 'Estudiante', mensual: 22990 }
  };
  var PERIODOS = {
    mensual: { meses: 1, dcto: 0, nombre: 'mensual', texto: '(pago mensual)' },
    semestral: { meses: 6, dcto: 0.10, nombre: 'semestral', texto: '(pago semestral, −10%)' },
    anual: { meses: 12, dcto: 0.20, nombre: 'anual', texto: '(pago anual, −20%)' }
  };
  // Valor mensual equivalente redondeado a precio terminado en 990.
  function precioMensual(plan, periodo) {
    var p = PERIODOS[periodo];
    if (!p.dcto) return plan.mensual;
    return Math.round(plan.mensual * (1 - p.dcto) / 1000) * 1000 - 10;
  }

  /* ------------------------------------------------------------------
     Menú móvil
  ------------------------------------------------------------------ */
  (function menu() {
    var boton = $('#menu-boton');
    var nav = $('#nav-principal');
    if (!boton || !nav) return;
    var texto = $('.menu-boton__texto', boton);
    function abrir(v) {
      boton.setAttribute('aria-expanded', v ? 'true' : 'false');
      nav.classList.toggle('abierto', v);
      texto.textContent = v ? 'Cerrar' : 'Menú';
    }
    boton.addEventListener('click', function () { abrir(boton.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') { abrir(false); boton.focus(); }
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) abrir(false); });
    document.addEventListener('click', function (e) {
      if (boton.getAttribute('aria-expanded') === 'true' && !nav.contains(e.target) && !boton.contains(e.target)) abrir(false);
    });
    var mq = window.matchMedia('(min-width: 960px)');
    var alCambiar = function () { if (mq.matches) abrir(false); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar); else if (mq.addListener) mq.addListener(alCambiar);
  })();

  /* ------------------------------------------------------------------
     Precios: conmutador mensual / semestral / anual
  ------------------------------------------------------------------ */
  (function precios() {
    var radios = $$('input[name="periodo"]');
    var anuncio = $('#precios-anuncio');
    if (!radios.length) return;
    var primeraVez = true;

    function pintar(periodo) {
      var p = PERIODOS[periodo] || PERIODOS.mensual;
      $$('.plan[data-plan]').forEach(function (card) {
        var plan = PLANES[card.getAttribute('data-plan')];
        var mensual = precioMensual(plan, periodo);
        var monto = $('[data-monto]', card);
        var nota = $('[data-nota]', card);
        monto.textContent = clp.format(mensual);
        if (!primeraVez && !reducirMovimiento) { monto.classList.remove('cambio'); void monto.offsetWidth; monto.classList.add('cambio'); }
        nota.textContent = '';
        if (p.meses === 1) {
          nota.textContent = 'Pagas mes a mes. Sin matrícula.';
        } else {
          var total = mensual * p.meses;
          var ahorro = (plan.mensual - mensual) * p.meses;
          nota.appendChild(document.createTextNode('Un pago de ' + clp.format(total) + ' cada ' + (p.meses === 6 ? '6 meses' : '12 meses') + '. '));
          nota.appendChild(el('strong', { text: 'Ahorras ' + clp.format(ahorro) + '.' }));
        }
      });
      $$('[data-precio-tabla]').forEach(function (td) {
        td.textContent = clp.format(precioMensual(PLANES[td.getAttribute('data-precio-tabla')], periodo));
      });
      var txt = $('[data-periodo-texto]');
      if (txt) txt.textContent = p.texto;
      if (anuncio && !primeraVez) {
        anuncio.textContent = 'Precios con pago ' + p.nombre + ': ' + Object.keys(PLANES).map(function (k) {
          return PLANES[k].nombre + ' ' + clp.format(precioMensual(PLANES[k], periodo)) + ' al mes';
        }).join(', ') + '.';
      }
      primeraVez = false;
    }

    var guardado = almacen.leer('periodo', 'mensual');
    if (!PERIODOS[guardado]) guardado = 'mensual';
    radios.forEach(function (r) {
      r.checked = r.value === guardado;
      r.addEventListener('change', function () {
        if (!r.checked) return;
        pintar(r.value);
        almacen.guardar('periodo', r.value);
      });
    });
    pintar(guardado);
  })();

  /* ------------------------------------------------------------------
     Horarios filtrables (estado en la URL + localStorage)
  ------------------------------------------------------------------ */
  var agenda = (function horarios() {
    var cont = $('#agenda');
    var resumen = $('#agenda-resumen');
    var limpiar = $('#limpiar-filtros');
    if (!cont) return null;
    var DIAS_VALIDOS = ['todos'].concat(DIAS.map(function (d) { return d.clave; }));
    var ACT_VALIDAS = ['todas'].concat(Object.keys(DISCIPLINAS));
    var estado = { dia: 'todos', actividad: 'todas' };

    function leerEstadoInicial() {
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
      var dia = params && params.get('dia');
      var act = params && params.get('actividad');
      if (dia || act) {
        return {
          dia: DIAS_VALIDOS.indexOf(dia) >= 0 ? dia : 'todos',
          actividad: ACT_VALIDAS.indexOf(act) >= 0 ? act : 'todas'
        };
      }
      var g = almacen.leer('filtros', null);
      if (g && typeof g === 'object') {
        return {
          dia: DIAS_VALIDOS.indexOf(g.dia) >= 0 ? g.dia : 'todos',
          actividad: ACT_VALIDAS.indexOf(g.actividad) >= 0 ? g.actividad : 'todas'
        };
      }
      return { dia: 'todos', actividad: 'todas' };
    }

    function persistir() {
      almacen.guardar('filtros', estado);
      try {
        var url = new URL(window.location.href);
        if (estado.dia === 'todos') url.searchParams.delete('dia'); else url.searchParams.set('dia', estado.dia);
        if (estado.actividad === 'todas') url.searchParams.delete('actividad'); else url.searchParams.set('actividad', estado.actividad);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
      } catch (e) { /* file:// u otros contextos: basta con localStorage */ }
    }

    function sincronizarControles() {
      $$('input[name="dia"]').forEach(function (r) { r.checked = r.value === estado.dia; });
      $$('input[name="actividad"]').forEach(function (r) { r.checked = r.value === estado.actividad; });
      limpiar.hidden = estado.dia === 'todos' && estado.actividad === 'todas';
    }

    function filtrar() {
      return CLASES.filter(function (c) {
        return (estado.dia === 'todos' || c.dia === estado.dia) && (estado.actividad === 'todas' || c.disc === estado.actividad);
      });
    }

    function itemClase(c) {
      var d = DISCIPLINAS[c.disc];
      var diaNombre = DIA_POR_CLAVE[c.dia].nombre.toLowerCase();
      return el('li', { class: 'clase', 'data-disc': c.disc }, [
        el('p', { class: 'clase__hora' }, [
          el('time', { text: c.hora }),
          el('span', { class: 'clase__fin' }, [el('span', { class: 'solo-lectores', text: ' a ' }), document.createTextNode('–' + c.fin)])
        ]),
        el('p', { class: 'clase__nombre', text: d.nombre }),
        el('p', { class: 'clase__meta', text: c.entrenador + ' · ' + c.duracion + ' min · ' + c.sala }),
        el('button', {
          type: 'button', class: 'clase__cta', 'data-clase': c.id,
          'aria-label': 'Pedir clase de prueba: ' + d.nombre + ', ' + diaNombre + ' a las ' + c.hora
        }, ['Pedir prueba'])
      ]);
    }

    function render() {
      var lista = filtrar();
      var hoyClave = DIA_POR_JS[new Date().getDay()].clave;
      cont.innerHTML = '';
      cont.setAttribute('data-vista', estado.dia === 'todos' ? 'semana' : 'dia');
      var nombreAct = estado.actividad === 'todas' ? null : DISCIPLINAS[estado.actividad].nombre;
      var nombreDia = estado.dia === 'todos' ? null : DIA_POR_CLAVE[estado.dia].nombre;

      // Resumen
      var txt = lista.length + (lista.length === 1 ? ' clase' : ' clases');
      if (nombreAct) txt += ' de ' + nombreAct;
      txt += nombreDia ? ' el ' + nombreDia.toLowerCase() : ' en toda la semana';
      resumen.textContent = lista.length ? txt + '.' : 'Sin clases para este filtro.';

      if (!lista.length) {
        var diasCon = DIAS.filter(function (d) {
          return CLASES.some(function (c) { return c.dia === d.clave && (estado.actividad === 'todas' || c.disc === estado.actividad); });
        });
        var acciones = el('div', { class: 'agenda-vacio__acciones' });
        if (nombreAct) {
          acciones.appendChild(el('button', { type: 'button', class: 'btn btn--tinta btn--chico', 'data-set-dia': 'todos' }, ['Ver ' + nombreAct + ' toda la semana']));
          acciones.appendChild(el('button', { type: 'button', class: 'btn btn--tinta btn--chico', 'data-set-act': 'todas' }, ['Ver todo el ' + nombreDia.toLowerCase()]));
        }
        cont.appendChild(el('div', { class: 'agenda-vacio', role: 'status' }, [
          svgVacio(),
          el('h3', { class: 'agenda-vacio__titulo', text: 'Sin clases de ' + (nombreAct || 'este tipo') + ' el ' + (nombreDia || '').toLowerCase() }),
          el('p', { text: diasCon.length ? nombreAct + ' se dicta ' + listaHumana(diasCon.map(function (d) { return d.nombre.toLowerCase(); })) + '. La sala de musculación sí está abierta ese día.' : 'Prueba con otro filtro.' }),
          acciones
        ]));
        return;
      }

      var grid = el('div', { class: 'agenda__dias' });
      DIAS.forEach(function (d) {
        if (estado.dia !== 'todos' && d.clave !== estado.dia) return;
        var delDia = lista.filter(function (c) { return c.dia === d.clave; });
        var esHoy = d.clave === hoyClave;
        var cab = el('div', { class: 'dia__cab' }, [
          el('h3', { class: 'dia__nombre' }, [d.nombre, esHoy ? el('span', { class: 'dia__hoy', text: 'Hoy' }) : null]),
          el('p', { class: 'dia__info', text: d.abre + '–' + d.cierra })
        ]);
        var cuerpo;
        if (delDia.length) {
          cuerpo = el('ol', { class: 'dia__lista' }, delDia.map(itemClase));
        } else {
          cuerpo = el('p', { class: 'dia__sin', text: nombreAct ? 'Sin ' + nombreAct + ' este día.' : 'Sin clases.' });
        }
        grid.appendChild(el('section', { class: 'dia' + (esHoy ? ' dia--hoy' : ''), 'aria-label': d.nombre + (esHoy ? ' (hoy)' : '') }, [cab, cuerpo]));
      });
      cont.appendChild(grid);
    }

    function svgVacio() {
      var ns = 'http://www.w3.org/2000/svg';
      var s = document.createElementNS(ns, 'svg');
      s.setAttribute('viewBox', '0 0 120 60'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', 'M0 34h50M70 34h50');
      p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '4'); p.setAttribute('stroke-linecap', 'round');
      var c = document.createElementNS(ns, 'circle');
      c.setAttribute('cx', '60'); c.setAttribute('cy', '34'); c.setAttribute('r', '6'); c.setAttribute('fill', 'currentColor');
      s.appendChild(p); s.appendChild(c);
      return s;
    }

    function listaHumana(arr) {
      if (arr.length <= 1) return arr.join('');
      return arr.slice(0, -1).join(', ') + ' y ' + arr[arr.length - 1];
    }

    function fijar(nuevo, opciones) {
      if (nuevo.dia) estado.dia = nuevo.dia;
      if (nuevo.actividad) estado.actividad = nuevo.actividad;
      sincronizarControles();
      render();
      persistir();
      if (opciones && opciones.irA) {
        var sec = $('#horarios');
        sec.scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth', block: 'start' });
        var r = $('input[name="actividad"]:checked');
        if (r) r.focus({ preventScroll: true });
      }
    }

    $$('input[name="dia"]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) fijar({ dia: r.value }); }); });
    $$('input[name="actividad"]').forEach(function (r) { r.addEventListener('change', function () { if (r.checked) fijar({ actividad: r.value }); }); });
    limpiar.addEventListener('click', function () { fijar({ dia: 'todos', actividad: 'todas' }); $('#dia-todos').focus(); });

    cont.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.hasAttribute('data-set-dia')) { fijar({ dia: b.getAttribute('data-set-dia') }); $('input[name="dia"]:checked').focus(); }
      else if (b.hasAttribute('data-set-act')) { fijar({ actividad: b.getAttribute('data-set-act') }); $('input[name="actividad"]:checked').focus(); }
    });

    $$('[data-ver-horario]').forEach(function (b) {
      b.addEventListener('click', function () { fijar({ actividad: b.getAttribute('data-ver-horario'), dia: 'todos' }, { irA: true }); });
    });

    estado = leerEstadoInicial();
    sincronizarControles();
    render();
    persistir();

    var total = $('[data-total-clases]');
    if (total) total.textContent = String(CLASES.length);

    return { contenedor: cont };
  })();

  /* ------------------------------------------------------------------
     Solicitudes de clase de prueba
  ------------------------------------------------------------------ */
  var solicitudes = (function () {
    var datos = almacen.leer('solicitudes', []);
    if (!Array.isArray(datos)) datos = [];
    datos = datos.filter(function (s) { return s && typeof s === 'object' && s.id && s.claseId && s.fecha; });
    return {
      todas: function () { return datos.slice(); },
      agregar: function (s) { datos.push(s); return almacen.guardar('solicitudes', datos); },
      actualizar: function (id, cambios) {
        datos = datos.map(function (s) { return s.id === id ? Object.assign({}, s, cambios) : s; });
        almacen.guardar('solicitudes', datos);
      },
      quitar: function (id) { datos = datos.filter(function (s) { return s.id !== id; }); almacen.guardar('solicitudes', datos); },
      recargar: function () { var d = almacen.leer('solicitudes', []); datos = Array.isArray(d) ? d : []; }
    };
  })();

  function clasesPara(disc, fecha) {
    if (!disc || !fecha) return [];
    var dia = DIA_POR_JS[fecha.getDay()];
    var esHoy = fecha.getTime() === hoyLocal().getTime();
    var ahora = new Date();
    var minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    return CLASES.filter(function (c) {
      return c.dia === dia.clave && c.disc === disc && (!esHoy || c.inicio > minAhora);
    });
  }

  function proximasFechas(disc, max) {
    var res = [];
    var base = hoyLocal();
    for (var i = 0; i <= 30 && res.length < max; i++) {
      var f = sumarDias(base, i);
      if (clasesPara(disc, f).length) res.push(f);
    }
    return res;
  }

  /* ------------------------------------------------------------------
     Formulario
  ------------------------------------------------------------------ */
  (function formulario() {
    var form = $('#form-prueba');
    if (!form) return;
    var f = {
      nombre: $('#f-nombre'), correo: $('#f-correo'), telefono: $('#f-telefono'),
      disciplina: $('#f-disciplina'), fecha: $('#f-fecha'), horario: $('#f-horario'),
      plan: $('#f-plan'), comentario: $('#f-comentario'), acepto: $('#f-acepto')
    };
    var nivelRadios = $$('input[name="nivel"]', form);
    var resumenErr = $('#resumen-errores');
    var resumenLista = $('#resumen-errores-lista');
    var ayudaHorario = $('#f-horario-ayuda');
    var sugerencias = $('#sugerencias-fechas');
    var enviar = $('#f-enviar');
    var confirmacion = $('#confirmacion');
    var intentado = false;

    function limites() {
      var min = hoyLocal();
      return { min: min, max: sumarDias(min, 30) };
    }
    function aplicarLimites() {
      var l = limites();
      f.fecha.min = aISO(l.min);
      f.fecha.max = aISO(l.max);
    }
    aplicarLimites();

    /* --- Normalización de teléfono chileno --- */
    function normalizarTelefono(v) {
      var limpio = String(v || '').replace(/[\s().-]/g, '');
      var m = /^(?:\+?56)?(9\d{8}|[2-8]\d{8})$/.exec(limpio);
      if (!m) return null;
      var n = m[1];
      if (n.charAt(0) === '9') return '+56 9 ' + n.slice(1, 5) + ' ' + n.slice(5);
      if (n.charAt(0) === '2') return '+56 2 ' + n.slice(1, 5) + ' ' + n.slice(5);
      return '+56 ' + n.slice(0, 2) + ' ' + n.slice(2, 5) + ' ' + n.slice(5);
    }

    /* --- Selector de horario dependiente --- */
    function actualizarHorarios(preferido) {
      var disc = f.disciplina.value;
      var fecha = desdeISO(f.fecha.value);
      var l = limites();
      var previo = preferido || f.horario.value;
      f.horario.innerHTML = '';
      sugerencias.hidden = true;
      sugerencias.innerHTML = '';

      if (!disc || !fecha) {
        f.horario.appendChild(el('option', { value: '', text: 'Primero elige disciplina y fecha' }));
        f.horario.disabled = true;
        ayudaHorario.textContent = 'Se llena según la disciplina y la fecha que elijas.';
        if (disc && !fecha) mostrarSugerencias(disc);
        return;
      }
      if (fecha < l.min || fecha > l.max) {
        f.horario.appendChild(el('option', { value: '', text: 'Elige una fecha válida' }));
        f.horario.disabled = true;
        ayudaHorario.textContent = 'La fecha debe estar entre hoy y los próximos 30 días.';
        mostrarSugerencias(disc);
        return;
      }
      var lista = clasesPara(disc, fecha);
      var nombre = DISCIPLINAS[disc].nombre;
      if (!lista.length) {
        f.horario.appendChild(el('option', { value: '', text: 'No hay clases de ' + nombre + ' ese día' }));
        f.horario.disabled = true;
        var esHoy = fecha.getTime() === l.min.getTime();
        ayudaHorario.textContent = esHoy && CLASES.some(function (c) { return c.dia === DIA_POR_JS[fecha.getDay()].clave && c.disc === disc; })
          ? 'Las clases de ' + nombre + ' de hoy ya empezaron. Elige otra fecha.'
          : 'El ' + fechaLarga(fecha) + ' no hay ' + nombre + '. Prueba con una de estas fechas:';
        mostrarSugerencias(disc);
        return;
      }
      f.horario.disabled = false;
      f.horario.appendChild(el('option', { value: '', text: 'Elige un horario (' + lista.length + (lista.length === 1 ? ' disponible)' : ' disponibles)') }));
      lista.forEach(function (c) {
        f.horario.appendChild(el('option', { value: c.id, text: c.hora + '–' + c.fin + ' · ' + nombre + ' con ' + c.entrenador }));
      });
      if (previo && lista.some(function (c) { return c.id === previo; })) f.horario.value = previo;
      else if (lista.length === 1) f.horario.value = lista[0].id;
      ayudaHorario.textContent = lista.length + (lista.length === 1 ? ' clase' : ' clases') + ' de ' + nombre + ' el ' + fechaLarga(fecha) + '.';
    }

    function mostrarSugerencias(disc) {
      var fechas = proximasFechas(disc, 4);
      sugerencias.innerHTML = '';
      if (!fechas.length) { sugerencias.hidden = true; return; }
      sugerencias.appendChild(el('p', { class: 'sugerencias__txt', text: 'Próximas fechas con ' + DISCIPLINAS[disc].nombre + ':' }));
      fechas.forEach(function (d) {
        sugerencias.appendChild(el('button', { type: 'button', class: 'sugerencia', 'data-fecha': aISO(d), 'aria-label': 'Usar ' + fechaLarga(d) }, [fechaCorta(d)]));
      });
      sugerencias.hidden = false;
    }

    sugerencias.addEventListener('click', function (e) {
      var b = e.target.closest('[data-fecha]');
      if (!b) return;
      f.fecha.value = b.getAttribute('data-fecha');
      actualizarHorarios();
      if (intentado) { validarCampo('fecha'); validarCampo('horario'); }
      if (!f.horario.disabled) f.horario.focus(); else f.fecha.focus();
    });

    f.disciplina.addEventListener('change', function () { actualizarHorarios(); if (intentado) { validarCampo('disciplina'); validarCampo('horario'); } });
    f.fecha.addEventListener('change', function () { actualizarHorarios(); if (intentado) { validarCampo('fecha'); validarCampo('horario'); } });
    f.fecha.addEventListener('input', function () { actualizarHorarios(); });

    /* --- Validación --- */
    var VALIDADORES = {
      nombre: function () {
        var v = f.nombre.value.trim().replace(/\s+/g, ' ');
        if (!v) return 'Escribe tu nombre.';
        if (v.length < 3 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ].*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(v)) return 'El nombre es demasiado corto.';
        if (/[0-9@<>{}]/.test(v)) return 'El nombre solo puede tener letras, espacios, apóstrofos o guiones.';
        return '';
      },
      correo: function () {
        var v = f.correo.value.trim();
        if (!v) return 'Escribe tu correo electrónico.';
        if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(v) || /\.\./.test(v)) return 'Revisa el correo: debe tener la forma nombre@dominio.cl.';
        return '';
      },
      telefono: function () {
        var v = f.telefono.value.trim();
        if (!v) return 'Escribe tu teléfono.';
        if (!normalizarTelefono(v)) return 'Ingresa un teléfono chileno válido, por ejemplo +56 9 1234 5678.';
        return '';
      },
      disciplina: function () {
        if (!f.disciplina.value || !DISCIPLINAS[f.disciplina.value]) return 'Elige una disciplina.';
        return '';
      },
      fecha: function () {
        var v = f.fecha.value;
        if (!v) return 'Elige una fecha.';
        var d = desdeISO(v);
        if (!d) return 'La fecha no es válida.';
        var l = limites();
        if (d < l.min) return 'La fecha ya pasó. Elige hoy o un día posterior.';
        if (d > l.max) return 'Solo puedes pedir clases hasta el ' + fechaLarga(l.max) + ' (30 días).';
        return '';
      },
      horario: function () {
        var disc = f.disciplina.value;
        var d = desdeISO(f.fecha.value);
        if (!disc || !d || VALIDADORES.fecha()) return 'Elige disciplina y una fecha válida para ver los horarios.';
        var disponibles = clasesPara(disc, d);
        if (!disponibles.length) return 'No hay clases de ' + DISCIPLINAS[disc].nombre + ' disponibles ese día. Elige otra fecha.';
        var id = f.horario.value;
        if (!id) return 'Elige un horario.';
        if (!disponibles.some(function (c) { return c.id === id; })) return 'Ese horario no existe para la disciplina y fecha elegidas.';
        var dup = solicitudes.todas().some(function (s) { return s.estado !== 'anulada' && s.claseId === id && s.fecha === f.fecha.value; });
        if (dup) return 'Ya tienes una solicitud para esa clase. Elige otro horario o anula la anterior.';
        return '';
      },
      nivel: function () {
        return nivelRadios.some(function (r) { return r.checked; }) ? '' : 'Cuéntanos tu nivel.';
      },
      acepto: function () {
        return f.acepto.checked ? '' : 'Debes marcar esta casilla para guardar la solicitud.';
      }
    };
    var ORDEN = ['nombre', 'correo', 'telefono', 'disciplina', 'fecha', 'horario', 'nivel', 'acepto'];
    var ETIQUETAS = { nombre: 'Nombre', correo: 'Correo', telefono: 'Teléfono', disciplina: 'Disciplina', fecha: 'Fecha', horario: 'Clase y horario', nivel: 'Nivel', acepto: 'Condiciones de la demostración' };

    function controlDe(clave) {
      if (clave === 'nivel') return nivelRadios[0];
      return f[clave];
    }
    function marcar(clave, msg) {
      var err = $('#f-' + clave + '-error');
      if (err) err.textContent = msg;
      if (clave === 'nivel') {
        nivelRadios.forEach(function (r) { if (msg) r.setAttribute('aria-invalid', 'true'); else r.removeAttribute('aria-invalid'); });
        nivelRadios.forEach(function (r) { r.setAttribute('aria-describedby', 'f-nivel-error'); });
      } else {
        var c = f[clave];
        if (msg) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
      }
    }
    function validarCampo(clave) {
      var msg = VALIDADORES[clave]();
      marcar(clave, msg);
      if (intentado) actualizarResumen();
      return msg;
    }
    function actualizarResumen(errores) {
      if (!errores) {
        errores = ORDEN.map(function (k) { return [k, $('#f-' + k + '-error').textContent]; }).filter(function (x) { return x[1]; });
      }
      resumenLista.innerHTML = '';
      if (!errores.length) { resumenErr.hidden = true; return; }
      errores.forEach(function (x) {
        var destino = controlDe(x[0]);
        var a = el('a', { href: '#' + destino.id, text: ETIQUETAS[x[0]] + ': ' + x[1] });
        a.addEventListener('click', function (e) { e.preventDefault(); destino.focus(); });
        resumenLista.appendChild(el('li', null, [a]));
      });
      resumenErr.hidden = false;
    }

    ['nombre', 'correo', 'telefono'].forEach(function (k) {
      f[k].addEventListener('blur', function () { if (intentado || f[k].value.trim()) validarCampo(k); });
      f[k].addEventListener('input', function () { if (f[k].getAttribute('aria-invalid') === 'true') validarCampo(k); });
    });
    f.telefono.addEventListener('blur', function () {
      var n = normalizarTelefono(f.telefono.value);
      if (n) f.telefono.value = n;
    });
    f.horario.addEventListener('change', function () { if (intentado) validarCampo('horario'); });
    nivelRadios.forEach(function (r) { r.addEventListener('change', function () { if (intentado) validarCampo('nivel'); }); });
    f.acepto.addEventListener('change', function () { if (intentado) validarCampo('acepto'); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      intentado = true;
      aplicarLimites();
      actualizarHorarios(f.horario.value);
      var errores = [];
      ORDEN.forEach(function (k) {
        var msg = VALIDADORES[k]();
        marcar(k, msg);
        if (msg) errores.push([k, msg]);
      });
      actualizarResumen(errores);
      if (errores.length) {
        var primero = controlDe(errores[0][0]);
        if (primero.disabled) primero = f.fecha;
        primero.focus();
        return;
      }
      guardar();
    });

    function guardar() {
      var clase = CLASE_POR_ID[f.horario.value];
      var nivel = nivelRadios.filter(function (r) { return r.checked; })[0].value;
      var registro = {
        id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        nombre: f.nombre.value.trim().replace(/\s+/g, ' '),
        correo: f.correo.value.trim().toLowerCase(),
        telefono: normalizarTelefono(f.telefono.value),
        disciplina: clase.disc,
        fecha: f.fecha.value,
        claseId: clase.id,
        hora: clase.hora,
        fin: clase.fin,
        entrenador: clase.entrenador,
        nivel: nivel,
        plan: f.plan.value || '',
        comentario: f.comentario.value.trim().slice(0, 140),
        creada: new Date().toISOString(),
        estado: 'activa'
      };
      enviar.disabled = true;
      enviar.classList.add('cargando');
      enviar.setAttribute('aria-busy', 'true');
      $('.btn__texto', enviar).textContent = 'Guardando en este navegador…';
      window.setTimeout(function () {
        solicitudes.agregar(registro);
        enviar.disabled = false;
        enviar.classList.remove('cargando');
        enviar.removeAttribute('aria-busy');
        $('.btn__texto', enviar).textContent = 'Guardar solicitud de prueba';
        var d = desdeISO(registro.fecha);
        $('#confirmacion-detalle').textContent = registro.nombre.split(' ')[0] + ', tu clase de ' + DISCIPLINAS[registro.disciplina].nombre +
          ' quedó anotada para el ' + fechaLarga(d) + ' a las ' + registro.hora + ', con ' + registro.entrenador + '.';
        form.hidden = true;
        confirmacion.hidden = false;
        $('#confirmacion-titulo').focus();
        pintarSolicitudes();
      }, 650);
    }

    $('#otra-solicitud').addEventListener('click', function () {
      form.reset();
      intentado = false;
      ORDEN.forEach(function (k) { marcar(k, ''); });
      resumenErr.hidden = true;
      aplicarLimites();
      actualizarHorarios();
      confirmacion.hidden = true;
      form.hidden = false;
      f.nombre.focus();
    });

    /* --- Pedir desde el horario o desde un plan --- */
    function proximaFechaDeClase(c) {
      var base = hoyLocal();
      for (var i = 0; i <= 30; i++) {
        var d = sumarDias(base, i);
        if (DIA_POR_JS[d.getDay()].clave === c.dia && clasesPara(c.disc, d).some(function (x) { return x.id === c.id; })) return d;
      }
      return null;
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-clase]');
      if (b) {
        var c = CLASE_POR_ID[b.getAttribute('data-clase')];
        if (!c) return;
        if (!confirmacion.hidden) $('#otra-solicitud').click();
        f.disciplina.value = c.disc;
        var d = proximaFechaDeClase(c);
        f.fecha.value = d ? aISO(d) : '';
        actualizarHorarios(c.id);
        if (intentado) ORDEN.forEach(function (k) { if ($('#f-' + k + '-error').textContent) validarCampo(k); });
        $('#prueba').scrollIntoView({ behavior: reducirMovimiento ? 'auto' : 'smooth', block: 'start' });
        f.nombre.focus({ preventScroll: true });
        return;
      }
      var p = e.target.closest('[data-plan-interes]');
      if (p) {
        f.plan.value = p.getAttribute('data-plan-interes');
      }
    });

    // Estado inicial (por si el navegador restauró valores)
    actualizarHorarios();
  })();

  /* ------------------------------------------------------------------
     Lista «Tus solicitudes»
  ------------------------------------------------------------------ */
  var listaSol = $('#solicitudes-lista');
  var vacioSol = $('#solicitudes-vacio');
  var estadoSol = $('#solicitudes-estado');
  if (!almacen.disponible) $('#aviso-almacen').hidden = false;

  function pintarSolicitudes() {
    var todas = solicitudes.todas().sort(function (a, b) {
      return (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
    });
    listaSol.innerHTML = '';
    vacioSol.hidden = todas.length > 0;
    var hoy = hoyLocal();
    todas.forEach(function (s) {
      var d = desdeISO(s.fecha);
      var disc = DISCIPLINAS[s.disciplina] ? DISCIPLINAS[s.disciplina].nombre : s.disciplina;
      var pasada = d && d < hoy;
      var estado = s.estado === 'anulada' ? 'anulada' : (pasada ? 'pasada' : 'activa');
      var etiquetaEstado = { activa: 'Guardada', anulada: 'Anulada', pasada: 'Pasada' }[estado];
      var cuando = d ? fechaLarga(d) : s.fecha;
      var acciones = el('div', { class: 'solicitud__acciones' });
      if (estado === 'activa') {
        acciones.appendChild(el('button', { type: 'button', class: 'btn-anular', 'data-anular': s.id, 'aria-label': 'Anular solicitud de ' + disc + ' del ' + cuando + ' a las ' + s.hora }, ['Anular']));
      } else {
        acciones.appendChild(el('button', { type: 'button', class: 'btn-quitar', 'data-quitar': s.id, 'aria-label': 'Quitar del historial la solicitud de ' + disc + ' del ' + cuando }, ['Quitar del historial']));
      }
      listaSol.appendChild(el('li', { class: 'solicitud solicitud--' + estado, 'data-id': s.id }, [
        el('div', { class: 'solicitud__cab' }, [
          el('p', { class: 'solicitud__disc', text: disc }),
          el('span', { class: 'solicitud__estado solicitud__estado--' + estado, text: etiquetaEstado })
        ]),
        el('p', { class: 'solicitud__cuando', text: cuando.charAt(0).toUpperCase() + cuando.slice(1) + ' · ' + s.hora + (s.fin ? '–' + s.fin : '') }),
        el('p', { class: 'solicitud__meta', text: 'Con ' + s.entrenador + ' · A nombre de ' + s.nombre }),
        acciones
      ]));
    });
  }

  listaSol.addEventListener('click', function (e) {
    var a = e.target.closest('[data-anular]');
    var q = e.target.closest('[data-quitar]');
    if (a) {
      var id = a.getAttribute('data-anular');
      solicitudes.actualizar(id, { estado: 'anulada', anulada: new Date().toISOString() });
      pintarSolicitudes();
      estadoSol.textContent = 'Solicitud anulada. Sigue en tu historial hasta que la quites.';
      var btn = $('[data-quitar="' + id + '"]', listaSol);
      if (btn) btn.focus();
    } else if (q) {
      solicitudes.quitar(q.getAttribute('data-quitar'));
      pintarSolicitudes();
      estadoSol.textContent = 'Solicitud quitada del historial.';
      $('#solicitudes-titulo').focus();
    }
  });

  window.addEventListener('storage', function (e) {
    if (e.key === 'pulso:solicitudes') { solicitudes.recargar(); pintarSolicitudes(); }
  });

  pintarSolicitudes();

  /* ------------------------------------------------------------------
     ¿Abierto ahora?
  ------------------------------------------------------------------ */
  (function abiertoAhora() {
    var nodo = $('#estado-abierto');
    if (!nodo) return;
    var ahora = new Date();
    var d = DIA_POR_JS[ahora.getDay()];
    var m = ahora.getHours() * 60 + ahora.getMinutes();
    var abierto = m >= minutos(d.abre) && m < minutos(d.cierra);
    nodo.textContent = abierto ? 'Ahora abierto · hoy cerramos a las ' + d.cierra : 'Ahora cerrado · ' + (m < minutos(d.abre) ? 'hoy abrimos a las ' + d.abre : 'mañana abrimos a las ' + DIA_POR_JS[(ahora.getDay() + 1) % 7].abre);
    nodo.classList.toggle('abierto', abierto);
  })();
})();
