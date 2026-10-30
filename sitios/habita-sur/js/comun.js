/*
  Habita Sur — utilidades compartidas: formato, almacenamiento local,
  favoritos, consultas, tarjetas, menú y validación de formularios.
*/
(function () {
  'use strict';
  const HS = (window.HS = window.HS || {});
  const PREFIJO = 'habita-sur:';

  /* ---------- formato ---------- */
  const fClp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
  const fNum = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  const fUf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  HS.fmt = {
    clp: (n) => fClp.format(n),
    num: (n) => fNum.format(n),
    uf: (n) => 'UF ' + fUf.format(Math.round(n / HS.UF_REFERENCIAL)),
    precio(p) {
      return p.operacion === 'arriendo' ? fClp.format(p.precio) + ' /mes' : fClp.format(p.precio);
    },
    fechaLarga(iso) {
      const [a, m, d] = iso.split('-').map(Number);
      return new Date(a, m - 1, d).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
    },
    fechaHora(ms) {
      const f = new Date(ms);
      const dd = String(f.getDate()).padStart(2, '0');
      const mm = String(f.getMonth() + 1).padStart(2, '0');
      const hh = String(f.getHours()).padStart(2, '0');
      const mi = String(f.getMinutes()).padStart(2, '0');
      return dd + '-' + mm + '-' + f.getFullYear() + ', ' + hh + ':' + mi;
    },
    superficie(p) {
      if (p.m2Construidos && p.m2Terreno) return fNum.format(p.m2Construidos) + ' m² const. · ' + fNum.format(p.m2Terreno) + ' m² terreno';
      if (p.m2Construidos) return fNum.format(p.m2Construidos) + ' m² útiles';
      if (p.m2Terreno >= 10000) return (p.m2Terreno / 10000).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + ' ha';
      return fNum.format(p.m2Terreno) + ' m² de terreno';
    },
  };
  HS.esc = function (t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };
  HS.superficieOrden = (p) => p.m2Construidos || p.m2Terreno || 0;

  /* ---------- almacenamiento ---------- */
  let almacenDisponible = true;
  try {
    const k = PREFIJO + '__prueba';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
  } catch (e) {
    almacenDisponible = false;
  }
  const memoria = {};
  HS.almacen = {
    get disponible() {
      return almacenDisponible;
    },
    leer(clave, porDefecto) {
      try {
        const v = window.localStorage.getItem(PREFIJO + clave);
        return v === null ? porDefecto : JSON.parse(v);
      } catch (e) {
        return clave in memoria ? memoria[clave] : porDefecto;
      }
    },
    guardar(clave, valor) {
      try {
        window.localStorage.setItem(PREFIJO + clave, JSON.stringify(valor));
        return true;
      } catch (e) {
        memoria[clave] = valor;
        return false;
      }
    },
  };

  /* ---------- favoritos ---------- */
  function listaFavoritos() {
    const v = HS.almacen.leer('favoritos', []);
    return Array.isArray(v) ? v.filter((id) => HS.buscarPropiedad(id)) : [];
  }
  HS.favoritos = {
    lista: listaFavoritos,
    tiene: (id) => listaFavoritos().includes(id),
    alternar(id) {
      const l = listaFavoritos();
      const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1);
      else l.push(id);
      HS.almacen.guardar('favoritos', l);
      document.dispatchEvent(new CustomEvent('hs:favoritos', { detail: { id, activo: i < 0 } }));
      return i < 0;
    },
  };
  function sincronizarFavoritos() {
    const l = listaFavoritos();
    document.querySelectorAll('[data-fav-contador]').forEach((el) => {
      el.textContent = String(l.length);
    });
    document.querySelectorAll('[data-fav-enlace]').forEach((el) => {
      el.setAttribute('aria-label', 'Mis favoritos: ' + (l.length === 1 ? '1 propiedad guardada' : l.length + ' propiedades guardadas'));
    });
    document.querySelectorAll('button[data-fav]').forEach((b) => {
      const on = l.includes(b.dataset.fav);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      const txt = b.querySelector('[data-fav-texto]');
      if (txt) txt.textContent = on ? 'Guardada en favoritos' : 'Guardar en favoritos';
    });
  }
  HS.sincronizarFavoritos = sincronizarFavoritos;
  document.addEventListener('hs:favoritos', sincronizarFavoritos);
  window.addEventListener('storage', (e) => {
    if (e.key === PREFIJO + 'favoritos') {
      sincronizarFavoritos();
      document.dispatchEvent(new CustomEvent('hs:favoritos-externo'));
    }
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-fav]');
    if (!b) return;
    const p = HS.buscarPropiedad(b.dataset.fav);
    if (!p) return;
    const activo = HS.favoritos.alternar(p.id);
    HS.anunciar(activo ? '«' + p.titulo + '» se guardó en tus favoritos.' : '«' + p.titulo + '» se quitó de tus favoritos.');
  });

  /* ---------- consultas ---------- */
  HS.consultas = {
    lista() {
      const v = HS.almacen.leer('consultas', []);
      return Array.isArray(v) ? v : [];
    },
    agregar(c) {
      const l = HS.consultas.lista();
      l.unshift(c);
      return HS.almacen.guardar('consultas', l);
    },
    eliminar(id) {
      HS.almacen.guardar('consultas', HS.consultas.lista().filter((c) => c.id !== id));
    },
    borrarTodas() {
      HS.almacen.guardar('consultas', []);
    },
  };

  /* ---------- anuncios para lectores de pantalla ---------- */
  HS.anunciar = function (texto) {
    let r = document.getElementById('anuncios');
    if (!r) {
      r = document.createElement('div');
      r.id = 'anuncios';
      r.className = 'sr-only';
      r.setAttribute('aria-live', 'polite');
      document.body.appendChild(r);
    }
    r.textContent = '';
    window.setTimeout(() => {
      r.textContent = texto;
    }, 60);
  };

  /* ---------- íconos ---------- */
  const ICONOS = {
    cama: '<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M3 18v2M21 18v2M6 9V6.5A1.5 1.5 0 0 1 7.5 5h3A1.5 1.5 0 0 1 12 6.5V9"/>',
    bano: '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM6 12V5.5A1.5 1.5 0 0 1 7.5 4h0A1.5 1.5 0 0 1 9 5.5M7 19l-1 2M17 19l1 2"/>',
    area: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/><path d="M8 8h8v8H8z" opacity=".5"/>',
    auto: '<path d="M5 16h14M6 16v2.5M18 16v2.5M4 16v-3l2-5h12l2 5v3"/><circle cx="7.5" cy="13" r=".8"/><circle cx="16.5" cy="13" r=".8"/>',
    corazon: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    ubicacion: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
    flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    izq: '<path d="M15 5l-7 7 7 7"/>',
    der: '<path d="M9 5l7 7-7 7"/>',
    ampliar: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    filtro: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    papelera: '<path d="M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13"/>',
  };
  HS.icono = function (nombre, clase) {
    return (
      '<svg class="icono ' + (clase || '') + '" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONOS[nombre] || '') +
      '</svg>'
    );
  };

  /* ---------- tarjeta de propiedad ---------- */
  HS.datosClave = function (p) {
    const d = [];
    if (p.dormitorios) d.push(['cama', p.dormitorios, p.dormitorios === 1 ? 'dormitorio' : 'dormitorios']);
    if (p.banos) d.push(['bano', p.banos, p.banos === 1 ? 'baño' : 'baños']);
    if (p.m2Construidos) d.push(['area', HS.fmt.num(p.m2Construidos) + ' m²', 'construidos']);
    else if (p.m2Terreno) d.push(['area', p.m2Terreno >= 10000 ? HS.fmt.superficie(p) : HS.fmt.num(p.m2Terreno) + ' m²', 'de terreno']);
    if (p.estacionamientos) d.push(['auto', p.estacionamientos, p.estacionamientos === 1 ? 'estacionamiento' : 'estacionamientos']);
    return d;
  };
  HS.tarjeta = function (p, opciones) {
    const o = opciones || {};
    const comuna = HS.comunas[p.comuna].nombre;
    const fav = HS.favoritos.tiene(p.id);
    const foto = p.fotos[0];
    const datos = HS.datosClave(p)
      .map((d) => '<li>' + HS.icono(d[0]) + '<span><strong>' + d[1] + '</strong> ' + d[2] + '</span></li>')
      .join('');
    const nivel = o.nivel || 'h3';
    return (
      '<article class="tarjeta" data-id="' + p.id + '">' +
      '<div class="tarjeta__foto">' +
      HS.escena(foto, p.id + '-0', 'Ilustración: ' + foto.alt) +
      '<span class="etiqueta etiqueta--' + p.operacion + '">' + HS.operaciones[p.operacion] + '</span>' +
      '<span class="etiqueta etiqueta--ficticia">Ejemplo ficticio</span>' +
      '</div>' +
      '<button type="button" class="boton-fav" data-fav="' + p.id + '" aria-pressed="' + (fav ? 'true' : 'false') + '" aria-label="Guardar «' + HS.esc(p.titulo) + '» en favoritos">' +
      HS.icono('corazon') +
      '</button>' +
      '<div class="tarjeta__cuerpo">' +
      '<p class="tarjeta__tipo">' + HS.esc(p.subtipo) + ' · ' + HS.esc(comuna) + '</p>' +
      '<' + nivel + ' class="tarjeta__titulo"><a href="propiedad.html?id=' + p.id + '">' + HS.esc(p.titulo) + '</a></' + nivel + '>' +
      '<p class="tarjeta__precio">' + HS.fmt.precio(p) + (p.operacion === 'venta' ? ' <span class="tarjeta__uf">≈ ' + HS.fmt.uf(p.precio) + '*</span>' : '') + '</p>' +
      '<ul class="tarjeta__datos">' + datos + '</ul>' +
      '</div>' +
      '</article>'
    );
  };

  /* ---------- menú móvil ---------- */
  function iniciarMenu() {
    const boton = document.querySelector('[data-menu-boton]');
    const menu = document.getElementById('menu-principal');
    if (!boton || !menu) return;
    const cerrar = (devolverFoco) => {
      boton.setAttribute('aria-expanded', 'false');
      menu.classList.remove('abierto');
      if (devolverFoco) boton.focus();
    };
    boton.addEventListener('click', () => {
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      boton.setAttribute('aria-expanded', abierto ? 'false' : 'true');
      menu.classList.toggle('abierto', !abierto);
      if (!abierto) {
        const primero = menu.querySelector('a');
        if (primero) primero.focus();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && boton.getAttribute('aria-expanded') === 'true') cerrar(true);
    });
    document.addEventListener('click', (e) => {
      if (boton.getAttribute('aria-expanded') === 'true' && !menu.contains(e.target) && !boton.contains(e.target)) cerrar(false);
    });
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) cerrar(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', () => cerrar(false));
  }

  function avisoAlmacenamiento() {
    if (almacenDisponible) return;
    const main = document.getElementById('contenido');
    if (!main) return;
    const p = document.createElement('p');
    p.className = 'aviso-almacen';
    p.textContent = 'Tu navegador bloquea el almacenamiento local: puedes usar favoritos y el formulario, pero se perderán al recargar la página.';
    main.prepend(p);
  }

  /* ---------- validación de formularios ---------- */
  const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  HS.normalizarTelefono = function (valor) {
    let d = String(valor || '').replace(/[\s\-().]/g, '');
    if (d.startsWith('+56')) d = d.slice(3);
    else if (d.startsWith('0056')) d = d.slice(4);
    else if (d.startsWith('56') && d.length === 11) d = d.slice(2);
    if (!/^\d{9}$/.test(d)) return null;
    if (d[0] === '0' || d[0] === '1') return null;
    if (d[0] === '9') return '+56 9 ' + d.slice(1, 5) + ' ' + d.slice(5);
    if (d[0] === '2') return '+56 2 ' + d.slice(1, 5) + ' ' + d.slice(5);
    return '+56 ' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
  };
  function hoyISO() {
    const h = new Date();
    return h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0') + '-' + String(h.getDate()).padStart(2, '0');
  }

  const MOTIVOS = {
    visita: 'Coordinar una visita',
    informacion: 'Pedir más información',
    financiamiento: 'Consultar por financiamiento',
    publicar: 'Publicar o tasar mi propiedad',
    otro: 'Otro motivo',
  };
  HS.motivos = MOTIVOS;

  HS.opcionesPropiedades = function (seleccion) {
    let h = '<option value="">Ninguna en particular (consulta general)</option>';
    for (const c of HS.ordenComunas) {
      const ps = HS.propiedades.filter((p) => p.comuna === c);
      if (!ps.length) continue;
      h += '<optgroup label="' + HS.esc(HS.comunas[c].nombre) + '">';
      for (const p of ps) {
        h += '<option value="' + p.id + '"' + (p.id === seleccion ? ' selected' : '') + '>' + HS.esc(p.titulo) + ' (' + HS.operaciones[p.operacion].toLowerCase() + ')</option>';
      }
      h += '</optgroup>';
    }
    return h;
  };

  HS.formularioHTML = function (pre) {
    const campo = (nombre, etiqueta, control, ayuda) =>
      '<div class="campo"><label for="' + pre + '-' + nombre + '">' + etiqueta + '</label>' +
      control +
      (ayuda ? '<p class="ayuda" id="' + pre + '-' + nombre + '-ayuda">' + ayuda + '</p>' : '') +
      '<p class="error" id="' + pre + '-' + nombre + '-error" hidden></p></div>';
    const desc = (nombre, ayuda) => ' aria-describedby="' + (ayuda ? pre + '-' + nombre + '-ayuda ' : '') + pre + '-' + nombre + '-error"';
    const motivos = Object.keys(MOTIVOS)
      .map((k) => '<option value="' + k + '">' + MOTIVOS[k] + '</option>')
      .join('');
    return (
      '<form class="formulario" id="' + pre + '-form" novalidate data-exito="' + pre + '-exito">' +
      '<div class="resumen-errores" data-resumen role="alert" hidden></div>' +
      '<div class="formulario__fila">' +
      campo('nombre', 'Nombre', '<input id="' + pre + '-nombre" name="nombre" type="text" autocomplete="name" required' + desc('nombre') + '>') +
      campo('correo', 'Correo electrónico', '<input id="' + pre + '-correo" name="correo" type="email" autocomplete="email" required' + desc('correo') + '>') +
      '</div><div class="formulario__fila">' +
      campo('telefono', 'Teléfono', '<input id="' + pre + '-telefono" name="telefono" type="tel" inputmode="tel" autocomplete="tel" placeholder="+56 9 1234 5678" required' + desc('telefono', true) + '>', 'Celular o fijo chileno, 9 dígitos.') +
      campo('motivo', 'Motivo', '<select id="' + pre + '-motivo" name="motivo" required' + desc('motivo') + '><option value="">Elige un motivo</option>' + motivos + '</select>') +
      '</div>' +
      campo('propiedad', 'Propiedad asociada <span class="opcional">(opcional)</span>', '<select id="' + pre + '-propiedad" name="propiedad"' + desc('propiedad') + '></select>') +
      '<div data-campo-fecha hidden>' +
      campo('fecha', 'Fecha preferida para la visita <span class="opcional">(opcional)</span>', '<input id="' + pre + '-fecha" name="fecha" type="date"' + desc('fecha', true) + '>', 'Debe ser hoy o una fecha posterior.') +
      '</div>' +
      campo('mensaje', 'Mensaje', '<textarea id="' + pre + '-mensaje" name="mensaje" rows="5" required' + desc('mensaje') + '></textarea><span class="contador-texto" data-contador aria-hidden="true">0 / 600</span>') +
      '<p class="nota-demo">' + HS.icono('check') + '<span>Sitio de demostración: tu consulta se guarda <strong>solo en este navegador</strong> y no se envía a ningún corredor ni a nadie.</span></p>' +
      '<div><button class="boton" type="submit">Guardar consulta</button></div>' +
      '</form>' +
      '<div class="exito" id="' + pre + '-exito" hidden>' +
      '<h3 tabindex="-1">' + HS.icono('check') + 'Consulta guardada en este navegador</h3>' +
      '<p data-exito-detalle></p>' +
      '<p><strong>No se envió a ningún corredor</strong>, ni a Habita Sur ni a nadie más: este es un sitio de demostración y las propiedades son ficticias.</p>' +
      '<p data-exito-persistencia></p>' +
      '<div class="exito__acciones"><a class="boton" href="consultas.html">Ver mis consultas</a><button type="button" class="boton boton--secundario" data-otra-consulta>Escribir otra consulta</button></div>' +
      '</div>'
    );
  };

  HS.iniciarFormulario = function (form, opciones) {
    const o = opciones || {};
    if (!form) return;
    const sel = form.querySelector('[name="propiedad"]');
    if (sel) sel.innerHTML = HS.opcionesPropiedades(o.propiedad || '');
    const motivo = form.querySelector('[name="motivo"]');
    if (motivo && o.motivo) motivo.value = o.motivo;
    const fecha = form.querySelector('[name="fecha"]');
    const campoFecha = form.querySelector('[data-campo-fecha]');
    if (fecha) fecha.min = hoyISO();
    const actualizarFecha = () => {
      if (!campoFecha || !motivo) return;
      const ver = motivo.value === 'visita';
      campoFecha.hidden = !ver;
      if (!ver && fecha) {
        fecha.value = '';
        limpiarError(fecha);
      }
    };
    if (motivo) motivo.addEventListener('change', actualizarFecha);
    actualizarFecha();
    const mensaje = form.querySelector('[name="mensaje"]');
    const contador = form.querySelector('[data-contador]');
    if (mensaje && contador) {
      const act = () => {
        contador.textContent = mensaje.value.length + ' / 600';
      };
      mensaje.addEventListener('input', act);
      act();
    }
    const resumen = form.querySelector('[data-resumen]');
    const exito = document.getElementById(form.dataset.exito);

    function campoDe(input) {
      return input.closest('.campo');
    }
    function errorDe(input) {
      return document.getElementById(input.id + '-error');
    }
    function marcarError(input, texto) {
      const e = errorDe(input);
      input.setAttribute('aria-invalid', 'true');
      if (e) {
        e.textContent = texto;
        e.hidden = false;
      }
      const c = campoDe(input);
      if (c) c.classList.add('campo--error');
    }
    function limpiarError(input) {
      const e = errorDe(input);
      input.removeAttribute('aria-invalid');
      if (e) {
        e.textContent = '';
        e.hidden = true;
      }
      const c = campoDe(input);
      if (c) c.classList.remove('campo--error');
    }
    function validarCampo(input) {
      const v = input.value.trim();
      switch (input.name) {
        case 'nombre':
          if (!v) return 'Escribe tu nombre.';
          if (v.length < 2) return 'El nombre debe tener al menos 2 letras.';
          if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' .-]+$/.test(v)) return 'Usa solo letras, espacios, apóstrofo o guion.';
          return '';
        case 'correo':
          if (!v) return 'Escribe tu correo electrónico.';
          if (!RE_CORREO.test(v)) return 'Revisa el correo: debe tener la forma nombre@dominio.cl.';
          return '';
        case 'telefono':
          if (!v) return 'Escribe un teléfono de contacto.';
          if (!HS.normalizarTelefono(v)) return 'Ingresa un teléfono chileno de 9 dígitos, por ejemplo +56 9 1234 5678.';
          return '';
        case 'motivo':
          return v ? '' : 'Elige el motivo de tu consulta.';
        case 'fecha':
          if (!motivo || motivo.value !== 'visita' || !v) return '';
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Ingresa una fecha válida.';
          if (v < hoyISO()) return 'La fecha de visita no puede ser anterior a hoy.';
          return '';
        case 'mensaje':
          if (!v) return 'Escribe tu mensaje.';
          if (v.length < 15) return 'Cuéntanos un poco más (mínimo 15 caracteres).';
          if (v.length > 600) return 'El mensaje no puede superar los 600 caracteres.';
          return '';
        default:
          return '';
      }
    }
    const campos = Array.from(form.querySelectorAll('input[name], select[name], textarea[name]'));
    campos.forEach((input) => {
      input.addEventListener('blur', () => {
        if (input.getAttribute('aria-invalid') === 'true' || (input.value.trim() && input.name !== 'propiedad')) {
          const m = validarCampo(input);
          if (m) marcarError(input, m);
          else limpiarError(input);
        }
      });
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true' && !validarCampo(input)) limpiarError(input);
      });
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const errores = [];
      campos.forEach((input) => {
        if (input.closest('[hidden]')) return;
        const m = validarCampo(input);
        if (m) {
          marcarError(input, m);
          errores.push([input, m]);
        } else limpiarError(input);
      });
      if (errores.length) {
        if (resumen) {
          resumen.innerHTML =
            '<p class="resumen__titulo">' + (errores.length === 1 ? 'Hay 1 campo por revisar:' : 'Hay ' + errores.length + ' campos por revisar:') + '</p><ul>' +
            errores.map((x) => '<li><a href="#' + x[0].id + '">' + HS.esc(x[1]) + '</a></li>').join('') +
            '</ul>';
          resumen.hidden = false;
        }
        errores[0][0].focus();
        return;
      }
      if (resumen) {
        resumen.hidden = true;
        resumen.innerHTML = '';
      }
      const boton = form.querySelector('[type="submit"]');
      const textoBoton = boton ? boton.textContent : '';
      if (boton) {
        boton.disabled = true;
        boton.textContent = 'Guardando en este navegador…';
      }
      const val = (n) => {
        const el = form.querySelector('[name="' + n + '"]');
        return el ? el.value.trim() : '';
      };
      const consulta = {
        id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        creada: Date.now(),
        nombre: val('nombre'),
        correo: val('correo'),
        telefono: HS.normalizarTelefono(val('telefono')),
        motivo: val('motivo'),
        fecha: motivo && motivo.value === 'visita' ? val('fecha') : '',
        propiedad: val('propiedad'),
        mensaje: val('mensaje'),
      };
      window.setTimeout(() => {
        const persistio = HS.consultas.agregar(consulta);
        if (boton) {
          boton.disabled = false;
          boton.textContent = textoBoton;
        }
        if (exito) {
          const p = HS.buscarPropiedad(consulta.propiedad);
          exito.querySelector('[data-exito-detalle]').innerHTML =
            '<strong>' + HS.esc(MOTIVOS[consulta.motivo]) + '</strong>' +
            (p ? ' sobre «' + HS.esc(p.titulo) + '»' : ' (consulta general)') +
            (consulta.fecha ? ', con visita propuesta para el ' + HS.esc(HS.fmt.fechaLarga(consulta.fecha)) : '') + '.';
          const nota = exito.querySelector('[data-exito-persistencia]');
          if (nota) {
            nota.textContent = persistio
              ? 'Quedó guardada solo en este navegador. Puedes revisarla en «Mis consultas».'
              : 'Tu navegador bloquea el almacenamiento local: la consulta se mantendrá solo hasta que recargues la página.';
          }
          form.hidden = true;
          exito.hidden = false;
          const titulo = exito.querySelector('[tabindex="-1"]');
          if (titulo) titulo.focus();
        }
        form.reset();
        if (sel) sel.value = o.propiedad || '';
        if (motivo && o.motivo) motivo.value = o.motivo;
        actualizarFecha();
        if (contador && mensaje) contador.textContent = '0 / 600';
        document.dispatchEvent(new CustomEvent('hs:consulta', { detail: consulta }));
      }, 450);
    });

    if (exito) {
      const otra = exito.querySelector('[data-otra-consulta]');
      if (otra) {
        otra.addEventListener('click', () => {
          exito.hidden = true;
          form.hidden = false;
          const primero = form.querySelector('input, select, textarea');
          if (primero) primero.focus();
        });
      }
    }
  };

  /* ---------- arranque ---------- */
  function iniciar() {
    iniciarMenu();
    sincronizarFavoritos();
    avisoAlmacenamiento();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();
