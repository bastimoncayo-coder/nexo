/* Habita Sur — ficha individual de propiedad */
(function () {
  'use strict';
  const HS = window.HS;
  const raiz = document.querySelector('[data-ficha]');
  if (!raiz) return;
  const id = new URLSearchParams(window.location.search).get('id') || '';
  const p = HS.buscarPropiedad(id);

  if (!p) {
    document.title = 'Propiedad no encontrada · Habita Sur (sitio de demostración)';
    raiz.innerHTML =
      '<div class="no-encontrada">' +
      '<p class="antetitulo">Error · ficha no encontrada</p>' +
      '<h1>No encontramos esa propiedad</h1>' +
      '<p class="entrada">' +
      (id ? 'No hay ninguna propiedad con el código «' + HS.esc(id.slice(0, 40)) + '» en nuestro catálogo de ejemplo.' : 'El enlace no indica qué propiedad quieres ver.') +
      ' Puede que el enlace esté incompleto o que la propiedad haya salido del catálogo.</p>' +
      '<p><a class="boton" href="propiedades.html">Ver el catálogo de propiedades</a></p>' +
      '<p><a href="index.html">Volver al inicio</a></p>' +
      '</div>';
    return;
  }

  const comuna = HS.comunas[p.comuna];
  document.title = p.titulo + ' · ' + comuna.nombre + ' · Habita Sur (sitio de demostración)';

  /* ---------- datos ---------- */
  const claves = HS.datosClave(p).map((d) => [d[0], d[1], d[2]]);
  if (claves.length < 4) claves.push(['ubicacion', comuna.nombre, comuna.region]);
  if (claves.length < 4 && p.tipo === 'terreno') claves.push(['check', p.subtipo, 'sin construcciones']);

  const filas = [];
  filas.push(['Código', p.id.toUpperCase()]);
  filas.push(['Operación', HS.operaciones[p.operacion]]);
  filas.push(['Tipo', p.subtipo]);
  filas.push(['Comuna', comuna.nombre]);
  filas.push(['Sector', p.sector]);
  filas.push([p.operacion === 'arriendo' ? 'Arriendo mensual' : 'Precio', HS.fmt.clp(p.precio)]);
  if (p.operacion === 'venta') filas.push(['Precio en UF (referencial)', '≈ ' + HS.fmt.uf(p.precio)]);
  if (p.gastosComunes) filas.push(['Gastos comunes aprox.', HS.fmt.clp(p.gastosComunes)]);
  if (p.dormitorios) filas.push(['Dormitorios', String(p.dormitorios)]);
  if (p.banos) filas.push(['Baños', String(p.banos)]);
  if (p.m2Construidos) filas.push(['Superficie construida', HS.fmt.num(p.m2Construidos) + ' m²']);
  if (p.m2Terreno) filas.push(['Superficie de terreno', HS.fmt.num(p.m2Terreno) + ' m²']);
  if (p.estacionamientos !== null && p.estacionamientos !== undefined) filas.push(['Estacionamientos', p.estacionamientos ? String(p.estacionamientos) : 'No incluye']);
  if (p.anio) filas.push(['Año de construcción', String(p.anio)]);
  if (p.orientacion) filas.push(['Orientación principal', p.orientacion]);

  const similares = HS.propiedades
    .filter((x) => x.id !== p.id && x.comuna === p.comuna)
    .concat(HS.propiedades.filter((x) => x.id !== p.id && x.comuna !== p.comuna && x.tipo === p.tipo))
    .slice(0, 3);

  const n = p.fotos.length;
  const miniaturas = p.fotos
    .map(
      (f, i) =>
        '<li><button type="button" data-foto="' + i + '" aria-label="Ver foto ' + (i + 1) + ' de ' + n + ': ' + HS.esc(nombreFoto(f)) + '"' + (i === 0 ? ' aria-current="true"' : '') + '>' +
        HS.escena(f, p.id + '-' + i, null, { grano: false }) +
        '</button></li>'
    )
    .join('');

  function nombreFoto(f) {
    const nombres = { fachada: 'Fachada', edificio: 'Edificio', oficinas: 'Edificio', local: 'Fachada del local', terreno: 'Vista general', acceso: 'Acceso', entorno: 'Entorno', living: 'Living', cocina: 'Cocina', dormitorio: 'Dormitorio', oficina: 'Interior', localInterior: 'Interior' };
    return nombres[f.tipo] || 'Foto';
  }

  raiz.innerHTML =
    '<nav class="migas" aria-label="Ruta de navegación"><ol>' +
    '<li><a href="index.html">Inicio</a></li>' +
    '<li><a href="propiedades.html">Propiedades</a></li>' +
    '<li><a href="propiedades.html?comuna=' + p.comuna + '">' + comuna.nombre + '</a></li>' +
    '<li aria-current="page">' + HS.esc(p.titulo) + '</li>' +
    '</ol></nav>' +
    '<div class="ficha__cabeza"><div>' +
    '<p class="antetitulo">' + HS.esc(p.subtipo) + ' en ' + HS.operaciones[p.operacion].toLowerCase() + ' · Código ' + p.id.toUpperCase() + '</p>' +
    '<h1>' + HS.esc(p.titulo) + '</h1>' +
    '<p class="ficha__lugar">' + HS.icono('ubicacion') + HS.esc(p.sector) + ', ' + comuna.nombre + '</p>' +
    '</div><div class="ficha__acciones">' +
    '<button type="button" class="boton boton--claro boton-fav-grande" data-fav="' + p.id + '" aria-pressed="false">' + HS.icono('corazon') + 'Guardar en favoritos</button>' +
    '<a class="boton" href="#consulta">Consultar</a>' +
    '</div></div>' +
    '<p class="ficha__aviso"><span><strong>Propiedad ficticia.</strong> Es un ejemplo creado para esta demostración: no está a la venta ni en arriendo, y su dirección no existe.</span></p>' +
    '<div class="ficha"><div class="ficha__principal">' +
    // galería
    '<section class="galeria" aria-label="Fotos de la propiedad" aria-roledescription="galería">' +
    '<div class="galeria__escenario" tabindex="0" role="group" aria-label="Foto actual" aria-describedby="galeria-ayuda" data-escenario>' +
    '<figure data-figura></figure>' +
    '<button type="button" class="galeria__ctrl galeria__ctrl--ant" data-ant aria-label="Foto anterior">' + HS.icono('izq') + '</button>' +
    '<button type="button" class="galeria__ctrl galeria__ctrl--sig" data-sig aria-label="Foto siguiente">' + HS.icono('der') + '</button>' +
    '<div class="galeria__pie"><span class="galeria__contador" data-contador aria-hidden="true">1 / ' + n + '</span>' +
    '<button type="button" class="galeria__ampliar" data-ampliar>' + HS.icono('ampliar') + 'Ampliar</button></div>' +
    '</div>' +
    '<p class="galeria__leyenda" data-leyenda aria-live="polite"></p>' +
    '<ul class="galeria__miniaturas">' + miniaturas + '</ul>' +
    '<p class="galeria__ayuda" id="galeria-ayuda">Con el foco en la foto, usa las flechas izquierda y derecha (o Inicio y Fin) para recorrer la galería.</p>' +
    '</section>' +
    '<ul class="datos-clave">' +
    claves.map((d) => '<li>' + HS.icono(d[0]) + '<div><strong>' + d[1] + '</strong><span>' + d[2] + '</span></div></li>').join('') +
    '</ul>' +
    '<section class="descripcion" aria-labelledby="t-descripcion"><h2 id="t-descripcion">Descripción</h2>' +
    p.descripcion.map((t) => '<p>' + HS.esc(t) + '</p>').join('') +
    '</section>' +
    '<section aria-labelledby="t-caracteristicas"><h2 id="t-caracteristicas">Características</h2><ul class="caracteristicas">' +
    p.caracteristicas.map((c) => '<li>' + HS.icono('check') + HS.esc(c) + '</li>').join('') +
    '</ul></section>' +
    '<section aria-labelledby="t-tecnica"><h2 id="t-tecnica">Ficha técnica</h2><dl class="tabla-ficha">' +
    filas.map((f) => '<dt>' + f[0] + '</dt><dd>' + HS.esc(f[1]) + '</dd>').join('') +
    '</dl>' +
    (p.operacion === 'venta' ? '<p class="nota-uf">El valor en UF es solo referencial: se calcula con una UF fija de $40.000 definida para esta demostración, no con la UF del día.</p>' : '') +
    '</section>' +
    '<section aria-labelledby="t-ubicacion"><h2 id="t-ubicacion">Ubicación aproximada</h2><div class="ubicacion">' +
    '<figure class="ubicacion__mapa">' + HS.mapaAproximado(p.comuna, p.zona, 'Esquema ilustrado de ' + comuna.nombre + ' con calles, áreas verdes y agua; un círculo marca la zona aproximada de la propiedad') + '</figure>' +
    '<div><p><strong>' + HS.esc(p.sector) + '</strong>, ' + comuna.nombre + '. ' + comuna.region + '.</p>' +
    '<p class="leyenda">Mostramos solo una zona aproximada en un esquema ilustrado, sin mapas externos. Como la propiedad es ficticia, no tiene dirección real.</p>' +
    '<ol class="region" aria-label="Comunas donde trabajamos, de norte a sur">' +
    HS.ordenComunas.map((c) => '<li' + (c === p.comuna ? ' class="actual" aria-current="location"' : '') + '>' + HS.comunas[c].nombre + '</li>').join('') +
    '</ol></div>' +
    '</div></section>' +
    '</div>' +
    // lateral
    '<aside class="ficha__lateral" aria-label="Precio y consulta"><div class="panel">' +
    '<div class="precio-caja"><p class="precio-caja__operacion">' + (p.operacion === 'venta' ? 'Precio de venta' : 'Arriendo mensual') + '</p>' +
    '<p class="precio-caja__valor">' + HS.fmt.clp(p.precio) + '</p>' +
    (p.operacion === 'venta' ? '<p class="precio-caja__sec">≈ ' + HS.fmt.uf(p.precio) + ' (referencial)</p>' : '') +
    (p.gastosComunes ? '<p class="precio-caja__sec">Gastos comunes aprox. ' + HS.fmt.clp(p.gastosComunes) + '</p>' : '') +
    '</div>' +
    '<h2 id="consulta" tabindex="-1">Consultar por esta propiedad</h2>' +
    '<p class="ayuda">Todos los campos son obligatorios salvo los marcados como opcionales.</p>' +
    HS.formularioHTML('consulta') +
    '</div></aside>' +
    '</div>' +
    (similares.length
      ? '<section class="seccion" aria-labelledby="t-similares" style="padding-top:0"><div class="seccion__cabeza"><h2 id="t-similares">Otras propiedades que podrían interesarte</h2><a class="enlace-flecha" href="propiedades.html?comuna=' + p.comuna + '">Ver todo en ' + comuna.nombre + HS.icono('flecha') + '</a></div><div class="grilla">' +
        similares.map((x) => HS.tarjeta(x)).join('') +
        '</div></section>'
      : '');

  HS.sincronizarFavoritos();
  HS.iniciarFormulario(document.getElementById('consulta-form'), { propiedad: p.id });

  /* ---------- galería ---------- */
  let actual = 0;
  const cache = {};
  function svgFoto(i, clave) {
    const k = clave + i;
    if (!cache[k]) cache[k] = HS.escena(p.fotos[i], p.id + '-' + i, 'Ilustración: ' + p.fotos[i].alt);
    return cache[k];
  }
  const fig = raiz.querySelector('[data-figura]');
  const leyenda = raiz.querySelector('[data-leyenda]');
  const contador = raiz.querySelector('[data-contador]');
  const escenario = raiz.querySelector('[data-escenario]');
  const botonesMini = Array.from(raiz.querySelectorAll('[data-foto]'));
  function mostrar(i, anunciar) {
    actual = (i + n) % n;
    fig.innerHTML = svgFoto(actual, 'g');
    contador.textContent = actual + 1 + ' / ' + n;
    const texto = 'Foto ' + (actual + 1) + ' de ' + n + ': ' + p.fotos[actual].alt + '.';
    if (anunciar) leyenda.textContent = texto;
    else {
      leyenda.removeAttribute('aria-live');
      leyenda.textContent = texto;
      window.setTimeout(() => leyenda.setAttribute('aria-live', 'polite'), 0);
    }
    botonesMini.forEach((b, k) => {
      if (k === actual) b.setAttribute('aria-current', 'true');
      else b.removeAttribute('aria-current');
    });
    const activo = botonesMini[actual];
    if (activo && activo.parentElement && activo.parentElement.parentElement) {
      const lista = activo.parentElement.parentElement;
      const li = activo.parentElement;
      if (li.offsetLeft < lista.scrollLeft || li.offsetLeft + li.offsetWidth > lista.scrollLeft + lista.clientWidth) {
        lista.scrollLeft = li.offsetLeft - 8;
      }
    }
    if (visor.open) pintarVisor();
  }
  function teclas(ev) {
    const mapa = { ArrowLeft: actual - 1, ArrowRight: actual + 1, Home: 0, End: n - 1 };
    if (ev.key in mapa) {
      ev.preventDefault();
      mostrar(mapa[ev.key], true);
    }
  }
  raiz.querySelector('[data-ant]').addEventListener('click', () => mostrar(actual - 1, true));
  raiz.querySelector('[data-sig]').addEventListener('click', () => mostrar(actual + 1, true));
  escenario.addEventListener('keydown', teclas);
  botonesMini.forEach((b) => b.addEventListener('click', () => mostrar(Number(b.dataset.foto), true)));

  /* ---------- visor ampliado ---------- */
  const visor = document.querySelector('[data-visor]');
  const ampliar = raiz.querySelector('[data-ampliar]');
  function pintarVisor() {
    visor.querySelector('[data-visor-figura]').innerHTML = svgFoto(actual, 'g');
    visor.querySelector('[data-visor-titulo]').textContent = 'Foto ' + (actual + 1) + ' de ' + n + ' · ' + p.titulo;
    visor.querySelector('[data-visor-contador]').textContent = actual + 1 + ' / ' + n;
  }
  if (visor && typeof visor.showModal === 'function') {
    ampliar.addEventListener('click', () => {
      pintarVisor();
      visor.showModal();
      document.documentElement.style.overflow = 'hidden';
      visor.querySelector('[data-visor-cerrar]').focus();
    });
    visor.querySelector('[data-visor-cerrar]').addEventListener('click', () => visor.close());
    visor.querySelector('[data-visor-ant]').addEventListener('click', () => mostrar(actual - 1, true));
    visor.querySelector('[data-visor-sig]').addEventListener('click', () => mostrar(actual + 1, true));
    visor.addEventListener('keydown', teclas);
    visor.addEventListener('click', (ev) => {
      if (ev.target === visor || ev.target.hasAttribute('data-visor-fondo')) visor.close();
    });
    visor.addEventListener('close', () => {
      document.documentElement.style.overflow = '';
      ampliar.focus();
    });
  } else if (ampliar) {
    ampliar.hidden = true;
  }

  mostrar(0, false);
})();
