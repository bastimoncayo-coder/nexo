/* Habita Sur — catálogo con filtros combinables reflejados en la URL */
(function () {
  'use strict';
  const HS = window.HS;
  const form = document.getElementById('form-filtros');
  if (!form) return;

  const ORDENES = ['destacadas', 'precio-asc', 'precio-desc', 'superficie-desc', 'superficie-asc'];
  const POR_DEFECTO = { operacion: '', tipo: '', comuna: '', min: null, max: null, dorm: 0, favoritos: false, orden: 'destacadas' };

  const el = {
    resultados: document.querySelector('[data-resultados]'),
    vacio: document.querySelector('[data-vacio]'),
    cuenta: document.getElementById('cuenta-resultados'),
    chips: document.querySelector('[data-chips]'),
    orden: document.getElementById('f-orden'),
    min: document.getElementById('f-min'),
    max: document.getElementById('f-max'),
    errorPrecio: document.getElementById('error-precio'),
    toggle: document.querySelector('[data-filtros-toggle]'),
    toggleTexto: document.querySelector('[data-filtros-toggle-texto]'),
    panel: document.getElementById('panel-filtros'),
  };

  /* ---------- estado <-> URL ---------- */
  function numero(v) {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(/[^\d]/g, ''));
    return Number.isFinite(n) && String(v).replace(/[^\d]/g, '') !== '' ? n : null;
  }
  function leerURL() {
    const q = new URLSearchParams(window.location.search);
    const e = Object.assign({}, POR_DEFECTO);
    const op = q.get('operacion');
    if (op && HS.operaciones[op]) e.operacion = op;
    const tipo = q.get('tipo');
    if (tipo && HS.tipos[tipo]) e.tipo = tipo;
    const comuna = q.get('comuna');
    if (comuna && HS.comunas[comuna]) e.comuna = comuna;
    e.min = numero(q.get('min'));
    e.max = numero(q.get('max'));
    const dorm = parseInt(q.get('dorm'), 10);
    if (dorm >= 1 && dorm <= 4) e.dorm = dorm;
    e.favoritos = q.get('favoritos') === '1';
    const orden = q.get('orden');
    if (orden && ORDENES.includes(orden)) e.orden = orden;
    return e;
  }
  function escribirURL(e) {
    const q = new URLSearchParams();
    if (e.operacion) q.set('operacion', e.operacion);
    if (e.tipo) q.set('tipo', e.tipo);
    if (e.comuna) q.set('comuna', e.comuna);
    if (e.min !== null) q.set('min', String(e.min));
    if (e.max !== null) q.set('max', String(e.max));
    if (e.dorm) q.set('dorm', String(e.dorm));
    if (e.favoritos) q.set('favoritos', '1');
    if (e.orden !== 'destacadas') q.set('orden', e.orden);
    const s = q.toString();
    const url = window.location.pathname + (s ? '?' + s : '');
    try {
      window.history.replaceState(null, '', url);
    } catch (err) {
      /* algunos navegadores limitan replaceState en file:// */
    }
  }
  function estadoAFormulario(e) {
    form.querySelectorAll('input[name="operacion"]').forEach((r) => {
      r.checked = r.value === e.operacion;
    });
    form.elements.tipo.value = e.tipo;
    form.elements.comuna.value = e.comuna;
    el.min.value = e.min === null ? '' : e.min;
    el.max.value = e.max === null ? '' : e.max;
    form.elements.dorm.value = e.dorm ? String(e.dorm) : '';
    form.elements.favoritos.checked = e.favoritos;
    el.orden.value = e.orden;
  }
  function formularioAEstado() {
    const op = form.querySelector('input[name="operacion"]:checked');
    return {
      operacion: op ? op.value : '',
      tipo: form.elements.tipo.value,
      comuna: form.elements.comuna.value,
      min: numero(el.min.value),
      max: numero(el.max.value),
      dorm: parseInt(form.elements.dorm.value, 10) || 0,
      favoritos: form.elements.favoritos.checked,
      orden: ORDENES.includes(el.orden.value) ? el.orden.value : 'destacadas',
    };
  }

  /* ---------- filtrado y orden ---------- */
  function filtrar(e) {
    const favs = HS.favoritos.lista();
    const lista = HS.propiedades.filter((p) => {
      if (e.operacion && p.operacion !== e.operacion) return false;
      if (e.tipo && p.tipo !== e.tipo) return false;
      if (e.comuna && p.comuna !== e.comuna) return false;
      if (e.min !== null && p.precio < e.min) return false;
      if (e.max !== null && p.precio > e.max) return false;
      if (e.dorm && (p.dormitorios || 0) < e.dorm) return false;
      if (e.favoritos && !favs.includes(p.id)) return false;
      return true;
    });
    const indice = (p) => HS.propiedades.indexOf(p);
    const ordenes = {
      destacadas: (a, b) => (b.destacada ? 1 : 0) - (a.destacada ? 1 : 0) || indice(a) - indice(b),
      'precio-asc': (a, b) => a.precio - b.precio,
      'precio-desc': (a, b) => b.precio - a.precio,
      'superficie-desc': (a, b) => HS.superficieOrden(b) - HS.superficieOrden(a),
      'superficie-asc': (a, b) => HS.superficieOrden(a) - HS.superficieOrden(b),
    };
    return lista.sort(ordenes[e.orden]);
  }
  HS.filtrarCatalogo = filtrar;

  /* ---------- pintado ---------- */
  function chips(e) {
    const c = [];
    if (e.favoritos) c.push(['favoritos', 'Solo mis favoritos']);
    if (e.operacion) c.push(['operacion', HS.operaciones[e.operacion]]);
    if (e.tipo) c.push(['tipo', HS.tipos[e.tipo]]);
    if (e.comuna) c.push(['comuna', HS.comunas[e.comuna].nombre]);
    if (e.min !== null) c.push(['min', 'Desde ' + HS.fmt.clp(e.min)]);
    if (e.max !== null) c.push(['max', 'Hasta ' + HS.fmt.clp(e.max)]);
    if (e.dorm) c.push(['dorm', e.dorm + '+ dormitorios']);
    return c;
  }
  let estado = leerURL();
  let anuncioPendiente = null;

  function pintar(opciones) {
    const o = opciones || {};
    const lista = filtrar(estado);
    const favs = HS.favoritos.lista();
    const n = lista.length;
    const sufijo = estado.favoritos ? (n === 1 ? ' favorita' : ' favoritas') : '';
    el.cuenta.textContent = n === 0 ? 'Sin resultados' : n === 1 ? '1 propiedad' + sufijo : n + ' propiedades' + sufijo;

    // error de rango de precio
    if (estado.min !== null && estado.max !== null && estado.min > estado.max) {
      el.errorPrecio.textContent = 'El precio mínimo es mayor que el máximo.';
      el.errorPrecio.hidden = false;
      el.min.setAttribute('aria-invalid', 'true');
      el.max.setAttribute('aria-invalid', 'true');
    } else {
      el.errorPrecio.hidden = true;
      el.errorPrecio.textContent = '';
      el.min.removeAttribute('aria-invalid');
      el.max.removeAttribute('aria-invalid');
    }

    const activos = chips(estado);
    el.chips.innerHTML = activos.length
      ? activos
          .map((c) => '<li><button type="button" class="chip" data-quitar="' + c[0] + '" aria-label="Quitar filtro: ' + HS.esc(c[1]) + '">' + HS.esc(c[1]) + HS.icono('cerrar') + '</button></li>')
          .join('') + '<li><button type="button" class="chip chip--limpiar" data-limpiar>Limpiar filtros</button></li>'
      : '';
    el.chips.hidden = !activos.length;
    if (el.toggleTexto) el.toggleTexto.textContent = activos.length ? 'Filtros (' + activos.length + ' activos)' : 'Filtros';

    el.resultados.innerHTML = lista.map((p) => HS.tarjeta(p)).join('');
    el.resultados.hidden = n === 0;

    if (n === 0) {
      const sinFavoritos = estado.favoritos && favs.length === 0;
      el.vacio.className = 'vacio';
      el.vacio.innerHTML =
        '<svg class="ilus" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><rect x="6" y="20" width="108" height="64" rx="6" fill="#F3EEE6" stroke="#DDD5C7"/><path d="M30 64V44l18-14 18 14v20" fill="none" stroke="#1F4A4A" stroke-width="3" stroke-linejoin="round"/><path d="M20 72c8-5 14-5 22 0s14 5 22 0 14-5 22 0" fill="none" stroke="#B8794B" stroke-width="3" stroke-linecap="round"/>' +
        (sinFavoritos ? '<path d="M92 36s-10-6-10-13a5.5 5.5 0 0 1 10-3 5.5 5.5 0 0 1 10 3c0 7-10 13-10 13z" fill="none" stroke="#B8794B" stroke-width="2.5"/>' : '<circle cx="92" cy="30" r="9" fill="none" stroke="#5B6461" stroke-width="2.5"/><path d="m98.5 36.5 7 7" stroke="#5B6461" stroke-width="2.5" stroke-linecap="round"/>') +
        '</svg>' +
        (sinFavoritos
          ? '<h2>Todavía no guardas favoritos</h2><p>Toca el corazón de cualquier propiedad para guardarla aquí. Tus favoritos quedan solo en este navegador.</p><div class="vacio__acciones"><button type="button" class="boton" data-limpiar>Ver todas las propiedades</button></div>'
          : '<h2>No hay propiedades con estos filtros</h2><p>Prueba con otra comuna, otro tipo o un rango de precio más amplio. Recuerda que los arriendos se comparan por su valor mensual.</p><div class="vacio__acciones"><button type="button" class="boton" data-limpiar>Limpiar filtros</button></div>');
      el.vacio.hidden = false;
    } else {
      el.vacio.hidden = true;
      el.vacio.innerHTML = '';
    }

    document.dispatchEvent(new CustomEvent('hs:catalogo-pintado'));
    if (o.anunciar) {
      window.clearTimeout(anuncioPendiente);
      anuncioPendiente = window.setTimeout(() => {
        HS.anunciar(n === 0 ? 'No hay propiedades con estos filtros.' : el.cuenta.textContent + ' con los filtros actuales.');
      }, 350);
    }
  }

  function aplicar(nuevo, opciones) {
    estado = nuevo;
    escribirURL(estado);
    pintar(Object.assign({ anunciar: true }, opciones));
  }

  /* ---------- eventos ---------- */
  let demora = null;
  form.addEventListener('change', (ev) => {
    if (ev.target === el.min || ev.target === el.max) return;
    aplicar(formularioAEstado());
  });
  el.orden.addEventListener('change', () => aplicar(formularioAEstado()));
  [el.min, el.max].forEach((inp) => {
    inp.addEventListener('input', () => {
      window.clearTimeout(demora);
      demora = window.setTimeout(() => aplicar(formularioAEstado()), 400);
    });
    inp.addEventListener('change', () => {
      window.clearTimeout(demora);
      aplicar(formularioAEstado());
    });
  });
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    aplicar(formularioAEstado());
  });

  function limpiar() {
    const orden = estado.orden;
    const nuevo = Object.assign({}, POR_DEFECTO, { orden });
    estadoAFormulario(nuevo);
    aplicar(nuevo);
    el.cuenta.focus();
  }
  document.addEventListener('click', (ev) => {
    const lim = ev.target.closest('[data-limpiar]');
    if (lim) {
      ev.preventDefault();
      limpiar();
      return;
    }
    const q = ev.target.closest('[data-quitar]');
    if (q) {
      const nuevo = Object.assign({}, estado);
      const k = q.dataset.quitar;
      nuevo[k] = POR_DEFECTO[k];
      estadoAFormulario(nuevo);
      aplicar(nuevo);
      const resto = el.chips.querySelector('[data-quitar]');
      (resto || el.cuenta).focus();
    }
  });

  // favoritos: en vista «solo favoritos» la lista cambia al desmarcar
  function alCambiarFavoritos() {
    if (!estado.favoritos) return;
    const activo = document.activeElement;
    const idActivo = activo && activo.dataset ? activo.dataset.fav : null;
    pintar();
    if (idActivo && !document.querySelector('button[data-fav="' + idActivo + '"]')) el.cuenta.focus();
  }
  document.addEventListener('hs:favoritos', alCambiarFavoritos);
  document.addEventListener('hs:favoritos-externo', alCambiarFavoritos);

  // panel de filtros en móvil
  if (el.toggle) {
    el.toggle.addEventListener('click', () => {
      const abierto = el.toggle.getAttribute('aria-expanded') === 'true';
      el.toggle.setAttribute('aria-expanded', abierto ? 'false' : 'true');
      el.panel.classList.toggle('abierto', !abierto);
    });
    el.panel.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && el.toggle.getAttribute('aria-expanded') === 'true' && window.getComputedStyle(el.toggle).display !== 'none') {
        el.toggle.setAttribute('aria-expanded', 'false');
        el.panel.classList.remove('abierto');
        el.toggle.focus();
      }
    });
  }

  window.addEventListener('popstate', () => {
    estado = leerURL();
    estadoAFormulario(estado);
    pintar();
  });

  document.addEventListener('hs:catalogo-pintado', () => {
    document.title = (estado.favoritos ? 'Mis favoritos' : 'Propiedades') + ' · Habita Sur (sitio de demostración)';
  });
  estadoAFormulario(estado);
  pintar();
})();
