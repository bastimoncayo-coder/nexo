/* Habita Sur — portada */
(function () {
  'use strict';
  const HS = window.HS;

  function portada() {
    const fig = document.querySelector('[data-portada]');
    if (!fig) return;
    const p = HS.buscarPropiedad('hs-101');
    const foto = p.fotos[0];
    fig.innerHTML =
      HS.escena(foto, p.id + '-portada', 'Ilustración: ' + foto.alt) +
      '<figcaption><strong><a href="propiedad.html?id=' + p.id + '">' + HS.esc(p.titulo) + '</a></strong><span>' + HS.comunas[p.comuna].nombre + ' · Ejemplo ficticio</span></figcaption>';
  }

  function destacadas() {
    const cont = document.querySelector('[data-destacadas]');
    if (!cont) return;
    const lista = HS.propiedades.filter((p) => p.destacada).slice(0, 3);
    cont.innerHTML = lista.map((p) => HS.tarjeta(p)).join('');
    const enlace = document.querySelector('[data-total-enlace]');
    if (enlace) enlace.firstChild.textContent = 'Ver las ' + HS.propiedades.length + ' propiedades ';
  }

  function comunas() {
    const cont = document.querySelector('[data-comunas]');
    if (!cont) return;
    cont.innerHTML = HS.ordenComunas
      .map((clave) => {
        const c = HS.comunas[clave];
        const n = HS.propiedades.filter((p) => p.comuna === clave).length;
        return (
          '<article class="comuna">' +
          '<div class="comuna__img">' + HS.escena({ tipo: 'entorno', lugar: c.lugar, hora: 'dia' }, 'comuna-' + clave, null, { grano: false }) + '</div>' +
          '<div><h3><a href="propiedades.html?comuna=' + clave + '">' + c.nombre + '</a></h3>' +
          '<p class="comuna__region">' + c.region + '</p>' +
          '<p class="comuna__texto">' + c.texto + '</p>' +
          '<p class="comuna__cuenta">' + (n === 1 ? '1 propiedad' : n + ' propiedades') + '</p></div>' +
          '</article>'
        );
      })
      .join('');
  }

  function oficina() {
    const fig = document.querySelector('[data-mapa-oficina]');
    if (fig) fig.innerHTML = HS.mapaAproximado('puerto-varas', [0.5, 0.45], 'Esquema ilustrado de Puerto Varas con el lago al oriente y la ubicación aproximada de la oficina marcada con un círculo');
    const cont = document.querySelector('[data-formulario-contacto]');
    if (!cont) return;
    cont.innerHTML = HS.formularioHTML('contacto');
    const params = new URLSearchParams(window.location.search);
    const motivo = params.get('motivo');
    const propiedad = params.get('propiedad');
    HS.iniciarFormulario(document.getElementById('contacto-form'), {
      motivo: motivo && HS.motivos[motivo] ? motivo : '',
      propiedad: propiedad && HS.buscarPropiedad(propiedad) ? propiedad : '',
    });
  }

  portada();
  destacadas();
  comunas();
  oficina();
})();
