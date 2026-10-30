// «Contrátanos»: valida el formulario y deja la solicitud en la app local (POST /api/solicitudes).
(function () {
  const form = /** @type {HTMLFormElement} */ (document.getElementById('formulario'));
  const resumen = /** @type {HTMLElement} */ (document.getElementById('errores'));
  const confirmacion = /** @type {HTMLElement} */ (document.getElementById('confirmacion'));
  const parametros = new URLSearchParams(location.search);
  const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const NOMBRES = { plan: '¿Qué necesitas?', negocio: 'Nombre del negocio', rubro: 'Rubro', nombre: 'Tu nombre', email: 'Correo', telefono: 'Teléfono', inicio: 'Cuándo partir' };

  // Los próximos seis meses, empezando por el siguiente.
  const inicio = /** @type {HTMLSelectElement} */ (form.elements.namedItem('inicio'));
  const hoy = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    inicio.add(new Option(`${MESES[d.getMonth()][0].toUpperCase()}${MESES[d.getMonth()].slice(1)} de ${d.getFullYear()}`, valor));
  }

  // ?plan=web llega desde los botones de la web de la agencia.
  const planPedido = parametros.get('plan');
  const radio = planPedido && form.querySelector(`input[name="plan"][value="${CSS.escape(planPedido)}"]`);
  if (radio) /** @type {HTMLInputElement} */ (radio).checked = true;

  /** @param {Record<string,string>} d */
  function revisar(d) {
    /** @type {Record<string,string>} */
    const e = {};
    if (!d.plan) e.plan = 'Elige una opción, aunque sea «Aún no lo sé».';
    if (d.negocio.trim().length < 2) e.negocio = 'Escribe el nombre del negocio.';
    if (!d.rubro.trim()) e.rubro = 'Indica el rubro.';
    if (d.nombre.trim().length < 2) e.nombre = 'Escribe tu nombre.';
    if (!d.email.trim() && !d.telefono.trim()) e.email = 'Deja un correo o un teléfono.';
    else if (d.email.trim() && !RE_EMAIL.test(d.email.trim())) e.email = 'El correo no tiene un formato válido (ejemplo: nombre@dominio.cl).';
    if (d.telefono.trim() && d.telefono.replace(/\D/g, '').length < 8) e.telefono = 'El teléfono debe tener al menos 8 dígitos.';
    return e;
  }

  function limpiar() {
    form.querySelectorAll('.campo__error').forEach((n) => n.remove());
    form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
    form.querySelectorAll('[data-describe]').forEach((n) => {
      const base = /** @type {HTMLElement} */ (n).dataset.describe;
      if (base) n.setAttribute('aria-describedby', base); else n.removeAttribute('aria-describedby');
    });
    resumen.hidden = true;
    resumen.replaceChildren();
  }

  /** @param {string} mensaje @param {Record<string,string>} errores */
  function marcar(mensaje, errores) {
    limpiar();
    const titulo = document.createElement('p');
    titulo.textContent = mensaje;
    resumen.append(titulo);
    const ul = document.createElement('ul');
    for (const [clave, texto] of Object.entries(errores)) {
      const campo = form.elements.namedItem(clave);
      const el = /** @type {HTMLElement|null} */ (campo instanceof RadioNodeList ? campo[0] : campo);
      const li = document.createElement('li');
      if (el) {
        const id = `error-${clave}`;
        const p = document.createElement('p');
        p.className = 'campo__error';
        p.id = id;
        p.textContent = texto;
        (clave === 'plan' ? form.querySelector('.tarifario legend') : el.closest('.campo'))?.after(p);
        const objetivo = clave === 'plan' ? form.querySelector('.tarifario') : el;
        if (objetivo) {
          objetivo.setAttribute('aria-invalid', 'true');
          const base = /** @type {HTMLElement} */ (objetivo).dataset.describe ?? (/** @type {HTMLElement} */ (objetivo).dataset.describe = objetivo.getAttribute('aria-describedby') || '');
          objetivo.setAttribute('aria-describedby', [base, id].filter(Boolean).join(' '));
        }
        const a = document.createElement('a');
        a.href = `#${el.id || ''}`;
        // @ts-ignore
        a.textContent = `${NOMBRES[clave] || clave}: ${texto}`;
        a.addEventListener('click', (ev) => { ev.preventDefault(); el.focus(); });
        li.append(a);
      } else {
        li.textContent = texto;
      }
      ul.append(li);
    }
    if (ul.children.length) resumen.append(ul);
    resumen.hidden = false;
    resumen.focus();
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = /** @type {Record<string,string>} */ (Object.fromEntries(new FormData(form)));
    for (const k of ['plan', 'negocio', 'rubro', 'comuna', 'nombre', 'email', 'telefono', 'inicio', 'mensaje']) d[k] = String(d[k] || '');
    const errores = revisar(d);
    if (Object.keys(errores).length) return marcar('Faltan algunos datos para poder responderte.', errores);
    limpiar();
    const boton = /** @type {HTMLButtonElement} */ (form.querySelector('[type="submit"]'));
    boton.disabled = true;
    boton.textContent = 'Guardando…';
    const cuerpo = {
      plan: d.plan, negocio: d.negocio.trim(), rubro: d.rubro.trim(), comuna: d.comuna.trim(), inicio: d.inicio, mensaje: d.mensaje.trim(),
      contacto: { nombre: d.nombre.trim(), email: d.email.trim(), telefono: d.telefono.trim() },
      origen: (parametros.get('origen') || 'contratar').slice(0, 40),
    };
    try {
      // Versión pública (sin servidor): se arma el resumen, se copia y se ofrece enviarlo por mensaje directo.
      if (document.documentElement.dataset.modo === 'publico') {
        const plan = /** @type {HTMLElement|null} */ (form.querySelector(`input[name="plan"][value="${CSS.escape(d.plan)}"]`)?.closest('.tarifa')?.querySelector('.tarifa__nombre'));
        const resumen = [
          'Hola Nexo, quiero una propuesta.',
          `Necesito: ${plan?.firstChild?.textContent?.trim() || d.plan}`,
          `Negocio: ${cuerpo.negocio} (${cuerpo.rubro}${cuerpo.comuna ? `, ${cuerpo.comuna}` : ''})`,
          cuerpo.inicio ? `Quiero partir: ${inicio.selectedOptions[0]?.textContent}` : '',
          cuerpo.mensaje ? `Lo que busco: ${cuerpo.mensaje}` : '',
          `Contacto: ${cuerpo.contacto.nombre}${cuerpo.contacto.email ? ` · ${cuerpo.contacto.email}` : ''}${cuerpo.contacto.telefono ? ` · ${cuerpo.contacto.telefono}` : ''}`,
        ].filter(Boolean).join('\n');
        let copiado = false;
        try { await navigator.clipboard.writeText(resumen); copiado = true; } catch { /* se muestra para copiar a mano */ }
        document.getElementById('confirmacion-texto').textContent = copiado
          ? `Listo, ${cuerpo.contacto.nombre}: copiamos tu solicitud. Pégala en un mensaje directo a @agencia_nexocl y te respondemos con una propuesta.`
          : `Listo, ${cuerpo.contacto.nombre}. Copia este texto y envíalo por mensaje directo a @agencia_nexocl:`;
        const pre = document.getElementById('confirmacion-resumen');
        if (pre) pre.textContent = resumen;
        form.hidden = true;
        document.querySelector('.contratar__lateral')?.setAttribute('hidden', '');
        confirmacion.hidden = false;
        confirmacion.focus();
        return;
      }
      if (location.protocol === 'file:') throw new Error('Abriste la página como archivo. Para guardar la solicitud, inicia el servidor (npm start) y entra a http://localhost:4317/contratar.html.');
      let res;
      try {
        res = await fetch('/api/solicitudes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      } catch {
        throw new Error('No se pudo conectar con el servidor local. Ejecuta npm start y vuelve a intentarlo; lo que escribiste sigue aquí.');
      }
      const datos = await res.json().catch(() => null);
      if (!res.ok) {
        // Los nombres del servidor («contacto.email») se traducen a los del formulario.
        const campos = Object.fromEntries(Object.entries(datos?.campos || {}).map(([k, v]) => [k.replace(/^contacto\./, ''), String(v)]));
        if (Object.keys(campos).length) return marcar(datos?.error || 'Revisa los campos marcados.', campos);
        throw new Error(datos?.error || `El servidor respondió con un error (${res.status}).`);
      }
      document.getElementById('confirmacion-texto').textContent = `Gracias, ${cuerpo.contacto.nombre}. Guardamos la solicitud de ${cuerpo.negocio} en la app del equipo.`;
      document.getElementById('confirmacion-codigo').textContent = String(datos.id).toUpperCase();
      form.hidden = true;
      document.querySelector('.contratar__lateral')?.setAttribute('hidden', '');
      confirmacion.hidden = false;
      confirmacion.focus();
    } catch (err) {
      marcar(err instanceof Error ? err.message : String(err), {});
    } finally {
      boton.disabled = false;
      boton.textContent = 'Enviar solicitud';
    }
  });
})();
