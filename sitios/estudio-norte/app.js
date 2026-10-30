// Estudio Norte (marca ficticia de demostración) — interacciones del sitio.
// Nada se envía a ningún servidor: el brief vive solo en este navegador.
// Script clásico (no módulo) para que también funcione al abrir index.html con file://.
(() => {
'use strict';

const SLUG = 'estudio-norte';
const DRAFT_KEY = `${SLUG}:brief-borrador`;

const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ---------------- Almacenamiento seguro ---------------- */
const store = {
  available: (() => {
    try {
      const k = `${SLUG}:__test`;
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch { return false; }
  })(),
  get(key) {
    try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
  },
  set(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) {
    try { window.localStorage.removeItem(key); return true; } catch { return false; }
  },
};

/* ---------------- Utilidades de fecha ---------------- */
function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function parseDMY(value) {
  const m = /^(\d{2})[-/](\d{2})[-/](\d{4})$/.exec(String(value).trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m.map(Number);
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
  return d;
}
const pad = (n) => String(n).padStart(2, '0');
const toDMY = (d) => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const longDate = (d) => `${d.toLocaleDateString('es-CL', { weekday: 'long' })} ${d.getDate()} de ${d.toLocaleDateString('es-CL', { month: 'long' })} de ${d.getFullYear()}`;
const timeHM = (d) => d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });

/* ---------------- Teléfono chileno ---------------- */
function normalizePhone(raw) {
  const v = String(raw).trim();
  if (!/^\+?[\d\s\-().]+$/.test(v)) return null;
  let d = v.replace(/[\s\-().]/g, '');
  if (d.startsWith('+')) {
    if (!d.startsWith('+56')) return null;
    d = d.slice(3);
  } else if (d.startsWith('56') && d.length === 11) {
    d = d.slice(2);
  }
  if (!/^[2-9]\d{8}$/.test(d)) return null;
  return d;
}
function formatPhone(d) {
  if (d[0] === '9' || d[0] === '2') return `+56 ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}`;
  return `+56 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

/* ---------------- Precios y detalles ---------------- */
function formatPrices() {
  $$('data.clp').forEach((el) => {
    const n = Number(el.value);
    if (Number.isFinite(n)) el.textContent = clp.format(n);
  });
  $$('[data-range]').forEach((el) => {
    const [a, b] = el.dataset.range.split('-').map((x) => (x === '' ? null : Number(x)));
    if (a === 0 && b) el.textContent = `Hasta ${clp.format(b)}`;
    else if (a && b) el.textContent = `${clp.format(a)} a ${clp.format(b)}`;
    else if (a && b === null) el.textContent = `Más de ${clp.format(a)}`;
  });
}

/* ---------------- Menú móvil ---------------- */
function initNav() {
  const toggle = $('.nav-toggle');
  const nav = $('#menu-principal');
  const header = $('.site-header');
  if (!toggle || !nav) return;

  const close = (returnFocus = false) => {
    toggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (returnFocus) toggle.focus();
  };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    if (open) nav.querySelector('a')?.focus();
  });
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') close(true);
  });
  document.addEventListener('click', (e) => {
    if (toggle.getAttribute('aria-expanded') === 'true' && !header.contains(e.target)) close();
  });
  const mq = window.matchMedia('(min-width: 960px)');
  mq.addEventListener('change', () => { if (mq.matches) close(); });

  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Sección activa en la navegación
  const links = $$('a[href^="#"]', nav).filter((a) => !a.classList.contains('btn'));
  const sections = links.map((a) => document.getElementById(a.hash.slice(1))).filter(Boolean);
  if ('IntersectionObserver' in window && sections.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => {
          if (a.hash === `#${entry.target.id}`) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((s) => io.observe(s));
  }
}

/* ---------------- Aparición suave ---------------- */
function initReveal() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = $$('.section-head, .statement, .audience__item, .service, .route__step, .case, .modules, .board, .fiction-card');
  if (reduce || !('IntersectionObserver' in window)) return;
  targets.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  targets.forEach((el) => io.observe(el));
}

/* ======================================================
   Brief por pasos
   ====================================================== */
const COMUNAS_RM = [
  'Alhué', 'Buin', 'Calera de Tango', 'Cerrillos', 'Cerro Navia', 'Colina', 'Conchalí', 'Curacaví', 'El Bosque',
  'El Monte', 'Estación Central', 'Huechuraba', 'Independencia', 'Isla de Maipo', 'La Cisterna', 'La Florida',
  'La Granja', 'La Pintana', 'La Reina', 'Lampa', 'Las Condes', 'Lo Barnechea', 'Lo Espejo', 'Lo Prado', 'Macul',
  'Maipú', 'María Pinto', 'Melipilla', 'Ñuñoa', 'Padre Hurtado', 'Paine', 'Pedro Aguirre Cerda', 'Peñaflor',
  'Peñalolén', 'Pirque', 'Providencia', 'Pudahuel', 'Puente Alto', 'Quilicura', 'Quinta Normal', 'Recoleta', 'Renca',
  'San Bernardo', 'San Joaquín', 'San José de Maipo', 'San Miguel', 'San Pedro', 'San Ramón', 'Santiago', 'Talagante',
  'Tiltil', 'Vitacura',
];

const BUDGET_LABELS = {
  'hasta-500': `Hasta ${clp.format(500000)}`,
  '500-1000': `${clp.format(500000)} a ${clp.format(1000000)}`,
  '1000-2500': `${clp.format(1000000)} a ${clp.format(2500000)}`,
  '2500-5000': `${clp.format(2500000)} a ${clp.format(5000000)}`,
  'mas-5000': `Más de ${clp.format(5000000)}`,
  'sin-definir': 'Aún no lo sé',
};

const TEXT_NAME = /^[\p{L}\p{M}0-9 .,'&’()\-+/:!¡?¿#°ºª"]+$/u;
const PERSON_NAME = /^[\p{L}\p{M} .'’\-]+$/u;
const PLACE_NAME = /^[\p{L}\p{M} .'’\-]+$/u;
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/;

const TOTAL_STEPS = 5;

// Esquema de validación: cada regla devuelve '' si es válida o el mensaje de error.
const FIELDS = [
  { name: 'negocio', step: 1, id: 'f-negocio', label: 'Nombre del negocio', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Escribe el nombre de tu negocio.';
    if (s.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
    if (!TEXT_NAME.test(s)) return 'Usa letras, números y signos comunes.';
    return '';
  } },
  { name: 'rubro', step: 1, id: 'f-rubro', label: 'Rubro', validate: (v) => (v ? '' : 'Elige el rubro de tu negocio.') },
  { name: 'rubroOtro', step: 1, id: 'f-rubro-otro', label: 'Rubro (otro)', when: (d) => d.rubro === 'Otro', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Cuéntanos cuál es tu rubro.';
    if (s.length < 3) return 'Describe el rubro con al menos 3 caracteres.';
    return '';
  } },
  { name: 'comuna', step: 1, id: 'f-comuna', label: 'Comuna', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Indica la comuna donde está tu negocio.';
    if (s.length < 3 || !PLACE_NAME.test(s)) return 'Escribe un nombre de comuna válido (solo letras).';
    return '';
  } },
  { name: 'objetivos', step: 2, id: 'g-objetivos', group: true, label: 'Objetivos', validate: (v) => (v.length ? '' : 'Marca al menos un objetivo.') },
  { name: 'objetivoOtro', step: 2, id: 'f-objetivo-otro', label: 'Otro objetivo', validate: (v) => {
    const s = v.trim();
    if (s && s.length < 4) return 'Si agregas otro objetivo, descríbelo con al menos 4 caracteres.';
    return '';
  } },
  { name: 'servicios', step: 2, id: 'g-servicios', group: true, label: 'Servicios de interés', validate: (v) => (v.length ? '' : 'Elige al menos un servicio de interés.') },
  { name: 'publico', step: 3, id: 'f-publico', label: 'Público objetivo', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Describe a tu público objetivo.';
    if (s.length < 20) return `Agrega un poco más de detalle (mínimo 20 caracteres; llevas ${s.length}).`;
    return '';
  } },
  { name: 'tono', step: 3, id: 'g-tono', group: true, label: 'Tono', validate: (v) => (v ? '' : 'Elige el tono que mejor representa a tu marca.') },
  { name: 'tonoNotas', step: 3, id: 'f-tono-notas', label: 'Notas sobre el tono', validate: () => '' },
  { name: 'referencias', step: 4, id: 'f-referencias', label: 'Referencias', validate: (v) => (v.length > 1000 ? 'Las referencias no pueden superar los 1000 caracteres.' : '') },
  { name: 'plazo', step: 4, id: 'f-plazo', label: 'Plazo deseado', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Indica una fecha de plazo en formato dd-mm-aaaa.';
    const d = parseDMY(s);
    if (!d) return 'La fecha no es válida. Usa el formato dd-mm-aaaa, por ejemplo 15-12-2026.';
    const today = startOfToday();
    if (d < today) return `La fecha ya pasó. Elige hoy (${toDMY(today)}) o una fecha futura.`;
    const max = new Date(today.getFullYear() + 3, today.getMonth(), today.getDate());
    if (d > max) return 'Elige una fecha dentro de los próximos tres años.';
    return '';
  } },
  { name: 'presupuesto', step: 4, id: 'g-presupuesto', group: true, label: 'Presupuesto', validate: (v) => (v ? '' : 'Elige un rango de presupuesto (puedes marcar «Aún no lo sé»).') },
  { name: 'nombre', step: 5, id: 'f-nombre', label: 'Tu nombre', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Escribe tu nombre.';
    if (s.length < 2 || !PERSON_NAME.test(s)) return 'Escribe un nombre válido (solo letras).';
    return '';
  } },
  { name: 'correo', step: 5, id: 'f-correo', label: 'Correo', validate: (v) => {
    const s = v.trim();
    if (!s) return 'Escribe tu correo.';
    if (!EMAIL.test(s) || s.includes('..')) return 'Revisa el correo: debe tener la forma nombre@dominio.cl.';
    return '';
  } },
  { name: 'telefono', step: 5, id: 'f-telefono', label: 'Teléfono', validate: (v) => {
    const s = v.trim();
    if (!s) return '';
    return normalizePhone(s) ? '' : 'Ingresa un teléfono chileno de 9 dígitos, por ejemplo +56 9 1234 5678.';
  } },
];

function initBrief() {
  const form = $('#brief-form');
  if (!form) return;

  const stepEls = $$('.step', form);
  const stepButtons = $$('#stepper button');
  const summary = $('#error-summary');
  const btnPrev = $('#btn-prev');
  const btnNext = $('#btn-next');
  const draftStatus = $('#draft-status');
  const result = $('#brief-result');
  const preview = $('#brief-preview');
  const resultMsg = $('#result-msg');
  const manualCopy = $('#manual-copy');
  const manualText = $('#manual-copy-text');
  const dialog = $('#confirm-clear');
  const btnClear = $('#btn-clear-draft');
  const rubroOtroWrap = $('#wrap-rubro-otro');
  const plazoPreview = $('#plazo-preview');

  let current = 1;
  let furthest = 1;
  let finished = false;
  let saveTimer = null;
  const touched = new Set();

  // Datalist de comunas
  const dl = $('#comunas');
  if (dl) dl.innerHTML = COMUNAS_RM.map((c) => `<option value="${c}"></option>`).join('');

  /* ---------- Lectura / escritura de datos ---------- */
  function readData() {
    const fd = new FormData(form);
    return {
      negocio: (fd.get('negocio') || '').toString(),
      rubro: (fd.get('rubro') || '').toString(),
      rubroOtro: (fd.get('rubroOtro') || '').toString(),
      comuna: (fd.get('comuna') || '').toString(),
      objetivos: fd.getAll('objetivos').map(String),
      objetivoOtro: (fd.get('objetivoOtro') || '').toString(),
      servicios: fd.getAll('servicios').map(String),
      publico: (fd.get('publico') || '').toString(),
      tono: (fd.get('tono') || '').toString(),
      tonoNotas: (fd.get('tonoNotas') || '').toString(),
      referencias: (fd.get('referencias') || '').toString(),
      plazo: (fd.get('plazo') || '').toString(),
      presupuesto: (fd.get('presupuesto') || '').toString(),
      nombre: (fd.get('nombre') || '').toString(),
      correo: (fd.get('correo') || '').toString(),
      telefono: (fd.get('telefono') || '').toString(),
    };
  }

  function writeData(data) {
    Object.entries(data || {}).forEach(([name, value]) => {
      const els = form.elements.namedItem(name);
      if (!els) return;
      if (els instanceof RadioNodeList || (els.length !== undefined && !(els instanceof HTMLSelectElement))) {
        $$(`[name="${name}"]`, form).forEach((el) => {
          if (el.type === 'checkbox') el.checked = Array.isArray(value) && value.includes(el.value);
          else if (el.type === 'radio') el.checked = el.value === value;
          else el.value = typeof value === 'string' ? value : '';
        });
      } else if (typeof value === 'string') {
        els.value = value;
      }
    });
  }

  /* ---------- Errores ---------- */
  function fieldControls(field) {
    if (field.group) return $$(`[name="${field.name}"]`, form);
    const el = document.getElementById(field.id);
    return el ? [el] : [];
  }
  function errorEl(field) {
    const base = field.id.replace(/^[fg]-/, '');
    return document.getElementById(`err-${base}`);
  }
  function setFieldError(field, message) {
    const err = errorEl(field);
    const controls = fieldControls(field);
    if (field.group) {
      const group = document.getElementById(field.id);
      if (message) group.setAttribute('aria-invalid', 'true'); else group.removeAttribute('aria-invalid');
    }
    controls.forEach((c) => {
      if (message) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
      if (field.group) {
        // cada opción del grupo anuncia el error del grupo
        const ids = new Set((c.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
        if (message) ids.add(err.id); else ids.delete(err.id);
        if (ids.size) c.setAttribute('aria-describedby', [...ids].join(' ')); else c.removeAttribute('aria-describedby');
      }
    });
    if (err) {
      err.textContent = message;
      err.hidden = !message;
    }
  }
  function isActive(field, data) { return !field.when || field.when(data); }
  function validateField(field, data = readData()) {
    if (!isActive(field, data)) { setFieldError(field, ''); return ''; }
    const msg = field.validate(data[field.name], data);
    setFieldError(field, msg);
    return msg;
  }
  function validateStep(step, { showSummary = true } = {}) {
    const data = readData();
    const errors = [];
    FIELDS.filter((f) => f.step === step).forEach((f) => {
      const msg = validateField(f, data);
      if (msg) errors.push({ field: f, msg });
    });
    if (showSummary) renderSummary(errors);
    return errors;
  }
  function renderSummary(errors) {
    const list = $('ul', summary);
    list.innerHTML = '';
    if (!errors.length) { summary.hidden = true; return; }
    errors.forEach(({ field, msg }) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      const target = fieldControls(field)[0];
      a.href = `#${target ? target.id || field.id : field.id}`;
      a.textContent = `${field.label}: ${msg}`;
      a.addEventListener('click', (e) => {
        e.preventDefault();
        focusField(field);
      });
      li.append(a);
      list.append(li);
    });
    summary.hidden = false;
  }
  function focusField(field) {
    const target = fieldControls(field)[0];
    if (!target) return;
    target.focus({ preventScroll: true });
    (field.group ? document.getElementById(field.id) : target).scrollIntoView({ block: 'center', behavior: prefersReduced() ? 'auto' : 'smooth' });
  }
  const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Los radios y checkboxes ocultos no tienen id: asignar uno para los enlaces del resumen.
  $$('input[type="checkbox"], input[type="radio"]', form).forEach((el, i) => { if (!el.id) el.id = `opt-${el.name}-${i}`; });

  /* ---------- Navegación de pasos ---------- */
  function showStep(n, { focus = true } = {}) {
    current = Math.min(Math.max(1, n), TOTAL_STEPS);
    furthest = Math.max(furthest, current);
    stepEls.forEach((el) => el.classList.toggle('is-active', Number(el.dataset.step) === current));
    stepButtons.forEach((b) => {
      const s = Number(b.dataset.goto);
      if (s === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('is-done', s < furthest && s !== current);
      b.disabled = s > furthest;
      const state = s === current ? ' (paso actual)' : s < furthest ? ' (visitado)' : ' (bloqueado hasta completar los pasos anteriores)';
      b.setAttribute('aria-label', `Paso ${s}: ${b.querySelector('em').textContent}${state}`);
    });
    btnPrev.hidden = current === 1;
    btnNext.firstChild.textContent = current === TOTAL_STEPS ? 'Ver mi brief ' : 'Siguiente ';
    summary.hidden = true;
    if (focus) {
      const title = $(`#step${current}-title`);
      title?.focus({ preventScroll: true });
      const panel = $('.brief__panel');
      const top = panel.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) panel.scrollIntoView({ block: 'start', behavior: prefersReduced() ? 'auto' : 'smooth' });
    }
  }

  function goNext() {
    const errors = validateStep(current);
    if (errors.length) {
      focusField(errors[0].field);
      return;
    }
    if (current < TOTAL_STEPS) {
      showStep(current + 1);
      saveDraft();
      return;
    }
    // Último paso: validar todo antes de generar.
    for (let s = 1; s <= TOTAL_STEPS; s++) {
      const errs = validateStep(s, { showSummary: false });
      if (errs.length) {
        showStep(s);
        renderSummary(errs);
        focusField(errs[0].field);
        return;
      }
    }
    finish();
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); goNext(); });
  btnPrev.addEventListener('click', () => { if (current > 1) showStep(current - 1); });
  stepButtons.forEach((b) => b.addEventListener('click', () => {
    const target = Number(b.dataset.goto);
    if (target === current || target > furthest) return;
    if (target > current) {
      // avanzar solo si los pasos intermedios son válidos
      for (let s = current; s < target; s++) {
        const errs = validateStep(s, { showSummary: false });
        if (errs.length) { showStep(s); renderSummary(errs); focusField(errs[0].field); return; }
      }
    }
    showStep(target);
  }));

  /* ---------- Validación en vivo ---------- */
  function fieldByControl(el) {
    return FIELDS.find((f) => (f.group ? f.name === el.name : f.id === el.id));
  }
  form.addEventListener('focusout', (e) => {
    const f = fieldByControl(e.target);
    if (!f || f.group) return;
    if (e.target.value.trim() || touched.has(f.name)) { touched.add(f.name); validateField(f); }
  });
  form.addEventListener('input', (e) => {
    const f = fieldByControl(e.target);
    if (f) {
      const invalid = f.group ? document.getElementById(f.id).getAttribute('aria-invalid') === 'true' : e.target.getAttribute('aria-invalid') === 'true';
      if (invalid) validateField(f);
    }
    updateCounters();
    scheduleSave();
  });
  form.addEventListener('change', (e) => {
    const f = fieldByControl(e.target);
    if (f && (f.group || e.target.tagName === 'SELECT')) {
      const invalid = f.group ? document.getElementById(f.id).getAttribute('aria-invalid') === 'true' : e.target.getAttribute('aria-invalid') === 'true';
      if (invalid) validateField(f);
    }
    if (e.target.id === 'f-rubro') syncRubroOtro();
    scheduleSave();
  });

  function syncRubroOtro() {
    const show = $('#f-rubro').value === 'Otro';
    rubroOtroWrap.hidden = !show;
    const input = $('#f-rubro-otro');
    if (show) input.setAttribute('required', ''); else { input.removeAttribute('required'); setFieldError(FIELDS.find((f) => f.name === 'rubroOtro'), ''); }
  }

  function updateCounters() {
    [['f-publico', 'count-publico', 600], ['f-referencias', 'count-referencias', 1000]].forEach(([id, cid, max]) => {
      const el = document.getElementById(id);
      const c = document.getElementById(cid);
      if (el && c) c.textContent = `${el.value.length} / ${max}`;
    });
  }

  // Plazo: máscara dd-mm-aaaa y vista de la fecha en palabras
  const plazo = $('#f-plazo');
  plazo.addEventListener('input', (e) => {
    const el = e.target;
    const atEnd = el.selectionStart === el.value.length;
    if (atEnd && !/[/]/.test(el.value)) {
      const digits = el.value.replace(/\D/g, '').slice(0, 8);
      let out = digits.slice(0, 2);
      if (digits.length > 2) out += `-${digits.slice(2, 4)}`;
      if (digits.length > 4) out += `-${digits.slice(4, 8)}`;
      if (out !== el.value) el.value = out;
    }
    updatePlazoPreview();
  });
  function updatePlazoPreview() {
    const d = parseDMY(plazo.value);
    plazoPreview.textContent = d && d >= startOfToday() ? `→ ${longDate(d)}` : '';
  }
  $('#hint-plazo').textContent = `Formato dd-mm-aaaa. Debe ser hoy (${toDMY(startOfToday())}) o una fecha futura.`;

  /* ---------- Borrador ---------- */
  function hasContent(data) {
    return Object.values(data).some((v) => (Array.isArray(v) ? v.length : String(v).trim()));
  }
  function setDraftStatus(text, warn = false) {
    draftStatus.textContent = text;
    draftStatus.classList.toggle('is-warn', warn);
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveDraft, 400);
  }
  function saveDraft() {
    if (!store.available) return;
    const data = readData();
    if (!hasContent(data)) { store.remove(DRAFT_KEY); setDraftStatus(''); return; }
    const now = new Date();
    const ok = store.set(DRAFT_KEY, { v: 1, data, step: current, furthest, finished, savedAt: now.toISOString() });
    if (ok) setDraftStatus(`Borrador guardado en este navegador · ${timeHM(now)}`);
    else setDraftStatus('No pudimos guardar el borrador en este navegador.', true);
  }
  function loadDraft() {
    if (!store.available) {
      setDraftStatus('El almacenamiento del navegador está bloqueado: el borrador no se guardará al recargar.', true);
      return;
    }
    const draft = store.get(DRAFT_KEY);
    if (!draft || typeof draft !== 'object' || !draft.data) return;
    writeData(draft.data);
    syncRubroOtro();
    updateCounters();
    updatePlazoPreview();
    furthest = Math.min(Math.max(1, Number(draft.furthest) || 1), TOTAL_STEPS);
    const step = Math.min(Math.max(1, Number(draft.step) || 1), furthest);
    showStep(step, { focus: false });
    const saved = draft.savedAt ? new Date(draft.savedAt) : null;
    const when = saved && !Number.isNaN(saved.getTime())
      ? `${saved.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}, ${timeHM(saved)}` : '';
    setDraftStatus(`Recuperamos tu borrador${when ? ` del ${when}` : ''}.`);
    if (draft.finished) {
      // Si el brief estaba terminado y sigue siendo válido, mostrarlo de nuevo.
      const allValid = [1, 2, 3, 4, 5].every((s) => validateStep(s, { showSummary: false }).length === 0);
      if (allValid) finish({ focus: false, save: false });
      else { FIELDS.forEach((f) => setFieldError(f, '')); finished = false; }
    }
  }

  btnClear.addEventListener('click', () => {
    if (typeof dialog.showModal === 'function') {
      dialog.returnValue = '';
      dialog.showModal();
    } else {
      // Navegadores sin <dialog>: usar el diálogo nativo de confirmación como alternativa.
      // eslint-disable-next-line no-alert
      if (window.confirm('¿Borrar el borrador? Se eliminarán las respuestas guardadas en este navegador.')) clearDraft();
    }
  });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') clearDraft();
    else btnClear.focus();
  });

  function clearDraft() {
    clearTimeout(saveTimer);
    store.remove(DRAFT_KEY);
    form.reset();
    touched.clear();
    FIELDS.forEach((f) => setFieldError(f, ''));
    syncRubroOtro();
    updateCounters();
    updatePlazoPreview();
    finished = false;
    furthest = 1;
    result.hidden = true;
    form.hidden = false;
    $('#stepper').hidden = false;
    manualCopy.hidden = true;
    resultMsg.textContent = '';
    showStep(1, { focus: false });
    setDraftStatus('Borrador borrado. El formulario quedó en blanco.');
    $('#f-negocio').focus();
  }

  /* ---------- Generación del brief ---------- */
  function buildBrief(data) {
    const created = new Date();
    const d = parseDMY(data.plazo);
    const phone = normalizePhone(data.telefono);
    const objetivos = [...data.objetivos];
    if (data.objetivoOtro.trim()) objetivos.push(`Otro: ${data.objetivoOtro.trim()}`);
    const rubro = data.rubro === 'Otro' ? `Otro: ${data.rubroOtro.trim()}` : data.rubro;
    return {
      title: `Brief de proyecto: ${data.negocio.trim()}`,
      created,
      sections: [
        { title: 'Negocio', rows: [['Nombre', data.negocio.trim()], ['Rubro', rubro], ['Comuna', data.comuna.trim()]] },
        { title: 'Objetivos', list: objetivos },
        { title: 'Servicios de interés', list: data.servicios },
        { title: 'Público objetivo', text: data.publico.trim() },
        { title: 'Tono', rows: [['Tono principal', data.tono], ['Notas', data.tonoNotas.trim() || 'Sin notas']] },
        { title: 'Referencias', text: data.referencias.trim() || 'Sin referencias por ahora.' },
        { title: 'Plazo y presupuesto', rows: [
          ['Plazo deseado', d ? `${longDate(d)} (${toDMY(d)})` : data.plazo],
          ['Presupuesto aproximado', BUDGET_LABELS[data.presupuesto] || 'Sin indicar'],
        ] },
        { title: 'Contacto', rows: [
          ['Nombre', data.nombre.trim()],
          ['Correo', data.correo.trim()],
          ['Teléfono', phone ? formatPhone(phone) : 'No indicado'],
        ] },
      ],
    };
  }

  function toMarkdown(brief) {
    const out = [
      `# ${brief.title}`,
      '',
      `Preparado el ${longDate(brief.created)} a las ${timeHM(brief.created)} con el formulario de Estudio Norte (marca ficticia de demostración).`,
      'Este documento se generó en el navegador y no se envió a nadie.',
      '',
    ];
    brief.sections.forEach((s, i) => {
      out.push(`## ${i + 1}. ${s.title}`, '');
      if (s.rows) s.rows.forEach(([k, v]) => out.push(`- **${k}:** ${v}`));
      if (s.list) s.list.forEach((v) => out.push(`- ${v}`));
      if (s.text) out.push(s.text);
      out.push('');
    });
    return out.join('\n');
  }

  function toPlainText(brief) {
    const out = [
      brief.title.toUpperCase(),
      '='.repeat(Math.min(brief.title.length, 60)),
      '',
      `Preparado el ${longDate(brief.created)} a las ${timeHM(brief.created)} con el formulario de Estudio Norte (marca ficticia de demostración).`,
      'Este documento se generó en el navegador y no se envió a nadie.',
      '',
    ];
    brief.sections.forEach((s, i) => {
      const h = `${i + 1}. ${s.title}`;
      out.push(h, '-'.repeat(h.length));
      if (s.rows) s.rows.forEach(([k, v]) => out.push(`${k}: ${v}`));
      if (s.list) s.list.forEach((v) => out.push(`  • ${v}`));
      if (s.text) out.push(s.text);
      out.push('');
    });
    return out.join('\r\n');
  }

  function renderPreview(brief) {
    preview.replaceChildren();
    const h = document.createElement('h4');
    h.textContent = brief.title;
    const sub = document.createElement('p');
    sub.className = 'brief-doc__sub';
    sub.textContent = `Preparado el ${longDate(brief.created)} a las ${timeHM(brief.created)} · Generado en este navegador, no enviado.`;
    preview.append(h, sub);
    brief.sections.forEach((s, i) => {
      const sec = document.createElement('section');
      const h5 = document.createElement('h5');
      h5.textContent = `${i + 1}. ${s.title}`;
      sec.append(h5);
      if (s.rows) {
        const dlEl = document.createElement('dl');
        s.rows.forEach(([k, v]) => {
          const div = document.createElement('div');
          const dt = document.createElement('dt'); dt.textContent = k;
          const dd = document.createElement('dd'); dd.textContent = v;
          div.append(dt, dd); dlEl.append(div);
        });
        sec.append(dlEl);
      }
      if (s.list) {
        const ul = document.createElement('ul');
        s.list.forEach((v) => { const li = document.createElement('li'); li.textContent = v; ul.append(li); });
        sec.append(ul);
      }
      if (s.text) {
        const p = document.createElement('p');
        p.className = 'brief-doc__text';
        p.textContent = s.text;
        sec.append(p);
      }
      preview.append(sec);
    });
  }

  let currentBrief = null;
  function finish({ focus = true, save = true } = {}) {
    finished = true;
    furthest = TOTAL_STEPS;
    currentBrief = buildBrief(readData());
    renderPreview(currentBrief);
    form.hidden = true;
    $('#stepper').hidden = true;
    result.hidden = false;
    resultMsg.textContent = '';
    resultMsg.className = 'result__msg';
    manualCopy.hidden = true;
    if (save) saveDraft();
    if (focus) {
      $('#result-title').focus({ preventScroll: true });
      $('.brief__panel').scrollIntoView({ block: 'start', behavior: prefersReduced() ? 'auto' : 'smooth' });
    }
  }

  $('#btn-edit').addEventListener('click', () => {
    finished = false;
    result.hidden = true;
    form.hidden = false;
    $('#stepper').hidden = false;
    showStep(1);
    saveDraft();
  });

  function slugify(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'negocio';
  }
  function setResultMsg(text, kind) {
    resultMsg.textContent = text;
    resultMsg.className = `result__msg ${kind === 'ok' ? 'is-ok' : kind === 'error' ? 'is-error' : ''}`;
  }

  function download(ext) {
    if (!currentBrief) currentBrief = buildBrief(readData());
    const isMd = ext === 'md';
    const content = isMd ? toMarkdown(currentBrief) : toPlainText(currentBrief);
    const filename = `brief-${slugify(readData().negocio)}-${toISO(new Date())}.${ext}`;
    try {
      const blob = new Blob(['﻿', content], { type: isMd ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      setResultMsg(`Descarga iniciada: ${filename}. El archivo quedó en tu equipo; no se envió a nadie.`, 'ok');
    } catch {
      setResultMsg('No pudimos generar el archivo en este navegador. Usa «Copiar brief» como alternativa.', 'error');
    }
  }
  $('#btn-download-md').addEventListener('click', () => download('md'));
  $('#btn-download-txt').addEventListener('click', () => download('txt'));

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* se intenta la alternativa */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.left = '0';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      return Boolean(ok);
    } catch {
      return false;
    }
  }
  $('#btn-copy').addEventListener('click', async () => {
    if (!currentBrief) currentBrief = buildBrief(readData());
    const text = toMarkdown(currentBrief);
    const ok = await copyText(text);
    if (ok) {
      manualCopy.hidden = true;
      setResultMsg('Brief copiado al portapapeles. Pégalo donde quieras compartirlo.', 'ok');
    } else {
      manualText.value = text;
      manualCopy.hidden = false;
      manualText.focus();
      manualText.select();
      setResultMsg('No pudimos copiar automáticamente. El texto quedó seleccionado abajo: usa Ctrl+C (o mantén presionado en el celular) para copiarlo.', 'error');
    }
  });

  /* ---------- Inicio ---------- */
  showStep(1, { focus: false });
  updateCounters();
  loadDraft();
}

/* ---------------- Arranque ---------------- */
formatPrices();
initNav();
initReveal();
initBrief();
})();
