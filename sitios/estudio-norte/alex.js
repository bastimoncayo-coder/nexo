/*
 * Alex · asistente de admisión de Estudio Norte (adaptación de «Nexo 3.7: Alex, admisión comercial»).
 *
 * Mismas reglas que el original: una pregunta por turno y como máximo tres oraciones; preguntas
 * breves para conocer el negocio; los precios y las objeciones no hacen perder el punto de la
 * evaluación; no inventa resultados, no se hace pasar por una persona y no afirma reservar,
 * enviar ni guardar nada. Funciona solo con reglas, dentro del navegador: no usa ninguna API
 * ni modelo de IA, y la conversación se borra al recargar la página.
 *
 * Diferencias con el Alex de Nexo: los servicios y precios son los de ejemplo de Estudio Norte
 * (en CLP), y el siguiente paso es el brief local de esta web en lugar de una agenda.
 *
 * Uso: <script src="alex.js" data-brief="#brief" defer></script> junto a alex.css.
 * Script clásico (sin módulos) para que también funcione abriendo el archivo con file://.
 */
(function (raiz) {
  'use strict';

  var CAMPOS = { rubro: 'string', servicio: 'string', enMarcha: 'boolean', responsable: 'string', plazo: 'string', presupuesto: 'boolean' };
  var ETIQUETAS = { rubro: 'Rubro', servicio: 'Frente prioritario', enMarcha: 'Negocio en marcha', responsable: 'Responsable actual', plazo: 'Plazo deseado', presupuesto: 'Presupuesto disponible' };
  var PREGUNTAS = {
    rubro: '¿A qué se dedica tu negocio?',
    servicio: '¿Qué necesitas primero: contenido para redes, identidad visual o un sitio web?',
    enMarcha: '¿El negocio ya está atendiendo clientes?',
    responsable: '¿Quién se encarga hoy de las redes o de la web?',
    plazo: '¿Para cuándo te gustaría tener la primera entrega?',
    presupuesto: '¿Cuentan con presupuesto para este proyecto?',
    brief: '¿Quieres abrir el formulario de brief para dejarlo por escrito?'
  };

  /** Minúsculas, sin tildes ni signos: «¿Cuánto cuesta?» → «cuanto cuesta». */
  function normalizar(texto) {
    return String(texto == null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** Acepta solo los campos conocidos con su tipo. Cualquier otra cosa reinicia la evaluación. */
  function validarEstado(valor) {
    if (valor === undefined) return {};
    var invalido = !valor || typeof valor !== 'object' || Array.isArray(valor) || Object.keys(valor).some(function (k) {
      var v = valor[k];
      return !Object.prototype.hasOwnProperty.call(CAMPOS, k) || typeof v !== CAMPOS[k] || (typeof v === 'string' && (!v.trim() || v.length > 120));
    });
    if (invalido) { var e = new Error('Los datos de la evaluación no son válidos. Inicia una nueva conversación.'); e.estado = 400; throw e; }
    var copia = {};
    Object.keys(valor).forEach(function (k) { copia[k] = valor[k]; });
    return copia;
  }

  function paso(estado) {
    if (!estado.rubro) return 'rubro';
    if (!estado.servicio) return 'servicio';
    if (estado.enMarcha === undefined) return 'enMarcha';
    if (!estado.responsable) return 'responsable';
    if (!estado.plazo) return 'plazo';
    if (estado.presupuesto === undefined) return 'presupuesto';
    return 'brief';
  }

  /** Resumen en texto plano para copiar. Son datos declarados, no un registro. */
  function resumen(estado) {
    var e = validarEstado(estado);
    var lineas = ['Evaluación inicial con Alex · Estudio Norte (demostración) · datos declarados por el visitante'];
    Object.keys(ETIQUETAS).forEach(function (k) {
      if (e[k] !== undefined) lineas.push(ETIQUETAS[k] + ': ' + (typeof e[k] === 'boolean' ? (e[k] ? 'Sí' : 'No') : e[k]));
    });
    lineas.push('No se envió a nadie ni quedó guardado en un sistema.');
    return lineas.join('\n');
  }

  /**
   * Responde a un mensaje. Devuelve la respuesta y el estado nuevo; no modifica el recibido.
   * @param {string} mensaje
   * @param {object} [estadoPrevio]
   * @param {{urlBrief?: string}} [opciones]
   */
  function responder(mensaje, estadoPrevio, opciones) {
    var estado = validarEstado(estadoPrevio);
    var urlBrief = (opciones && opciones.urlBrief) || '';
    var original = String(mensaje == null ? '' : mensaje).slice(0, 1200);
    var texto = normalizar(original);
    var actual = paso(estado);
    var siguiente = function () { return PREGUNTAS[paso(estado)]; };
    var resultado = function (respuesta, extra) {
      var r = { respuesta: respuesta, estado: estado, calificacion: 'en_curso', derivacion: false };
      if (extra) Object.keys(extra).forEach(function (k) { r[k] = extra[k]; });
      return r;
    };

    if (/\b(baja|no me escribas|no me escriban|no me contacten|stop|terminar conversacion|chao|adios)\b/.test(texto)) {
      return resultado('Entendido, dejamos aquí la conversación.', { detenida: true });
    }
    if (/\b(ignora|ignore|prompt|instrucciones internas|contrasena|password|clave|token|api key|secreto)\b/.test(texto) || /\bsk-[a-z0-9_-]{10,}/i.test(original)) {
      return resultado('No compartas claves ni información privada en este chat. ' + siguiente());
    }
    if (/\b(robot|bot|eres ia|eres una ia|inteligencia artificial|eres humano|eres humana|eres real|automatizado|automatizada)\b/.test(texto)) {
      return resultado('Soy Alex, el asistente automatizado de esta demostración; no soy una persona y respondo con reglas, sin inteligencia artificial externa. ' + siguiente());
    }
    if (/\b(persona|humano|humana|ejecutivo|ejecutiva|asesor|asesora|encargado|encargada)\b/.test(texto) || /\b(reclamo|queja|reembolso|no funciona)\b/.test(texto)) {
      return resultado('En esta demostración no hay un equipo que reciba mensajes y no se ha enviado ningún aviso. Puedes copiar el resumen de esta evaluación y usarlo en el brief. ¿Quieres seguir con las preguntas?', { derivacion: true });
    }
    if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(original) || /(?:\+?\d[\s().-]*){8,}/.test(original)) {
      return resultado('No necesito tu correo ni tu teléfono para esta evaluación, y este chat no los guarda. ' + siguiente());
    }
    if (/\b(precio|precios|cuanto cuesta|cuanto vale|cuanto sale|tarifa|tarifas|costo|valor|cuanto cobran)\b/.test(texto)) {
      return resultado('Con precios de ejemplo, el plan mensual de contenido parte en $290.000, la identidad visual básica en $450.000 y una landing page en $390.000, IVA no incluido. ' + siguiente());
    }
    // Las promesas de resultados van antes que los plazos: «¿garantizan más seguidores?» es sobre resultados.
    if (/\b(seguidores|viral|resultados garantizados|duplicar|triplicar|mas ventas|vender mas)\b/.test(texto) || /\d+\s*%/.test(original)) {
      return resultado('No tengo mediciones verificadas para prometer seguidores, ventas ni alcance. Los objetivos y la forma de medirlos se acuerdan en la propuesta. ' + siguiente());
    }
    if (/\b(garantia|garantizan|plazo de entrega|cuanto demoran|cuanto se demoran|cuanto tardan)\b/.test(texto)) {
      return resultado('El plazo se fija en la propuesta según el alcance y los materiales disponibles; no puedo prometer fechas en este chat. ' + siguiente());
    }
    if (/\b(no tengo tiempo|estoy ocupado|estoy ocupada|ahora no puedo)\b/.test(texto)) {
      return resultado('Sin problema: la conversación sigue aquí mientras no recargues la página. ¿Quieres retomarla en otro momento?');
    }
    if (/\b(que servicios|que ofrecen|que hacen|a que se dedican|que es estudio norte|como trabajan)\b/.test(texto)) {
      return resultado('Estudio Norte trabaja en tres frentes: contenido para redes, identidad visual y sitios web. ' + siguiente());
    }
    if (/\b(descuento|rebaja|mas barato|oferta)\b/.test(texto)) {
      return resultado('No puedo autorizar descuentos; el valor depende del alcance. ' + siguiente());
    }

    if (/\b(sin presupuesto|presupuesto (?:es )?(?:cero|nulo)|no tengo presupuesto|no tenemos presupuesto)\b/.test(texto)) estado.presupuesto = false;
    else if (/\b(tengo|tenemos) presupuesto\b/.test(texto)) estado.presupuesto = true;
    if (/\b(no tengo clientes|sin clientes|aun no (?:tengo|tenemos) clientes|todavia no abrimos|aun no abrimos|vamos a abrir|por abrir)\b/.test(texto)) estado.enMarcha = false;

    var saludo = /^(hola|buenas|buenos dias|buenas tardes|buenas noches|hola alex)$/.test(texto);
    if (!saludo && original.indexOf('?') === -1 && texto) {
      if (actual === 'rubro') {
        estado.rubro = original.trim().slice(0, 120);
        if (/\b(tengo|tenemos|somos|atendemos)\b/.test(texto) && estado.enMarcha !== false) estado.enMarcha = true;
      }
      var servicio = /\b(redes|contenido|contenidos|instagram|tiktok|publicaciones|reels?|posteos)\b/.test(texto) ? 'Contenido para redes'
        : /\b(logo|logotipo|identidad|branding|marca)\b/.test(texto) ? 'Identidad visual'
          : /\b(web|sitio|pagina|landing|tienda en linea|reservas en linea)\b/.test(texto) ? 'Sitio web' : '';
      if (servicio && (actual === 'servicio' || actual === 'rubro' || !estado.servicio)) estado.servicio = servicio;
      if (actual === 'enMarcha' && /^(si|no)\b/.test(texto)) estado.enMarcha = /^si\b/.test(texto);
      if (actual === 'responsable') estado.responsable = original.trim().slice(0, 120);
      if (actual === 'plazo') estado.plazo = original.trim().slice(0, 120);
      if (actual === 'presupuesto' && /^(si|no)\b/.test(texto)) estado.presupuesto = /^si\b/.test(texto);
    }

    if (estado.presupuesto === false) {
      return resultado('Un proyecto a medida tiene más sentido cuando hay un presupuesto definido, aunque sea acotado. Mientras tanto, la sección de proceso explica cómo trabajamos y qué preparar. ¿Quieres revisarla?', { calificacion: 'aun_no', enlace: { texto: 'Ver el proceso', url: '#proceso' } });
    }
    if (estado.enMarcha === false && estado.servicio === 'Contenido para redes') {
      return resultado('Un plan mensual de contenido rinde mejor con el negocio ya atendiendo clientes. Antes de abrir suele convenir partir por la identidad visual o una landing page. ¿Quieres seguir con una de esas opciones?', { calificacion: 'aun_no' });
    }

    var proximo = paso(estado);
    if (proximo === 'brief') {
      var enlace = urlBrief ? { texto: 'Abrir el formulario de brief', url: urlBrief } : undefined;
      if (/^(si|claro|de acuerdo|ya|dale|ok)$/.test(texto) && actual === 'brief') {
        return resultado('El brief arma un documento que puedes descargar o copiar; no envía nada a nadie. Puedes pegar ahí el resumen de esta evaluación. ¿Te ayudo con algo más del proyecto?', { calificacion: 'calificado', enlace: enlace });
      }
      return resultado('Tu proyecto encaja para preparar un brief. Esta demostración no agenda reuniones ni envía solicitudes. ' + PREGUNTAS.brief, { calificacion: 'calificado', enlace: enlace });
    }
    return resultado((saludo && !estado.rubro ? 'Hola, soy Alex, el asistente de Estudio Norte; te ayudo a ver qué necesita tu negocio. ' : '') + PREGUNTAS[proximo]);
  }

  var Alex = { responder: responder, resumen: resumen, validarEstado: validarEstado, normalizar: normalizar, PREGUNTAS: PREGUNTAS };
  raiz.AlexEstudioNorte = Alex;

  // ---------------------------------------------------------------------------------------
  // Interfaz: botón flotante y diálogo de conversación. Solo si hay documento (no en pruebas).
  // ---------------------------------------------------------------------------------------
  if (typeof document === 'undefined') return;
  var script = document.currentScript;
  var urlBrief = (script && script.getAttribute('data-brief')) || '';

  function crear(etiqueta, atributos, hijos) {
    var el = document.createElement(etiqueta);
    Object.keys(atributos || {}).forEach(function (k) {
      if (k === 'texto') el.textContent = atributos[k];
      else el.setAttribute(k, atributos[k]);
    });
    (hijos || []).forEach(function (h) { el.append(h); });
    return el;
  }

  function montar() {
    var estado = {};
    var lanzador = crear('button', { type: 'button', class: 'alex-lanzador', 'aria-haspopup': 'dialog', 'aria-controls': 'alex-dialogo' }, [
      crear('span', { class: 'alex-monograma', 'aria-hidden': 'true', texto: 'A' }),
      crear('span', { class: 'alex-lanzador__texto' }, [document.createTextNode('Habla con Alex'), crear('small', { texto: 'Asistente de demostración' })])
    ]);
    lanzador.setAttribute('aria-label', 'Abrir conversación con Alex, asistente automatizado de demostración');

    var registro = crear('div', { class: 'alex-mensajes', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversación con Alex' });
    var entrada = crear('input', { id: 'alex-entrada', type: 'text', maxlength: '500', autocomplete: 'off', placeholder: 'Escribe tu respuesta…', required: '' });
    var formulario = crear('form', { class: 'alex-formulario' }, [
      crear('label', { class: 'alex-oculto', for: 'alex-entrada', texto: 'Tu mensaje para Alex' }),
      entrada,
      crear('button', { type: 'submit', class: 'alex-enviar', texto: 'Responder' })
    ]);
    var copiar = crear('button', { type: 'button', texto: 'Copiar resumen', disabled: '' });
    var reiniciar = crear('button', { type: 'button', texto: 'Empezar de nuevo' });
    var atajos = crear('div', { class: 'alex-atajos', role: 'group', 'aria-label': 'Preguntas rápidas' }, [
      crear('button', { type: 'button', 'data-pregunta': '¿Qué servicios ofrecen?', texto: 'Servicios' }),
      crear('button', { type: 'button', 'data-pregunta': '¿Cuánto cuesta?', texto: 'Precios' }),
      crear('button', { type: 'button', 'data-pregunta': 'Quiero hablar con una persona', texto: 'Hablar con alguien' }),
      reiniciar, copiar
    ]);
    var cerrar = crear('button', { type: 'button', class: 'alex-cerrar', 'aria-label': 'Cerrar conversación', texto: '×' });
    var dialogo = crear('dialog', { id: 'alex-dialogo', class: 'alex-dialogo', 'aria-labelledby': 'alex-titulo' }, [
      crear('header', { class: 'alex-cabecera' }, [
        crear('span', { class: 'alex-monograma', 'aria-hidden': 'true', texto: 'A' }),
        crear('div', {}, [crear('h2', { id: 'alex-titulo', texto: 'Alex · Estudio Norte' }), crear('p', { texto: 'Asistente automatizado · demostración' })]),
        cerrar
      ]),
      crear('p', { class: 'alex-aviso', texto: 'Responde con reglas dentro de tu navegador: no usa inteligencia artificial externa, no envía mensajes ni agenda reuniones, y la conversación se borra al recargar.' }),
      registro, atajos, formulario
    ]);
    document.body.append(lanzador, dialogo);

    function agregar(rol, texto, enlace) {
      var bloque = crear('div', { class: 'alex-mensaje alex-mensaje--' + rol }, [
        crear('span', { class: 'alex-mensaje__autor', texto: rol === 'alex' ? 'Alex' : 'Tú' }),
        crear('p', { texto: texto })
      ]);
      if (enlace && enlace.url) {
        var a = crear('a', { href: enlace.url, texto: enlace.texto + ' →' });
        // Al seguir el enlace se cierra el diálogo sin devolver el foco al botón: el foco va al destino.
        a.addEventListener('click', function () { abridor = { focus: function () {} }; dialogo.close(); });
        bloque.append(a);
      }
      registro.append(bloque);
      registro.scrollTop = registro.scrollHeight;
    }

    function enviar(texto) {
      var limpio = String(texto || '').trim();
      if (!limpio) return;
      agregar('usuario', limpio);
      var r;
      try { r = responder(limpio, estado, { urlBrief: urlBrief }); } catch (err) { estado = {}; r = responder('Hola', {}, { urlBrief: urlBrief }); }
      estado = r.estado;
      copiar.disabled = Object.keys(estado).length === 0;
      agregar('alex', r.respuesta, r.enlace);
    }

    function empezar() {
      estado = {};
      registro.replaceChildren();
      copiar.disabled = true;
      copiar.textContent = 'Copiar resumen';
      agregar('alex', responder('Hola', {}).respuesta);
    }

    var abridor = lanzador;
    function abrir(origen) {
      abridor = origen || lanzador;
      if (!registro.children.length) empezar();
      if (dialogo.open) return;
      if (typeof dialogo.showModal === 'function') dialogo.showModal(); else dialogo.setAttribute('open', '');
      entrada.focus();
    }
    lanzador.addEventListener('click', function () { abrir(lanzador); });
    // Cualquier botón de la página con data-abrir-alex abre la conversación.
    document.addEventListener('click', function (ev) {
      var b = ev.target && ev.target.closest && ev.target.closest('[data-abrir-alex]');
      if (b) { ev.preventDefault(); abrir(b); }
    });
    cerrar.addEventListener('click', function () { dialogo.close(); });
    dialogo.addEventListener('click', function (ev) { if (ev.target === dialogo) dialogo.close(); });
    dialogo.addEventListener('close', function () { abridor.focus(); });
    formulario.addEventListener('submit', function (ev) {
      ev.preventDefault();
      enviar(entrada.value);
      entrada.value = '';
      entrada.focus();
    });
    atajos.addEventListener('click', function (ev) {
      var b = ev.target.closest('button[data-pregunta]');
      if (b) { enviar(b.getAttribute('data-pregunta')); entrada.focus(); }
    });
    reiniciar.addEventListener('click', function () { empezar(); entrada.focus(); });
    copiar.addEventListener('click', function () {
      var texto = resumen(estado);
      var listo = function () { copiar.textContent = 'Resumen copiado'; };
      var fallo = function () { copiar.textContent = 'No se pudo copiar'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(listo, fallo);
      else fallo();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar);
  else montar();
})(typeof window !== 'undefined' ? window : globalThis);
