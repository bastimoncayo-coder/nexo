/* Distrito Barber — sitio de demostración de Estudio Norte (negocio ficticio).
   Script clásico (sin módulos) para que funcione también abriendo index.html con file://.
   Las reservas se guardan solo en localStorage de este navegador; nada se envía a ningún servidor. */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  /* ================= Datos ================= */
  var SLUG = 'distrito-barber';
  var KEY_RESERVAS = SLUG + ':reservas';
  var OPEN = 10 * 60;   // 10:00
  var CLOSE = 20 * 60;  // 20:00
  var STEP = 30;        // bloques de 30 min
  var LEAD = 30;        // hoy: solo bloques que parten al menos 30 min después de ahora
  var DAYS_AHEAD = 21;  // hoy + 20 días

  var SERVICES = [
    { id: 'corte-clasico', name: 'Corte clásico', dur: 30, price: 12990 },
    { id: 'fade', name: 'Fade', dur: 45, price: 14990 },
    { id: 'barba', name: 'Barba', dur: 30, price: 9990 },
    { id: 'corte-barba', name: 'Corte + barba', dur: 60, price: 21990 },
    { id: 'toalla', name: 'Afeitado con toalla caliente', dur: 45, price: 15990, staff: ['mauro', 'tito'] },
    { id: 'diseno', name: 'Corte + diseño', dur: 60, price: 18990, staff: ['javi', 'nico'] },
    { id: 'infantil', name: 'Corte infantil', dur: 30, price: 9990 }
  ];

  // days: 0 = domingo … 6 = sábado
  var BARBERS = [
    { id: 'mauro', name: 'Mauro', role: 'Navaja y clásicos', days: [1, 2, 3, 4, 5] },
    { id: 'javi', name: 'Javi', role: 'Fades y diseño', days: [2, 3, 4, 5, 6] },
    { id: 'nico', name: 'Nico', role: 'Texturas e infantil', days: [1, 3, 5, 6] },
    { id: 'tito', name: 'Tito', role: 'Barba y toalla caliente', days: [1, 2, 4, 6] }
  ];

  var WD_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var WD_PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];

  /* ================= Utilidades ================= */
  var clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
  function isoOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseIso(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function todayIso() { return isoOf(new Date()); }
  function longDate(iso) {
    var d = parseIso(iso);
    return WD_LONG[d.getDay()] + ' ' + d.getDate() + ' de ' + d.toLocaleDateString('es-CL', { month: 'long' });
  }
  function ddmmyyyy(iso) { var p = iso.split('-'); return p[2] + '-' + p[1] + '-' + p[0]; }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function svcById(id) { for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i].id === id) return SERVICES[i]; return null; }
  function barberById(id) { for (var i = 0; i < BARBERS.length; i++) if (BARBERS[i].id === id) return BARBERS[i]; return null; }
  function joinY(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' y ' + list[list.length - 1];
  }
  function daysText(days) {
    var sorted = days.slice().sort();
    var consecutive = sorted.every(function (d, i) { return i === 0 || d === sorted[i - 1] + 1; });
    if (consecutive && sorted.length > 2) return cap(WD_LONG[sorted[0]]) + ' a ' + WD_LONG[sorted[sorted.length - 1]];
    return cap(joinY(sorted.map(function (d) { return WD_LONG[d]; })));
  }

  /* ================= Almacenamiento seguro ================= */
  var memoryStore = {};
  var storageOk = (function () {
    try {
      var k = SLUG + ':prueba';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function readRaw(key) {
    if (storageOk) {
      try { return window.localStorage.getItem(key); } catch (e) { /* sigue en memoria */ }
    }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  }
  function writeRaw(key, value) {
    if (storageOk) {
      try { window.localStorage.setItem(key, value); return true; } catch (e) { /* sigue en memoria */ }
    }
    memoryStore[key] = value;
    return false;
  }
  function validBooking(b) {
    return b && typeof b.code === 'string' && typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
      typeof b.start === 'number' && typeof b.dur === 'number' && !!barberById(b.barberId) && !!svcById(b.serviceId);
  }
  function getBookings() {
    var raw = readRaw(KEY_RESERVAS);
    if (!raw) return [];
    try {
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter(validBooking) : [];
    } catch (e) { return []; }
  }
  function saveBookings(list) { return writeRaw(KEY_RESERVAS, JSON.stringify(list)); }

  /* ================= Agenda: ocupados de ejemplo (deterministas) ================= */
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function works(barber, dow) { return barber.days.indexOf(dow) !== -1; }

  var sampleCache = {};
  // Misma fecha + mismo barbero => siempre los mismos bloques ocupados de ejemplo.
  function sampleBusy(iso, barber) {
    var key = iso + '|' + barber.id;
    if (sampleCache[key]) return sampleCache[key];
    var out = [];
    var dow = parseIso(iso).getDay();
    if (dow !== 0 && works(barber, dow)) {
      var r = rng(hashStr('distrito:' + key));
      var n = 3 + Math.floor(r() * 3); // 3 a 5 reservas de ejemplo
      var durs = [30, 45, 60, 60, 30];
      for (var tries = 0; out.length < n && tries < 40; tries++) {
        var dur = durs[Math.floor(r() * durs.length)];
        var slots = Math.floor((CLOSE - OPEN - dur) / STEP);
        var start = OPEN + STEP * Math.floor(r() * (slots + 1));
        var clash = out.some(function (b) { return start < b.end && start + dur > b.start; });
        if (!clash) out.push({ start: start, end: start + dur, kind: 'ejemplo' });
      }
      out.sort(function (a, b) { return a.start - b.start; });
    }
    sampleCache[key] = out;
    return out;
  }

  function busyFor(iso, barberId, bookings) {
    var list = sampleBusy(iso, barberById(barberId)).slice();
    bookings.forEach(function (b) {
      if (b.barberId === barberId && b.date === iso) {
        list.push({ start: b.start, end: b.start + b.dur, kind: 'tuya', code: b.code });
      }
    });
    return list;
  }

  // ¿Puede ese barbero tomar [start, start+dur) ese día?
  function checkSlot(iso, barberId, start, dur, bookings) {
    var busy = busyFor(iso, barberId, bookings);
    var occupied = null, next = null;
    busy.forEach(function (b) {
      if (start < b.end && start + dur > b.start) {
        if (b.start <= start) { if (!occupied) occupied = b; }
        else if (!next || b.start < next.start) next = b;
      }
    });
    if (occupied) return { ok: false, type: 'ocupado', block: occupied };
    if (next) return { ok: false, type: 'no-alcanza', block: next };
    return { ok: true };
  }

  function eligible(service) {
    return BARBERS.filter(function (b) { return !service.staff || service.staff.indexOf(b.id) !== -1; });
  }
  function candidates(iso, service, barberSel) {
    var dow = parseIso(iso).getDay();
    var list = barberSel === 'any' ? eligible(service) : [barberById(barberSel)];
    return list.filter(function (b) { return b && works(b, dow); });
  }
  function busyMinutes(iso, id, bookings) {
    return busyFor(iso, id, bookings).reduce(function (s, b) { return s + (b.end - b.start); }, 0);
  }
  // Inicios posibles según jornada y duración (y hora actual si es hoy).
  function startsFor(iso, dur) {
    var out = [];
    var today = todayIso();
    if (iso < today) return out;
    var nowMin = null;
    if (iso === today) { var n = new Date(); nowMin = n.getHours() * 60 + n.getMinutes(); }
    for (var s = OPEN; s + dur <= CLOSE; s += STEP) {
      if (nowMin !== null && s < nowMin + LEAD) continue;
      out.push(s);
    }
    return out;
  }

  function slotInfo(iso, service, barberSel, start, bookings) {
    var cands = candidates(iso, service, barberSel);
    if (!cands.length) return { ok: false, type: 'cerrado' };
    if (barberSel !== 'any') {
      var r = checkSlot(iso, cands[0].id, start, service.dur, bookings);
      r.barber = cands[0];
      return r;
    }
    var free = cands.filter(function (b) { return checkSlot(iso, b.id, start, service.dur, bookings).ok; });
    if (!free.length) {
      // ¿Alguno lo tiene libre al inicio pero no alcanza?
      var anyShort = cands.some(function (b) { return checkSlot(iso, b.id, start, service.dur, bookings).type === 'no-alcanza'; });
      return { ok: false, type: anyShort ? 'no-alcanza-todos' : 'todos' };
    }
    // Sin preferencia: el profesional libre con menos carga ese día.
    free.sort(function (a, b) {
      return busyMinutes(iso, a.id, bookings) - busyMinutes(iso, b.id, bookings) || BARBERS.indexOf(a) - BARBERS.indexOf(b);
    });
    return { ok: true, barber: free[0] };
  }

  function dayInfo(iso, service, barberSel, bookings) {
    var dow = parseIso(iso).getDay();
    if (dow === 0) return { ok: false, short: 'Cerrado', long: 'cerrado los domingos' };
    var cands = candidates(iso, service, barberSel);
    if (!cands.length) {
      if (barberSel !== 'any') {
        var b = barberById(barberSel);
        return { ok: false, short: b.name + ' no atiende', long: b.name + ' no atiende los ' + WD_PLURAL[dow] };
      }
      return { ok: false, short: 'Sin barbero', long: 'nadie hace este servicio ese día' };
    }
    var st = startsFor(iso, service.dur);
    if (!st.length) return { ok: false, short: 'Jornada cerrada', long: 'ya no quedan bloques hoy' };
    var free = st.filter(function (s) { return slotInfo(iso, service, barberSel, s, bookings).ok; }).length;
    if (!free) return { ok: false, short: 'Completo', long: 'sin horarios libres' };
    return { ok: true, free: free, short: free + (free === 1 ? ' libre' : ' libres'), long: free + (free === 1 ? ' horario libre' : ' horarios libres') };
  }

  function nextDays() {
    var t = new Date();
    var out = [];
    for (var i = 0; i < DAYS_AHEAD; i++) {
      out.push(isoOf(new Date(t.getFullYear(), t.getMonth(), t.getDate() + i)));
    }
    return out;
  }

  /* ================= Estado de la reserva ================= */
  var state = { step: 1, service: null, barber: null, date: null, start: null, assigned: null };
  var STEP_NAMES = ['Servicio', 'Profesional', 'Fecha', 'Horario', 'Tus datos', 'Listo'];
  var form = $('#book-form');
  var stepsEl = $('#steps');
  var btnBack = $('#btn-back');
  var btnNext = $('#btn-next');
  var navEl = $('#book-nav');
  var submitted = false;

  /* ---------- Render: progreso ---------- */
  function renderProgress() {
    var html = '';
    for (var i = 1; i <= 6; i++) {
      var cls = i < state.step ? 'is-done' : (i === state.step ? 'is-current' : 'is-todo');
      var srState = i < state.step ? ' (completado)' : (i === state.step ? ' (paso actual)' : ' (pendiente)');
      var inner = '<span class="st__n" aria-hidden="true">' + (i < state.step ? '✓' : i) + '</span>' +
        '<span class="st__l">' + STEP_NAMES[i - 1] + '<span class="sr-only">' + srState + '</span></span>';
      if (i < state.step && state.step < 6) {
        html += '<li class="' + cls + '"><button type="button" class="st" data-goto="' + i + '" aria-label="Volver al paso ' + i + ': ' + STEP_NAMES[i - 1] + ' (completado)">' + inner + '</button></li>';
      } else {
        html += '<li class="' + cls + '"' + '><span class="st"' + (i === state.step ? ' aria-current="step"' : '') + '>' + inner + '</span></li>';
      }
    }
    stepsEl.innerHTML = html;
  }

  /* ---------- Render: paso 1 ---------- */
  function renderServices() {
    $('#opts-servicio').innerHTML = SERVICES.map(function (s) {
      var only = s.staff ? 'Solo con ' + s.staff.map(function (id) { return barberById(id).name; }).join(' o ') : '';
      return '<label class="opt opt-svc">' +
        '<input type="radio" name="servicio" value="' + s.id + '"' + (state.service === s.id ? ' checked' : '') + '>' +
        '<span class="opt-box"><span class="opt-top"><span class="opt-title">' + esc(s.name) + '</span><span class="opt-mark" aria-hidden="true"></span></span>' +
        '<span class="opt-meta"><span>' + s.dur + ' min</span><span>' + clp.format(s.price) + '</span></span>' +
        (only ? '<span class="opt-note">' + only + '</span>' : '') +
        '</span></label>';
    }).join('');
  }

  /* ---------- Render: paso 2 ---------- */
  function renderBarbers() {
    var svc = svcById(state.service);
    $('#p2-help').textContent = svc ? 'Para ' + svc.name.toLowerCase() + ' (' + svc.dur + ' min). Si no tienes preferencia, te asignamos a quien esté libre en el horario que elijas.' : '';
    var html = '<label class="opt opt-barber"><input type="radio" name="profesional" value="any"' + (state.barber === 'any' ? ' checked' : '') + '>' +
      '<span class="opt-box"><span class="opt-any" aria-hidden="true"><span>?</span></span><span class="opt-txt"><span class="opt-title">Sin preferencia</span>' +
      '<span class="opt-sub">Te toca quien esté libre</span></span><span class="opt-mark" aria-hidden="true"></span></span></label>';
    html += BARBERS.map(function (b) {
      var ok = !svc || !svc.staff || svc.staff.indexOf(b.id) !== -1;
      return '<label class="opt opt-barber"><input type="radio" name="profesional" value="' + b.id + '"' +
        (state.barber === b.id ? ' checked' : '') + (ok ? '' : ' disabled') + '>' +
        '<span class="opt-box"><img class="opt-thumb" src="assets/img/equipo-' + b.id + '.svg" alt="" width="56" height="70">' +
        '<span class="opt-txt"><span class="opt-title">' + b.name + '</span><span class="opt-sub">' + b.role + '</span>' +
        '<span class="opt-note">' + (ok ? daysText(b.days) : 'No hace ' + esc(svc.name.toLowerCase())) + '</span></span>' +
        '<span class="opt-mark" aria-hidden="true"></span></span></label>';
    }).join('');
    $('#opts-barbero').innerHTML = html;
  }

  /* ---------- Render: paso 3 ---------- */
  function renderDates() {
    var svc = svcById(state.service);
    var bookings = getBookings();
    var today = todayIso();
    var who = state.barber === 'any' ? 'cualquier barbero' : barberById(state.barber).name;
    $('#p3-help').textContent = 'Próximos 21 días para ' + svc.name.toLowerCase() + ' con ' + who + '. Domingo cerrado' +
      (state.barber !== 'any' ? '; ' + barberById(state.barber).name + ' atiende ' + daysText(barberById(state.barber).days).toLowerCase() : '') + '.';
    var stillValid = false;
    var html = nextDays().map(function (iso) {
      var d = parseIso(iso);
      var info = dayInfo(iso, svc, state.barber, bookings);
      var checked = state.date === iso && info.ok;
      if (checked) stillValid = true;
      return '<label class="opt opt-date">' +
        (iso === today ? '<span class="d-today" aria-hidden="true">Hoy</span>' : '') +
        '<input type="radio" name="fecha" value="' + iso + '"' + (checked ? ' checked' : '') + (info.ok ? '' : ' disabled') + '>' +
        '<span class="opt-box">' +
        '<span class="sr-only">' + (iso === today ? 'Hoy, ' : '') + longDate(iso) + ': ' + (info.ok ? info.long : 'no disponible, ' + info.long) + '</span>' +
        '<span aria-hidden="true" class="d-wd">' + WD_LONG[d.getDay()].slice(0, 3) + '</span>' +
        '<span aria-hidden="true" class="d-num">' + d.getDate() + '</span>' +
        '<span aria-hidden="true" class="d-mo">' + d.toLocaleDateString('es-CL', { month: 'short' }).replace('.', '') + '</span>' +
        '<span aria-hidden="true" class="d-st">' + info.short + '</span>' +
        '</span></label>';
    }).join('');
    if (!stillValid && state.date) { state.date = null; state.start = null; state.assigned = null; }
    $('#opts-fecha').innerHTML = html;
  }

  /* ---------- Render: paso 4 ---------- */
  function slotLabel(info, svc) {
    if (info.ok) return { short: 'Libre', long: 'libre' + (state.barber === 'any' ? ', con ' + info.barber.name : '') };
    if (info.type === 'ocupado') {
      if (info.block.kind === 'tuya') return { short: 'Tu reserva', long: 'ocupado por tu reserva ' + info.block.code };
      return { short: 'Ocupado', long: 'ocupado, ya tiene una reserva' };
    }
    if (info.type === 'no-alcanza') {
      return { short: 'No alcanza', long: 'no alcanza: el servicio dura ' + svc.dur + ' min y choca con una reserva a las ' + hhmm(info.block.start) };
    }
    if (info.type === 'no-alcanza-todos') return { short: 'No alcanza', long: 'no alcanza con ningún barbero para ' + svc.dur + ' min' };
    return { short: 'Ocupado', long: 'todos los barberos están ocupados' };
  }

  function renderTimes() {
    var svc = svcById(state.service);
    var bookings = getBookings();
    var who = state.barber === 'any' ? 'sin preferencia de barbero' : 'con ' + barberById(state.barber).name;
    $('#p4-legend').textContent = 'Horario para el ' + longDate(state.date);
    $('#p4-help').textContent = cap(longDate(state.date)) + ', ' + who + '. Bloques de 30 min; tu servicio dura ' + svc.dur +
      ' min y debe terminar antes de las 20:00.' + (state.date === todayIso() ? ' Hoy solo mostramos horarios que parten al menos 30 min después de ahora.' : '');
    var starts = startsFor(state.date, svc.dur);
    var selectedOk = false;
    if (!starts.length) {
      $('#opts-hora').innerHTML = '<p class="slot-empty">Ya no quedan bloques para este día. Vuelve atrás y elige otra fecha.</p>';
      state.start = null; state.assigned = null;
      return;
    }
    var groups = [
      { label: 'Mañana', from: OPEN, to: 13 * 60 + 59 },
      { label: 'Tarde', from: 14 * 60, to: 17 * 60 + 29 },
      { label: 'Última pasada', from: 17 * 60 + 30, to: CLOSE }
    ];
    var html = '';
    groups.forEach(function (g) {
      var inG = starts.filter(function (s) { return s >= g.from && s <= g.to; });
      if (!inG.length) return;
      html += '<p class="t-group" aria-hidden="true">' + g.label + '</p><div class="opts opts--time">';
      inG.forEach(function (s) {
        var info = slotInfo(state.date, svc, state.barber, s, bookings);
        var lab = slotLabel(info, svc);
        var checked = state.start === s && info.ok;
        if (checked) { selectedOk = true; state.assigned = info.barber.id; }
        var short = info.type === 'no-alcanza' || info.type === 'no-alcanza-todos';
        html += '<label class="opt opt-time' + (short ? ' is-short' : '') + '">' +
          '<input type="radio" name="hora" value="' + s + '"' + (checked ? ' checked' : '') + (info.ok ? '' : ' disabled') + '>' +
          '<span class="opt-box"><span class="sr-only">' + hhmm(s) + ' a ' + hhmm(s + svc.dur) + ', ' + lab.long + '</span>' +
          '<span class="t-time" aria-hidden="true">' + hhmm(s) + '</span>' +
          '<span class="t-st" aria-hidden="true">' + lab.short + '</span></span></label>';
      });
      html += '</div>';
    });
    if (!selectedOk) { state.start = null; state.assigned = null; }
    $('#opts-hora').innerHTML = html;
  }

  /* ---------- Ticket ---------- */
  function updateTicket() {
    var svc = svcById(state.service);
    var rows = [
      ['Servicio', svc ? svc.name : null],
      ['Duración', svc ? svc.dur + ' min' : null],
      ['Barbero', state.barber === 'any'
        ? (state.assigned ? barberById(state.assigned).name + ' (asignado)' : 'Sin preferencia')
        : (state.barber ? barberById(state.barber).name : null)],
      ['Fecha', state.date ? cap(longDate(state.date)) : null],
      ['Hora', state.start !== null ? hhmm(state.start) + '–' + hhmm(state.start + (svc ? svc.dur : 0)) : null]
    ];
    $('#ticket-rows').innerHTML = rows.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd' + (r[1] ? '' : ' class="is-empty"') + '>' + (r[1] ? esc(r[1]) : 'Por elegir') + '</dd></div>';
    }).join('');
    $('#ticket-total').textContent = svc ? clp.format(svc.price) : '—';
  }

  /* ---------- Navegación entre pasos ---------- */
  function hideStepErrors() {
    $all('.step-err').forEach(function (p) { p.hidden = true; p.textContent = ''; });
  }
  function renderPanel(n) {
    if (n === 1) renderServices();
    if (n === 2) renderBarbers();
    if (n === 3) renderDates();
    if (n === 4) renderTimes();
  }
  function goTo(n, opts) {
    opts = opts || {};
    state.step = n;
    hideStepErrors();
    $('#slot-alert').hidden = true;
    $all('.panel', form).forEach(function (p) { p.hidden = +p.getAttribute('data-panel') !== n; });
    renderPanel(n);
    renderProgress();
    updateTicket();
    btnBack.hidden = n === 1 || n === 6;
    navEl.hidden = n === 6;
    btnNext.textContent = n === 5 ? 'Confirmar reserva' : 'Siguiente →';
    if (opts.focus !== false) {
      var title = $('#p' + n + '-t');
      var box = $('#booking');
      var rect = box.getBoundingClientRect();
      if (rect.top < 0 || rect.top > window.innerHeight * 0.6) {
        box.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
      title.focus({ preventScroll: true });
    }
  }
  function stepError(n, msg) {
    var p = $('#p' + n + '-err');
    p.textContent = msg;
    p.hidden = false;
    p.setAttribute('role', 'alert');
    var first = $('#' + ['', 'opts-servicio', 'opts-barbero', 'opts-fecha', 'opts-hora'][n] + ' input:not(:disabled)');
    if (first) first.focus();
  }

  function next() {
    var s = state.step;
    if (s === 1) { if (!state.service) return stepError(1, 'Elige un servicio para continuar.'); return goTo(2); }
    if (s === 2) { if (!state.barber) return stepError(2, 'Elige un barbero o «Sin preferencia» para continuar.'); return goTo(3); }
    if (s === 3) { if (!state.date) return stepError(3, 'Elige un día disponible para continuar.'); return goTo(4); }
    if (s === 4) { if (state.start === null) return stepError(4, 'Elige un horario libre para continuar.'); return goTo(5); }
    if (s === 5) return confirmBooking();
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); next(); });
  btnBack.addEventListener('click', function () { if (state.step > 1) goTo(state.step - 1); });
  stepsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-goto]');
    if (b) goTo(+b.getAttribute('data-goto'));
  });

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'servicio') {
      state.service = t.value;
      var svc = svcById(t.value);
      if (state.barber && state.barber !== 'any' && svc.staff && svc.staff.indexOf(state.barber) === -1) state.barber = null;
      state.start = null; state.assigned = null;
    } else if (t.name === 'profesional') {
      state.barber = t.value; state.start = null; state.assigned = null;
    } else if (t.name === 'fecha') {
      state.date = t.value; state.start = null; state.assigned = null;
    } else if (t.name === 'hora') {
      var s = +t.value;
      var info = slotInfo(state.date, svcById(state.service), state.barber, s, getBookings());
      if (info.ok) { state.start = s; state.assigned = info.barber.id; }
    } else {
      return;
    }
    hideStepErrors();
    updateTicket();
  });

  /* ---------- Paso 5: validación ---------- */
  var fields = {
    nombre: $('#f-nombre'),
    telefono: $('#f-tel'),
    correo: $('#f-correo')
  };
  function normPhone(v) {
    var d = String(v).replace(/[\s\-().]/g, '');
    if (/^\+?56/.test(d)) d = d.replace(/^\+?56/, '');
    return d;
  }
  function formatPhone(d) { return '+56 9 ' + d.slice(1, 5) + ' ' + d.slice(5); }
  function validateField(name) {
    var v = fields[name].value.trim();
    if (name === 'nombre') {
      if (!v) return 'Escribe tu nombre para la reserva.';
      if (v.length < 3) return 'El nombre es muy corto: escribe al menos 3 letras.';
      if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(v)) return 'Usa solo letras, espacios, apóstrofo o guion.';
      if ((v.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length < 3) return 'El nombre es muy corto: escribe al menos 3 letras.';
      return '';
    }
    if (name === 'telefono') {
      if (!v) return 'Escribe un celular para identificar tu reserva.';
      if (/[^0-9+\s\-().]/.test(v)) return 'El teléfono solo puede tener números, espacios y el signo +.';
      var d = normPhone(v);
      if (!/^9\d{8}$/.test(d)) return 'Ingresa un celular chileno válido: 9 dígitos que empiezan con 9, por ejemplo +56 9 1234 5678.';
      if (/^9(\d)\1{7}$/.test(d)) return 'Ese número no parece real. Revisa los dígitos.';
      return '';
    }
    if (name === 'correo') {
      if (!v) return '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(v)) return 'El correo no tiene un formato válido (ejemplo: nombre@dominio.cl).';
      return '';
    }
    return '';
  }
  function showFieldError(name, msg) {
    var input = fields[name];
    var err = $('#' + input.id + '-err');
    if (msg) {
      input.setAttribute('aria-invalid', 'true');
      err.textContent = msg;
      err.hidden = false;
    } else {
      input.removeAttribute('aria-invalid');
      err.textContent = '';
      err.hidden = true;
    }
  }
  var LABELS = { nombre: 'Nombre y apellido', telefono: 'Teléfono celular', correo: 'Correo' };
  function validateAll() {
    var errors = [];
    Object.keys(fields).forEach(function (name) {
      var msg = validateField(name);
      showFieldError(name, msg);
      if (msg) errors.push({ name: name, msg: msg });
    });
    var sum = $('#err-summary');
    if (errors.length) {
      $('#err-list').innerHTML = errors.map(function (er) {
        return '<li><a href="#' + fields[er.name].id + '" data-field="' + er.name + '">' + LABELS[er.name] + ': ' + esc(er.msg) + '</a></li>';
      }).join('');
      sum.hidden = false;
    } else {
      sum.hidden = true;
      $('#err-list').innerHTML = '';
    }
    return errors;
  }
  $('#err-list').addEventListener('click', function (e) {
    var a = e.target.closest('a[data-field]');
    if (!a) return;
    e.preventDefault();
    fields[a.getAttribute('data-field')].focus();
  });
  Object.keys(fields).forEach(function (name) {
    fields[name].addEventListener('blur', function () {
      if (submitted || fields[name].value.trim()) showFieldError(name, validateField(name));
    });
    fields[name].addEventListener('input', function () {
      if (fields[name].getAttribute('aria-invalid') === 'true' && !validateField(name)) showFieldError(name, '');
    });
  });

  /* ---------- Confirmación con revalidación ---------- */
  function newCode(existing) {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var used = {};
    existing.forEach(function (b) { used[b.code] = true; });
    var code;
    do {
      var s = '';
      var buf = new Uint32Array(4);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(buf);
      for (var i = 0; i < 4; i++) s += chars[(buf[i] || Math.floor(Math.random() * 1e9)) % chars.length];
      code = 'DB-' + s;
    } while (used[code]);
    return code;
  }

  function confirmBooking() {
    submitted = true;
    var errors = validateAll();
    if (errors.length) {
      fields[errors[0].name].focus();
      return;
    }
    var svc = svcById(state.service);
    var bookings = getBookings(); // relectura: puede haber cambiado en otra pestaña
    var stillStarts = startsFor(state.date, svc.dur).indexOf(state.start) !== -1;
    var info = stillStarts ? slotInfo(state.date, svc, state.barber, state.start, bookings) : { ok: false };
    if (!info.ok) {
      var when = hhmm(state.start) + ' del ' + longDate(state.date);
      var alertEl = $('#slot-alert');
      alertEl.textContent = stillStarts
        ? 'El bloque de las ' + when + ' se ocupó mientras completabas tus datos. Elige otro horario; tus datos siguen anotados.'
        : 'El bloque de las ' + when + ' ya no está disponible porque la hora pasó. Elige otro horario; tus datos siguen anotados.';
      state.start = null; state.assigned = null;
      goTo(4, { focus: false });
      alertEl.hidden = false;
      var box = $('#booking');
      box.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      $('#p4-t').focus({ preventScroll: true });
      return;
    }
    var reassigned = state.barber === 'any' && state.assigned && state.assigned !== info.barber.id;
    var booking = {
      code: newCode(bookings),
      serviceId: svc.id,
      barberId: info.barber.id,
      auto: state.barber === 'any',
      date: state.date,
      start: state.start,
      dur: svc.dur,
      price: svc.price,
      name: fields.nombre.value.trim().replace(/\s+/g, ' '),
      phone: formatPhone(normPhone(fields.telefono.value)),
      email: fields.correo.value.trim(),
      createdAt: new Date().toISOString()
    };
    bookings.push(booking);
    var persisted = saveBookings(bookings);
    state.assigned = info.barber.id;
    renderConfirmation(booking, persisted, reassigned);
    goTo(6);
    renderMine();
  }

  function renderConfirmation(b, persisted, reassigned) {
    var svc = svcById(b.serviceId);
    var rows = [
      ['Servicio', svc.name + ' · ' + b.dur + ' min'],
      ['Barbero', barberById(b.barberId).name + (b.auto ? ' (asignado, sin preferencia)' : '')],
      ['Fecha', cap(longDate(b.date)) + ' (' + ddmmyyyy(b.date) + ')'],
      ['Hora', hhmm(b.start) + ' a ' + hhmm(b.start + b.dur)],
      ['Nombre', b.name],
      ['Teléfono', b.phone]
    ];
    if (b.email) rows.push(['Correo', b.email]);
    rows.push(['Total de ejemplo', clp.format(b.price)]);
    $('#confirmacion').innerHTML =
      '<div class="done">' +
      '<p class="done__code"><span>Código de reserva</span><strong>' + b.code + '</strong></p>' +
      '<div class="done__local"><p><strong>Guardada solo en este navegador.</strong> ' +
      (persisted ? 'No se envió a nadie: ni a la barbería (que es ficticia) ni a ningún servidor. La verás en «Mis reservas» mientras no borres los datos del navegador.'
        : 'No se envió a nadie. Además, tu navegador bloquea el almacenamiento local, así que esta reserva se perderá al recargar la página.') +
      '</p></div>' +
      (reassigned ? '<p class="done__note">El barbero que te habíamos propuesto se ocupó; te asignamos a ' + barberById(b.barberId).name + ', que está libre en ese bloque.</p>' : '') +
      '<dl class="done__dl">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<div class="done__actions"><a class="btn btn--ink" href="#mis-reservas">Ver mis reservas</a>' +
      '<button class="btn btn--ghost-ink" type="button" id="btn-again">Hacer otra reserva</button></div>' +
      '</div>';
    $('#btn-again').addEventListener('click', function () { startOver(); });
  }

  function startOver(preset) {
    preset = preset || {};
    state.service = preset.service || null;
    state.barber = preset.barber || null;
    state.date = null; state.start = null; state.assigned = null;
    submitted = false;
    Object.keys(fields).forEach(function (n) { fields[n].value = ''; showFieldError(n, ''); });
    $('#err-summary').hidden = true;
    $('#slot-alert').hidden = true;
  }

  /* ---------- Atajos desde servicios y equipo ---------- */
  document.addEventListener('click', function (e) {
    var sBtn = e.target.closest('[data-book-service]');
    var bBtn = e.target.closest('[data-book-barber]');
    if (!sBtn && !bBtn) return;
    if (state.step === 6) startOver();
    if (sBtn) {
      var svc = svcById(sBtn.getAttribute('data-book-service'));
      state.service = svc.id;
      if (state.barber && state.barber !== 'any' && svc.staff && svc.staff.indexOf(state.barber) === -1) state.barber = null;
      state.start = null; state.assigned = null;
      goTo(2);
    } else {
      var id = bBtn.getAttribute('data-book-barber');
      state.barber = id;
      state.start = null; state.assigned = null;
      if (state.service) {
        var sv = svcById(state.service);
        if (sv.staff && sv.staff.indexOf(id) === -1) state.service = null;
      }
      goTo(state.service ? 3 : 1);
    }
  });

  /* ================= Mis reservas ================= */
  var mineList = $('#mine-list');
  var mineStatus = $('#mine-status');
  var pendingCancel = null;
  var cancelTrigger = null;

  function bookingEndPassed(b) {
    var now = new Date();
    var end = parseIso(b.date);
    end.setMinutes(b.start + b.dur);
    return end < now;
  }

  function renderMine() {
    var list = getBookings().slice().sort(function (a, b) {
      return a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start;
    });
    if (!list.length) {
      mineList.innerHTML =
        '<div class="empty">' +
        '<img class="empty__icon" src="assets/img/tijeras.svg" alt="" width="96" height="96">' +
        '<p class="empty__t">Todavía no hay reservas aquí</p>' +
        '<p>Cuando reserves una hora de demostración, aparecerá en esta lista con su código. Nada sale de este navegador.</p>' +
        '<a class="btn btn--signal" href="#reservar">Reservar hora</a>' +
        '</div>';
      return;
    }
    mineList.innerHTML = '<ul class="mine__list">' + list.map(function (b) {
      var svc = svcById(b.serviceId);
      var past = bookingEndPassed(b);
      return '<li class="res">' +
        '<div class="res__top"><p class="res__code"><span class="sr-only">Reserva </span>' + esc(b.code) + '</p>' +
        '<span class="res__badge' + (past ? ' res__badge--past' : '') + '">' + (past ? 'Ya pasó' : 'Confirmada · demo') + '</span></div>' +
        '<h3 class="res__when">' + cap(longDate(b.date)) + ' · ' + hhmm(b.start) + '</h3>' +
        '<dl class="res__dl">' +
        '<div><dt>Servicio</dt><dd>' + esc(svc.name) + ' (' + b.dur + ' min)</dd></div>' +
        '<div><dt>Barbero</dt><dd>' + barberById(b.barberId).name + (b.auto ? ' · asignado' : '') + '</dd></div>' +
        '<div><dt>Horario</dt><dd>' + hhmm(b.start) + '–' + hhmm(b.start + b.dur) + '</dd></div>' +
        '<div><dt>A nombre de</dt><dd>' + esc(b.name) + '</dd></div>' +
        '</dl>' +
        '<button class="btn btn--ink btn--sm" type="button" data-cancel="' + esc(b.code) + '">Anular <span class="sr-only">reserva ' + esc(b.code) + '</span></button>' +
        '</li>';
    }).join('') + '</ul>';
  }

  var dlgCancel = $('#dlg-anular');
  mineList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-cancel]');
    if (!btn) return;
    var code = btn.getAttribute('data-cancel');
    var b = getBookings().filter(function (x) { return x.code === code; })[0];
    if (!b) { renderMine(); return; }
    pendingCancel = code;
    cancelTrigger = btn;
    $('#anular-d').textContent = 'Vas a anular la reserva ' + code + ': ' + svcById(b.serviceId).name.toLowerCase() + ' con ' +
      barberById(b.barberId).name + ', el ' + longDate(b.date) + ' a las ' + hhmm(b.start) + '. El bloque volverá a quedar libre.';
    dlgCancel.returnValue = '';
    if (typeof dlgCancel.showModal === 'function') {
      dlgCancel.showModal();
    } else {
      dlgCancel.setAttribute('open', '');
    }
  });
  dlgCancel.addEventListener('close', function () {
    var code = pendingCancel;
    pendingCancel = null;
    if (dlgCancel.returnValue === 'anular' && code) {
      var list = getBookings().filter(function (x) { return x.code !== code; });
      saveBookings(list);
      renderMine();
      mineStatus.textContent = 'Reserva ' + code + ' anulada. El bloque quedó libre otra vez.';
      if (state.step === 3 || state.step === 4) { renderPanel(state.step); updateTicket(); }
      mineStatus.focus();
    } else if (cancelTrigger && document.body.contains(cancelTrigger)) {
      cancelTrigger.focus();
    }
    cancelTrigger = null;
  });

  // Cambios hechos desde otra pestaña
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY_RESERVAS) return;
    renderMine();
    if (state.step === 3 || state.step === 4) { renderPanel(state.step); updateTicket(); }
  });

  /* ================= Menú móvil ================= */
  var menuBtn = $('.menu-btn');
  var nav = $('#menu');
  function setMenu(open, returnFocus) {
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
    if (!open && returnFocus) menuBtn.focus();
  }
  menuBtn.addEventListener('click', function () {
    var open = menuBtn.getAttribute('aria-expanded') !== 'true';
    setMenu(open);
    if (open) { var first = $('a', nav); if (first) first.focus(); }
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false, true);
  });
  document.addEventListener('click', function (e) {
    if (menuBtn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setMenu(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 960 && menuBtn.getAttribute('aria-expanded') === 'true') setMenu(false);
  });

  /* ================= Galería (lightbox) ================= */
  var lb = $('#lightbox');
  var lbItems = $all('[data-lb]');
  var lbIndex = 0;
  var lbTrigger = null;
  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var it = lbItems[lbIndex];
    var img = $('#lb-img');
    img.src = it.getAttribute('data-src');
    img.alt = it.getAttribute('data-alt');
    $('#lb-cap').textContent = it.getAttribute('data-cap');
    $('#lb-count').textContent = (lbIndex + 1) + ' de ' + lbItems.length;
  }
  lbItems.forEach(function (btn, i) {
    btn.addEventListener('click', function () {
      lbTrigger = btn;
      lbShow(i);
      if (typeof lb.showModal === 'function') lb.showModal(); else lb.setAttribute('open', '');
      $('[data-lb-close]', lb).focus();
    });
  });
  $('[data-lb-prev]', lb).addEventListener('click', function () { lbShow(lbIndex - 1); });
  $('[data-lb-next]', lb).addEventListener('click', function () { lbShow(lbIndex + 1); });
  $('[data-lb-close]', lb).addEventListener('click', function () { lb.close(); });
  lb.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') { e.preventDefault(); lbShow(lbIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); lbShow(lbIndex + 1); }
  });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', function () {
    if (lbTrigger) { lbTrigger.focus(); lbTrigger = null; }
  });

  /* ================= Revelado al hacer scroll ================= */
  var reveals = $all('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ================= Inicio ================= */
  if (!storageOk) $('#storage-warn').hidden = false;
  goTo(1, { focus: false });
  renderMine();

  // Ganchos de inspección para pruebas manuales (sin efectos).
  window.DistritoBarber = {
    sampleBusy: function (iso, barberId) { return sampleBusy(iso, barberById(barberId)); },
    storageKey: KEY_RESERVAS
  };
})();
