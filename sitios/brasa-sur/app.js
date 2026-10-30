/* Brasa Sur — restaurante ficticio. Sitio de demostración de Estudio Norte.
   Sin dependencias. Las solicitudes de reserva se guardan solo en localStorage. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var CLAVE = 'brasa-sur:solicitudes';
  var MAX_DIAS = 60;
  var MAX_PERSONAS = 10;
  var ANTICIPACION_MIN = 60; // minutos mínimos para reservar el mismo día
  var HORARIOS = {
    semana: {
      almuerzo: ['13:00', '13:30', '14:00', '14:30', '15:00'],
      cena: ['19:30', '20:00', '20:30', '21:00', '21:30', '22:00']
    },
    domingo: {
      almuerzo: ['13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'],
      cena: []
    }
  };
  var clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

  /* ---------- Almacenamiento seguro ---------- */
  var almacen = (function () {
    var disponible = false;
    var memoria = [];
    try {
      var k = 'brasa-sur:prueba';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      disponible = true;
    } catch (e) { disponible = false; }

    function esValida(s) {
      return s && typeof s === 'object' && typeof s.codigo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.fecha || '') &&
        typeof s.hora === 'string' && typeof s.nombre === 'string';
    }
    return {
      disponible: disponible,
      leer: function () {
        if (!disponible) return memoria.slice();
        try {
          var datos = JSON.parse(window.localStorage.getItem(CLAVE) || '[]');
          return Array.isArray(datos) ? datos.filter(esValida) : [];
        } catch (e) { return []; }
      },
      guardar: function (lista) {
        memoria = lista.slice();
        if (!disponible) return false;
        try { window.localStorage.setItem(CLAVE, JSON.stringify(lista)); return true; } catch (e) { return false; }
      }
    };
  })();

  /* ---------- Fechas ---------- */
  function hoy0() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function sumarDias(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function dos(n) { return String(n).padStart(2, '0'); }
  function aISO(d) { return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()); }
  function deISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    if (d.getFullYear() !== +m[1] || d.getMonth() !== +m[2] - 1 || d.getDate() !== +m[3]) return null;
    return d;
  }
  function fechaLarga(d) { return d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''); }
  function fechaCorta(d) { return dos(d.getDate()) + '-' + dos(d.getMonth() + 1) + '-' + d.getFullYear(); }

  function horariosDe(fecha) {
    if (!fecha || fecha.getDay() === 1) return null;
    var base = fecha.getDay() === 0 ? HORARIOS.domingo : HORARIOS.semana;
    var esHoy = fecha.getTime() === hoy0().getTime();
    var ahora = Date.now();
    function filtrar(lista) {
      if (!esHoy) return lista.slice();
      return lista.filter(function (h) {
        var p = h.split(':');
        var t = new Date(fecha.getTime()); t.setHours(+p[0], +p[1], 0, 0);
        return t.getTime() - ahora >= ANTICIPACION_MIN * 60000;
      });
    }
    return { almuerzo: filtrar(base.almuerzo), cena: filtrar(base.cena), domingo: fecha.getDay() === 0 };
  }

  /* ---------- Precios ---------- */
  $$('data.plato__precio').forEach(function (el) {
    var n = Number(el.value);
    if (Number.isFinite(n)) el.textContent = clp.format(n);
  });

  /* ---------- Estado de hoy en la portada ---------- */
  (function () {
    var el = $('#hoy-estado');
    if (!el) return;
    var d = new Date();
    var dia = d.toLocaleDateString('es-CL', { weekday: 'long' });
    var texto;
    if (d.getDay() === 1) texto = 'Lunes cerrado. Volvemos mañana a las 13:00.';
    else if (d.getDay() === 0) texto = 'Domingo, almuerzo de 13:00 a 17:00.';
    else texto = dia.charAt(0).toUpperCase() + dia.slice(1) + ', 13:00–16:00 y 19:30–23:30.';
    el.textContent = texto;
  })();

  /* ---------- Menú móvil ---------- */
  (function () {
    var btn = $('#btn-menu');
    var nav = $('#nav-principal');
    if (!btn || !nav) return;
    function fijar(abierto) {
      btn.setAttribute('aria-expanded', String(abierto));
      nav.classList.toggle('abierto', abierto);
      $('.cabecera__menu-texto', btn).textContent = abierto ? 'Cerrar' : 'Menú';
    }
    btn.addEventListener('click', function () { fijar(btn.getAttribute('aria-expanded') !== 'true'); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) fijar(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') { fijar(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (btn.getAttribute('aria-expanded') === 'true' && !e.target.closest('.cabecera')) fijar(false);
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function (mq) { if (mq.matches) fijar(false); });
  })();

  /* ---------- Pestañas de la carta ---------- */
  (function () {
    var lista = $('.pestanas');
    if (!lista) return;
    var tabs = $$('[role="tab"]', lista);
    function activar(tab, enfocar) {
      tabs.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute('aria-selected', String(sel));
        t.tabIndex = sel ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !sel;
      });
      if (enfocar) {
        tab.focus();
        tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    }
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { activar(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var destino = null;
        if (e.key === 'ArrowRight') destino = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') destino = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') destino = tabs[0];
        else if (e.key === 'End') destino = tabs[tabs.length - 1];
        if (destino) { e.preventDefault(); activar(destino, true); }
      });
    });
    activar(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0], false);
  })();

  /* ---------- Galería con visor ---------- */
  (function () {
    var visor = $('#visor');
    var items = $$('.galeria__item');
    if (!visor || !items.length) return;
    var img = $('#visor-img'), titulo = $('#visor-titulo'), desc = $('#visor-desc'), contador = $('#visor-contador');
    var actual = 0;
    var soportaDialog = typeof visor.showModal === 'function';

    function mostrar(i) {
      actual = (i + items.length) % items.length;
      var it = items[actual];
      img.src = it.getAttribute('data-src');
      img.alt = it.getAttribute('data-alt');
      titulo.textContent = it.getAttribute('data-titulo');
      desc.textContent = it.getAttribute('data-desc');
      contador.textContent = 'Lámina ' + (actual + 1) + ' de ' + items.length;
    }
    function abrir(i) {
      mostrar(i);
      if (soportaDialog) visor.showModal(); else visor.setAttribute('open', '');
      document.body.classList.add('visor-abierto');
      $('#visor-cerrar').focus();
    }
    function cerrar() {
      if (soportaDialog) { if (visor.open) visor.close(); } else { visor.removeAttribute('open'); alCerrar(); }
    }
    function alCerrar() {
      document.body.classList.remove('visor-abierto');
      items[actual].focus();
    }
    items.forEach(function (b, i) { b.addEventListener('click', function () { abrir(i); }); });
    $('#visor-cerrar').addEventListener('click', cerrar);
    $('#visor-ant').addEventListener('click', function () { mostrar(actual - 1); });
    $('#visor-sig').addEventListener('click', function () { mostrar(actual + 1); });
    visor.addEventListener('close', alCerrar);
    visor.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(actual - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(actual + 1); }
      else if (e.key === 'Escape' && !soportaDialog) { e.preventDefault(); cerrar(); }
      else if (e.key === 'Tab') {
        // mantiene el foco dentro del visor
        var foco = $$('button', visor);
        var primero = foco[0], ultimo = foco[foco.length - 1];
        if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    });
    visor.addEventListener('click', function (e) {
      if (e.target === visor || e.target.classList.contains('visor__marco') || e.target.classList.contains('visor__figura')) cerrar();
    });
  })();

  /* ---------- Formulario de reserva ---------- */
  var form = $('#form-reserva');
  if (!form) return;

  var c = {
    nombre: $('#f-nombre'),
    telefono: $('#f-telefono'),
    correo: $('#f-correo'),
    fecha: $('#f-fecha'),
    personas: $('#f-personas'),
    hora: $('#f-hora'),
    comentarios: $('#f-comentarios')
  };
  var radiosTurno = $$('input[name="turno"]', form);
  var grupoTurno = $('#f-turno');
  var ayudaTurno = $('#f-turno-ayuda');
  var ecoFecha = $('#f-fecha-texto');
  var avisoGrupos = $('#aviso-grupos');
  var resumen = $('#resumen-errores');
  var btnEnviar = $('#btn-enviar');
  var confirmacion = $('#confirmacion');
  var tocados = {};
  var intentoEnvio = false;
  var ORDEN = ['nombre', 'telefono', 'correo', 'fecha', 'personas', 'turno', 'hora', 'comentarios'];
  var ETIQUETAS = { nombre: 'Nombre', telefono: 'Teléfono', correo: 'Correo', fecha: 'Fecha', personas: 'Personas', turno: 'Turno', hora: 'Hora', comentarios: 'Comentarios' };

  // Límites de fecha
  function fijarLimitesFecha() {
    c.fecha.min = aISO(hoy0());
    c.fecha.max = aISO(sumarDias(hoy0(), MAX_DIAS));
  }
  fijarLimitesFecha();

  function turnoElegido() {
    var r = radiosTurno.filter(function (x) { return x.checked; })[0];
    return r ? r.value : '';
  }

  /* Validadores: devuelven '' si el valor es válido o el mensaje de error */
  function normalizarTelefono(v) {
    var d = String(v).replace(/[\s\-().]/g, '');
    if (d.indexOf('+56') === 0) d = d.slice(3);
    else if (d.indexOf('0056') === 0) d = d.slice(4);
    else if (d.indexOf('56') === 0 && d.length === 11) d = d.slice(2);
    return d;
  }
  function formatearTelefono(d) {
    if (d.charAt(0) === '9') return '+56 9 ' + d.slice(1, 5) + ' ' + d.slice(5);
    if (d.charAt(0) === '2') return '+56 2 ' + d.slice(1, 5) + ' ' + d.slice(5);
    return '+56 ' + d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
  }
  var V = {
    nombre: function () {
      var v = c.nombre.value.trim().replace(/\s+/g, ' ');
      if (!v) return 'Escribe tu nombre para la reserva.';
      if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀ-ÿ' .-]+$/.test(v)) return 'El nombre solo puede tener letras, espacios, apóstrofos y guiones.';
      if ((v.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀ-ÿ]/g) || []).length < 2) return 'El nombre debe tener al menos 2 letras.';
      return '';
    },
    telefono: function () {
      var v = c.telefono.value.trim();
      if (!v) return 'Escribe un teléfono de contacto.';
      if (/[^\d\s+\-().]/.test(v)) return 'El teléfono solo puede tener números, espacios y el signo +.';
      var d = normalizarTelefono(v);
      if (!/^\d{9}$/.test(d)) return 'Ingresa un teléfono chileno de 9 dígitos, por ejemplo +56 9 1234 5678.';
      if (!/^[2-79]/.test(d)) return 'Revisa el número: los celulares parten con 9 y los fijos con su código de área (2 en Santiago).';
      return '';
    },
    correo: function () {
      var v = c.correo.value.trim();
      if (!v) return 'Escribe tu correo electrónico.';
      if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(v) || /\.\./.test(v)) return 'Revisa el correo: debe tener la forma nombre@dominio.cl.';
      return '';
    },
    fecha: function () {
      var v = c.fecha.value;
      if (!v) return c.fecha.validity && c.fecha.validity.badInput ? 'La fecha está incompleta. Usa el formato dd-mm-aaaa.' : 'Elige la fecha de tu visita.';
      var d = deISO(v);
      if (!d) return 'Esa fecha no existe. Usa el formato dd-mm-aaaa.';
      var h = hoy0();
      var max = sumarDias(h, MAX_DIAS);
      if (d < h) return 'La fecha no puede ser anterior a hoy.';
      if (d > max) return 'Recibimos solicitudes hasta 60 días desde hoy, es decir, hasta el ' + fechaLarga(max) + ' (' + fechaCorta(max) + ').';
      if (d.getDay() === 1) return 'Los lunes Brasa Sur está cerrado. Elige otro día.';
      var hs = horariosDe(d);
      if (!hs.almuerzo.length && !hs.cena.length) return 'Para hoy ya no quedan horarios con una hora de anticipación. Elige otro día.';
      return '';
    },
    personas: function () {
      var v = c.personas.value.trim();
      if (!v) return c.personas.validity && c.personas.validity.badInput ? 'Escribe la cantidad de personas con números.' : 'Indica cuántas personas vienen.';
      var n = Number(v);
      if (!Number.isInteger(n)) return 'Escribe un número entero de personas.';
      if (n < 1) return 'Debe venir al menos 1 persona.';
      if (n > MAX_PERSONAS) return 'Este formulario acepta hasta 10 personas. Para grupos más grandes, revisa el recuadro de grupos.';
      return '';
    },
    turno: function () {
      if (V.fecha()) return 'Elige primero una fecha válida y después el turno.';
      var t = turnoElegido();
      if (!t) return 'Elige almuerzo o cena.';
      var hs = horariosDe(deISO(c.fecha.value));
      if (!hs[t].length) return t === 'cena' ? 'Ese día no hay servicio de cena.' : 'Ese día ya no quedan horarios de almuerzo.';
      return '';
    },
    hora: function () {
      if (V.fecha() || V.turno()) return 'Elige la hora después de la fecha y el turno.';
      var v = c.hora.value;
      if (!v) return 'Elige una hora de llegada.';
      var hs = horariosDe(deISO(c.fecha.value));
      if (hs[turnoElegido()].indexOf(v) === -1) return 'Esa hora no está disponible para la fecha y el turno elegidos.';
      return '';
    },
    comentarios: function () {
      if (c.comentarios.value.length > 300) return 'Los comentarios pueden tener hasta 300 caracteres.';
      return '';
    }
  };

  function controlDe(nombre) { return nombre === 'turno' ? grupoTurno : c[nombre]; }
  function enfocable(nombre) {
    if (nombre === 'turno') {
      var r = radiosTurno.filter(function (x) { return !x.disabled; })[0];
      return r || c.fecha;
    }
    return c[nombre];
  }
  function pintarError(nombre, msg) {
    var err = document.getElementById('f-' + nombre + '-error');
    if (err) err.textContent = msg;
    var cont = controlDe(nombre).closest('.campo') || controlDe(nombre);
    cont.classList.toggle('campo--error', !!msg);
    if (nombre === 'turno') radiosTurno.forEach(function (r) { r.setAttribute('aria-invalid', msg ? 'true' : 'false'); });
    else c[nombre].setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function validarCampo(nombre) {
    var msg = V[nombre]();
    pintarError(nombre, msg);
    return msg;
  }

  /* Turnos y horas según la fecha */
  function actualizarTurnos() {
    var d = V.fecha() ? null : deISO(c.fecha.value);
    var hs = d ? horariosDe(d) : null;
    radiosTurno.forEach(function (r) {
      var disponible = !!hs && hs[r.value].length > 0;
      r.disabled = !disponible;
      if (!disponible) r.checked = false;
      var horas = $('[data-horas-' + r.value + ']', form);
      if (horas) {
        if (hs && r.value === 'almuerzo' && hs.domingo) horas.textContent = '13:00–17:00';
        else if (hs && r.value === 'almuerzo') horas.textContent = '13:00–16:00';
        if (hs && !disponible) horas.textContent = r.value === 'cena' && hs.domingo ? 'Sin cena los domingos' : 'Sin horarios hoy';
        if (!hs) horas.textContent = r.value === 'almuerzo' ? '13:00–16:00' : '19:30–23:30';
      }
    });
    if (!d) ayudaTurno.textContent = 'Elige primero una fecha válida para ver los turnos.';
    else if (hs.domingo) ayudaTurno.textContent = 'Los domingos solo abrimos a almuerzo, de 13:00 a 17:00.';
    else if (!hs.almuerzo.length) ayudaTurno.textContent = 'Para hoy solo quedan horarios de cena.';
    else ayudaTurno.textContent = 'Almuerzo de 13:00 a 16:00 o cena de 19:30 a 23:30.';
    var libres = radiosTurno.filter(function (r) { return !r.disabled; });
    if (libres.length === 1) libres[0].checked = true;
    ecoFecha.textContent = d ? 'Elegiste el ' + fechaLarga(d) + '.' : '';
    actualizarHoras();
  }
  function actualizarHoras() {
    var previo = c.hora.value;
    var d = V.fecha() ? null : deISO(c.fecha.value);
    var t = turnoElegido();
    var hs = d ? horariosDe(d) : null;
    var lista = hs && t ? hs[t] : [];
    c.hora.textContent = '';
    var vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = !d ? 'Elige fecha y turno primero' : !t ? 'Elige un turno primero' : 'Elige una hora';
    c.hora.appendChild(vacia);
    lista.forEach(function (h) {
      var o = document.createElement('option');
      o.value = h; o.textContent = h + ' h';
      c.hora.appendChild(o);
    });
    if (lista.indexOf(previo) !== -1) c.hora.value = previo;
  }

  /* Contador de personas */
  $$('.contador__btn', form).forEach(function (b) {
    b.addEventListener('click', function () {
      var n = parseInt(c.personas.value, 10);
      if (!Number.isFinite(n)) n = 0;
      n = Math.min(MAX_PERSONAS + 1, Math.max(1, n + Number(b.getAttribute('data-paso'))));
      c.personas.value = String(n);
      tocados.personas = true;
      alCambiarPersonas();
      validarCampo('personas');
    });
  });
  function alCambiarPersonas() {
    var n = Number(c.personas.value);
    avisoGrupos.hidden = !(Number.isFinite(n) && n > MAX_PERSONAS);
  }

  /* Contador de caracteres */
  var cuenta = $('[data-cuenta]', form);
  function actualizarCuenta() { cuenta.textContent = String(c.comentarios.value.length); }

  /* Eventos de campos */
  Object.keys(c).forEach(function (nombre) {
    var el = c[nombre];
    el.addEventListener('blur', function () {
      if (nombre === 'hora' || nombre === 'comentarios') { if (!tocados[nombre] && !intentoEnvio) return; }
      tocados[nombre] = true;
      if (el.value !== '' || intentoEnvio) validarCampo(nombre);
    });
    el.addEventListener('input', function () {
      if (nombre === 'personas') alCambiarPersonas();
      if (nombre === 'comentarios') actualizarCuenta();
      if (nombre === 'fecha') { actualizarTurnos(); }
      if (tocados[nombre] || intentoEnvio) {
        validarCampo(nombre);
        if (nombre === 'fecha' && intentoEnvio) { validarCampo('turno'); validarCampo('hora'); }
      }
    });
    el.addEventListener('change', function () {
      if (nombre === 'fecha') {
        actualizarTurnos();
        tocados.fecha = true;
        validarCampo('fecha');
        if (intentoEnvio) { validarCampo('turno'); validarCampo('hora'); }
      }
      if (nombre === 'hora') { tocados.hora = true; validarCampo('hora'); }
    });
  });
  radiosTurno.forEach(function (r) {
    r.addEventListener('change', function () {
      actualizarHoras();
      validarCampo('turno');
      if (intentoEnvio) validarCampo('hora');
    });
  });

  /* Resumen de errores */
  function mostrarResumen(errores) {
    var ul = $('.resumen-errores__lista', resumen);
    ul.textContent = '';
    errores.forEach(function (e) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + enfocable(e.nombre).id;
      a.textContent = ETIQUETAS[e.nombre] + ': ' + e.msg;
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var el = enfocable(e.nombre);
        el.focus();
        el.scrollIntoView({ block: 'center' });
      });
      li.appendChild(a);
      ul.appendChild(li);
    });
    resumen.hidden = errores.length === 0;
  }

  function generarCodigo(existentes) {
    var A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var codigo;
    do {
      var arr = new Uint32Array(5);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(arr);
      else for (var i = 0; i < 5; i++) arr[i] = Math.floor(Math.random() * 1e9);
      codigo = 'BS-' + Array.prototype.map.call(arr, function (n) { return A.charAt(n % A.length); }).join('');
    } while (existentes.indexOf(codigo) !== -1);
    return codigo;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    intentoEnvio = true;
    actualizarTurnos();
    var errores = [];
    ORDEN.forEach(function (nombre) {
      var msg = validarCampo(nombre);
      if (msg) errores.push({ nombre: nombre, msg: msg });
    });
    mostrarResumen(errores);
    if (errores.length) {
      $('#estado-envio').textContent = 'Hay ' + errores.length + (errores.length === 1 ? ' dato por revisar.' : ' datos por revisar.');
      var primero = enfocable(errores[0].nombre);
      primero.focus();
      return;
    }

    btnEnviar.disabled = true;
    btnEnviar.setAttribute('aria-busy', 'true');
    $('.btn__texto', btnEnviar).textContent = 'Guardando en este navegador…';
    $('#estado-envio').textContent = 'Guardando la solicitud en este navegador.';

    window.setTimeout(function () {
      var lista = almacen.leer();
      var tel = normalizarTelefono(c.telefono.value);
      var solicitud = {
        codigo: generarCodigo(lista.map(function (s) { return s.codigo; })),
        nombre: c.nombre.value.trim().replace(/\s+/g, ' '),
        telefono: formatearTelefono(tel),
        correo: c.correo.value.trim(),
        fecha: c.fecha.value,
        turno: turnoElegido(),
        hora: c.hora.value,
        personas: Number(c.personas.value),
        comentarios: c.comentarios.value.trim(),
        creada: new Date().toISOString()
      };
      lista.push(solicitud);
      var persistio = almacen.guardar(lista);
      renderLista();
      mostrarConfirmacion(solicitud, persistio);
      btnEnviar.disabled = false;
      btnEnviar.removeAttribute('aria-busy');
      $('.btn__texto', btnEnviar).textContent = 'Guardar solicitud';
      $('#estado-envio').textContent = '';
    }, 600);
  });

  function filaResumen(dl, termino, valor) {
    var dt = document.createElement('dt'); dt.textContent = termino;
    var dd = document.createElement('dd'); dd.textContent = valor;
    dl.appendChild(dt); dl.appendChild(dd);
  }
  function mostrarConfirmacion(s, persistio) {
    $('#conf-codigo').textContent = s.codigo;
    var dl = $('#conf-resumen');
    dl.textContent = '';
    var d = deISO(s.fecha);
    filaResumen(dl, 'Nombre', s.nombre);
    filaResumen(dl, 'Fecha', fechaLarga(d) + ' (' + fechaCorta(d) + ')');
    filaResumen(dl, 'Turno y hora', (s.turno === 'cena' ? 'Cena' : 'Almuerzo') + ', ' + s.hora + ' h');
    filaResumen(dl, 'Personas', s.personas + (s.personas === 1 ? ' persona' : ' personas'));
    filaResumen(dl, 'Teléfono', s.telefono);
    filaResumen(dl, 'Correo', s.correo);
    if (s.comentarios) filaResumen(dl, 'Comentarios', s.comentarios);
    $('#conf-sin-almacen').hidden = persistio;
    form.hidden = true;
    confirmacion.hidden = false;
    var t = $('#confirmacion-titulo');
    t.focus();
    confirmacion.scrollIntoView({ block: 'start' });
  }

  function reiniciarFormulario() {
    form.reset();
    tocados = {};
    intentoEnvio = false;
    ORDEN.forEach(function (n) { pintarError(n, ''); });
    mostrarResumen([]);
    avisoGrupos.hidden = true;
    fijarLimitesFecha();
    actualizarTurnos();
    actualizarCuenta();
  }
  $('#btn-otra').addEventListener('click', function () {
    reiniciarFormulario();
    confirmacion.hidden = true;
    form.hidden = false;
    c.nombre.focus();
  });

  /* ---------- Lista de solicitudes ---------- */
  var ul = $('#lista-solicitudes');
  var vacia = $('#lista-vacia');
  var estadoLista = $('#estado-lista');
  if (!almacen.disponible) $('#aviso-almacen').hidden = false;

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }
  function accionesNormales(cont, s) {
    cont.textContent = '';
    var b = crear('button', 'btn btn--borrar btn--peq', 'Anular solicitud');
    b.type = 'button';
    b.setAttribute('data-accion', 'anular');
    b.setAttribute('data-codigo', s.codigo);
    b.setAttribute('aria-label', 'Anular solicitud ' + s.codigo);
    cont.appendChild(b);
    return b;
  }
  function renderLista() {
    var lista = almacen.leer().sort(function (a, b) { return (a.fecha + a.hora).localeCompare(b.fecha + b.hora); });
    ul.textContent = '';
    vacia.hidden = lista.length > 0;
    $('#mis-cuenta').textContent = lista.length ? (lista.length === 1 ? '1 solicitud guardada' : lista.length + ' solicitudes guardadas') : '';
    var hoy = hoy0();
    lista.forEach(function (s) {
      var d = deISO(s.fecha);
      var pasada = d && d < hoy;
      var li = crear('li');
      var art = crear('article', 'sol' + (pasada ? ' sol--pasada' : ''));
      art.setAttribute('aria-labelledby', 'sol-' + s.codigo);
      var cab = crear('div', 'sol__cabecera');
      var cod = crear('h4', 'sol__codigo', s.codigo);
      cod.id = 'sol-' + s.codigo;
      cab.appendChild(cod);
      cab.appendChild(crear('p', 'sol__estado', pasada ? 'Fecha pasada' : 'Guardada en este navegador'));
      art.appendChild(cab);
      var cuando = (d ? fechaLarga(d) : s.fecha) + ' · ' + (s.turno === 'cena' ? 'cena' : 'almuerzo') + ', ' + s.hora + ' h';
      art.appendChild(crear('p', 'sol__cuando', cuando));
      var n = Number(s.personas) || 0;
      art.appendChild(crear('p', 'sol__detalle', n + (n === 1 ? ' persona' : ' personas') + ' · a nombre de ' + s.nombre));
      if (s.comentarios) art.appendChild(crear('p', 'sol__nota', 'Comentarios: ' + s.comentarios));
      var acc = crear('div', 'sol__acciones');
      accionesNormales(acc, s);
      art.appendChild(acc);
      li.appendChild(art);
      ul.appendChild(li);
    });
  }

  ul.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-accion]');
    if (!b) return;
    var codigo = b.getAttribute('data-codigo');
    var acc = b.closest('.sol__acciones');
    var accion = b.getAttribute('data-accion');
    if (accion === 'anular') {
      acc.textContent = '';
      var preg = crear('p', 'sol__pregunta', '¿Anular la solicitud ' + codigo + '? Se borrará de este navegador.');
      preg.id = 'preg-' + codigo;
      var si = crear('button', 'btn btn--peligro btn--peq', 'Sí, anular');
      si.type = 'button';
      si.setAttribute('data-accion', 'confirmar');
      si.setAttribute('data-codigo', codigo);
      si.setAttribute('aria-describedby', preg.id);
      var no = crear('button', 'btn btn--linea btn--peq', 'No, mantener');
      no.type = 'button';
      no.setAttribute('data-accion', 'cancelar');
      no.setAttribute('data-codigo', codigo);
      no.setAttribute('aria-describedby', preg.id);
      acc.appendChild(preg); acc.appendChild(si); acc.appendChild(no);
      no.focus();
    } else if (accion === 'cancelar') {
      var nueva = accionesNormales(acc, { codigo: codigo });
      nueva.focus();
    } else if (accion === 'confirmar') {
      var lista = almacen.leer().filter(function (s) { return s.codigo !== codigo; });
      almacen.guardar(lista);
      renderLista();
      estadoLista.textContent = 'Anulaste la solicitud ' + codigo + '. Se borró de este navegador.';
      $('#mis-titulo').focus();
    }
  });
  ul.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var b = e.target.closest('button[data-accion="cancelar"], button[data-accion="confirmar"]');
    if (!b) return;
    var acc = b.closest('.sol__acciones');
    accionesNormales(acc, { codigo: b.getAttribute('data-codigo') }).focus();
  });

  window.addEventListener('storage', function (e) { if (e.key === CLAVE) renderLista(); });

  actualizarTurnos();
  actualizarCuenta();
  alCambiarPersonas();
  renderLista();
})();
