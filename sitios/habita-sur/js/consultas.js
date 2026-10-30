/* Habita Sur — consultas guardadas en este navegador */
(function () {
  'use strict';
  const HS = window.HS;
  const lista = document.querySelector('[data-lista]');
  if (!lista) return;
  const barra = document.querySelector('[data-barra]');
  const cuenta = document.querySelector('[data-cuenta]');
  const vacio = document.querySelector('[data-vacio]');
  const zona = document.querySelector('[data-confirmar-zona]');

  function pintar() {
    const cs = HS.consultas.lista();
    if (!cs.length) {
      lista.innerHTML = '';
      lista.hidden = true;
      barra.hidden = true;
      vacio.className = 'vacio';
      vacio.innerHTML =
        '<h2>Aún no has guardado consultas</h2>' +
        '<p>Cuando escribas desde la ficha de una propiedad o desde el formulario de contacto, la consulta quedará aquí, guardada solo en este navegador.</p>' +
        '<div class="vacio__acciones"><a class="boton" href="propiedades.html">Ver propiedades</a><a class="boton boton--secundario" href="index.html#contacto">Escribir una consulta</a></div>';
      vacio.hidden = false;
      return;
    }
    vacio.hidden = true;
    lista.hidden = false;
    barra.hidden = false;
    cuenta.textContent = cs.length === 1 ? '1 consulta guardada en este navegador.' : cs.length + ' consultas guardadas en este navegador.';
    lista.innerHTML = cs
      .map((c) => {
        const p = HS.buscarPropiedad(c.propiedad);
        const asunto = HS.motivos[c.motivo] || 'Consulta';
        return (
          '<li class="panel consulta">' +
          '<div class="consulta__cabeza"><h2>' + HS.esc(asunto) + (p ? ' · <a href="propiedad.html?id=' + p.id + '">' + HS.esc(p.titulo) + '</a>' : ' · Consulta general') + '</h2>' +
          '<span class="consulta__fecha">Guardada el ' + HS.fmt.fechaHora(c.creada) + '</span></div>' +
          '<p class="consulta__meta"><span>' + HS.esc(c.nombre) + '</span><span>' + HS.esc(c.correo) + '</span><span>' + HS.esc(c.telefono || '') + '</span>' +
          (c.fecha ? '<span>Visita propuesta: ' + HS.esc(HS.fmt.fechaLarga(c.fecha)) + '</span>' : '') + '</p>' +
          '<p class="consulta__mensaje">' + HS.esc(c.mensaje) + '</p>' +
          '<div class="consulta__acciones"><button type="button" class="boton boton--claro boton--chico" data-eliminar="' + HS.esc(c.id) + '">' + HS.icono('papelera') + 'Eliminar<span class="sr-only"> consulta del ' + HS.fmt.fechaHora(c.creada) + '</span></button></div>' +
          '</li>'
        );
      })
      .join('');
  }

  lista.addEventListener('click', (e) => {
    const b = e.target.closest('[data-eliminar]');
    if (!b) return;
    HS.consultas.eliminar(b.dataset.eliminar);
    pintar();
    HS.anunciar('Consulta eliminada.');
    const sig = lista.querySelector('[data-eliminar]');
    if (sig) sig.focus();
    else {
      const v = vacio.querySelector('a');
      if (v) v.focus();
    }
  });

  function restaurarBorrar() {
    zona.innerHTML = '<button type="button" class="boton boton--peligro boton--chico" data-borrar-todas>Borrar todas</button>';
  }
  zona.addEventListener('click', (e) => {
    if (e.target.closest('[data-borrar-todas]')) {
      zona.innerHTML =
        '<span>¿Borrar todas las consultas de este navegador?</span>' +
        '<button type="button" class="boton boton--peligro boton--chico" data-si>Sí, borrar</button>' +
        '<button type="button" class="boton boton--claro boton--chico" data-no>Cancelar</button>';
      zona.querySelector('[data-no]').focus();
    } else if (e.target.closest('[data-si]')) {
      HS.consultas.borrarTodas();
      restaurarBorrar();
      pintar();
      HS.anunciar('Se borraron todas las consultas.');
      const v = vacio.querySelector('a');
      if (v) v.focus();
    } else if (e.target.closest('[data-no]')) {
      restaurarBorrar();
      zona.querySelector('[data-borrar-todas]').focus();
    }
  });
  window.addEventListener('storage', (e) => {
    if (e.key === 'habita-sur:consultas') pintar();
  });
  pintar();
})();
