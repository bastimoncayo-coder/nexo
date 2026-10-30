/*
  Habita Sur — generador de «fotografías» ilustradas en SVG.
  Todas las escenas son originales y se construyen a partir de parámetros
  (tipo de escena, colores, pisos, hora del día) con un azar determinista
  sembrado por la propiedad, para que cada ficha se vea siempre igual.
*/
(function () {
  'use strict';
  const HS = (window.HS = window.HS || {});
  let correlativo = 0;

  /* ---------- utilidades ---------- */
  function semilla(texto) {
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function crearAzar(texto) {
    let a = semilla(texto) || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const r = (n) => Math.round(n * 10) / 10;
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpP = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  function linea(arr) {
    return arr.map((p) => r(p[0]) + ' ' + r(p[1])).join(' L');
  }
  function poli(arr, atributos) {
    return '<path d="M' + linea(arr) + 'Z" ' + atributos + '/>';
  }
  function hexARgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function mezclar(a, b, t) {
    const x = hexARgb(a);
    const y = hexARgb(b);
    return (
      '#' +
      x
        .map((v, i) => Math.round(lerp(v, y[i], t)).toString(16).padStart(2, '0'))
        .join('')
    );
  }
  const oscurecer = (c, t) => mezclar(c, '#101818', t);
  const aclarar = (c, t) => mezclar(c, '#FFFFFF', t);

  /* ---------- paletas de luz ---------- */
  const LUCES = {
    dia: {
      cielo: ['#7EA7C2', '#B7CFDB', '#E9EEEA'],
      agua: ['#7FA3B3', '#3D6A7A'],
      bruma: '#D6E2E4',
      cerroLejano: '#8FA7AE',
      cerroMedio: '#5E7F78',
      bosque: '#3F5F55',
      pasto: ['#8FA36A', '#5E7A47'],
      sol: [650, 80],
      solColor: '#FFF7DF',
      calidez: 0.04,
    },
    tarde: {
      cielo: ['#6D8DAE', '#D9C3AE', '#F4D3AE'],
      agua: ['#8EA0A8', '#465F6B'],
      bruma: '#E8D6C2',
      cerroLejano: '#9C9EA6',
      cerroMedio: '#66756C',
      bosque: '#3F5249',
      pasto: ['#A2A46A', '#66764A'],
      sol: [600, 190],
      solColor: '#FFE1B3',
      calidez: 0.1,
    },
    nublado: {
      cielo: ['#93A3AB', '#C2CBCD', '#E1E4E0'],
      agua: ['#869AA1', '#4D636A'],
      bruma: '#D3D9D8',
      cerroLejano: '#9AA8AB',
      cerroMedio: '#647C76',
      bosque: '#435C55',
      pasto: ['#7F9566', '#56704A'],
      sol: [420, 40],
      solColor: '#F4F4EE',
      calidez: 0,
    },
  };

  /* ---------- contexto de escena ---------- */
  function crearContexto(clave, hora) {
    correlativo += 1;
    return {
      id: 'hs' + correlativo + '-',
      defs: [],
      az: crearAzar(clave),
      luz: LUCES[hora] || LUCES.dia,
      usados: {},
    };
  }
  function def(ctx, nombre, contenido) {
    if (!ctx.usados[nombre]) {
      ctx.usados[nombre] = true;
      ctx.defs.push(contenido);
    }
    return 'url(#' + ctx.id + nombre + ')';
  }
  function gradV(ctx, nombre, paradas) {
    const p = paradas
      .map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>')
      .join('');
    return def(ctx, nombre, '<linearGradient id="' + ctx.id + nombre + '" x1="0" y1="0" x2="0" y2="1">' + p + '</linearGradient>');
  }
  function gradL(ctx, nombre, x1, y1, x2, y2, paradas) {
    const p = paradas
      .map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] !== undefined ? ' stop-opacity="' + s[2] + '"' : '') + '/>')
      .join('');
    return def(
      ctx,
      nombre,
      '<linearGradient id="' + ctx.id + nombre + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + p + '</linearGradient>'
    );
  }
  function gradR(ctx, nombre, paradas, extra) {
    const p = paradas
      .map((s) => '<stop offset="' + s[0] + '" stop-color="' + s[1] + '" stop-opacity="' + (s[2] === undefined ? 1 : s[2]) + '"/>')
      .join('');
    return def(ctx, nombre, '<radialGradient id="' + ctx.id + nombre + '" ' + (extra || '') + '>' + p + '</radialGradient>');
  }

  function envolver(ctx, cuerpo, etiqueta, opciones) {
    const o = opciones || {};
    let acabado = '';
    if (o.grano !== false) {
      def(
        ctx,
        'grano',
        '<filter id="' + ctx.id + 'grano" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer></filter>'
      );
      acabado += '<rect width="800" height="600" filter="url(#' + ctx.id + 'grano)"/>';
    }
    const vin = gradR(ctx, 'vineta', [[0.55, '#0E1A1A', 0], [1, '#0E1A1A', 0.28]], 'cx="50%" cy="48%" r="75%"');
    acabado += '<rect width="800" height="600" fill="' + vin + '"/>';
    const aria = etiqueta
      ? 'role="img" aria-label="' + etiqueta.replace(/"/g, '&quot;') + '"'
      : 'aria-hidden="true" focusable="false"';
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" ' +
      aria +
      '><defs>' +
      ctx.defs.join('') +
      '</defs>' +
      cuerpo +
      acabado +
      '</svg>'
    );
  }

  /* ---------- paisaje ---------- */
  function cresta(az, x0, x1, base, amp, paso) {
    const p = [];
    const f1 = az() * 6;
    const f2 = az() * 6;
    const f3 = az() * 6;
    for (let x = x0; x <= x1 + paso; x += paso) {
      const y = base - amp * (0.55 * Math.sin(x / 97 + f1) + 0.3 * Math.sin(x / 41 + f2) + 0.15 * Math.sin(x / 17 + f3));
      p.push([x, y]);
    }
    return p;
  }
  function yEn(p, x) {
    for (let i = 1; i < p.length; i++) {
      if (p[i][0] >= x) {
        const t = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0] || 1);
        return lerp(p[i - 1][1], p[i][1], t);
      }
    }
    return p[p.length - 1][1];
  }
  function capa(p, fondo, relleno, extra) {
    return (
      '<path d="M' + r(p[0][0]) + ' ' + fondo + ' L' + linea(p) + ' L' + r(p[p.length - 1][0]) + ' ' + fondo + 'Z" fill="' + relleno + '"' + (extra || '') + '/>'
    );
  }
  function arbolesSilueta(az, p, hMin, hMax, sep) {
    let d = '';
    const x1 = p[p.length - 1][0];
    for (let x = p[0][0]; x < x1; x += sep * (0.55 + az() * 0.9)) {
      const y = yEn(p, x) + 3 + az() * 4;
      const h = hMin + az() * (hMax - hMin);
      const w = h * (0.3 + az() * 0.14);
      d +=
        'M' + r(x - w / 2) + ' ' + r(y) +
        'L' + r(x - w * 0.22) + ' ' + r(y - h * 0.5) +
        'L' + r(x - w * 0.32) + ' ' + r(y - h * 0.48) +
        'L' + r(x - w * 0.1) + ' ' + r(y - h * 0.82) +
        'L' + r(x) + ' ' + r(y - h) +
        'L' + r(x + w * 0.1) + ' ' + r(y - h * 0.82) +
        'L' + r(x + w * 0.32) + ' ' + r(y - h * 0.48) +
        'L' + r(x + w * 0.22) + ' ' + r(y - h * 0.5) +
        'L' + r(x + w / 2) + ' ' + r(y) + 'Z';
    }
    return d;
  }
  function bosqueCapa(ctx, p, fondo, color, hMin, hMax, sep) {
    return capa(p, fondo, color) + '<path d="' + arbolesSilueta(ctx.az, p, hMin, hMax, sep) + '" fill="' + color + '"/>';
  }
  function bezierQ(p0, p1, p2, t) {
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  }
  function volcan(ctx, cx, base, mitad, alto, opciones) {
    const o = opciones || {};
    const az = ctx.az;
    const L = ctx.luz;
    const cumbreI = [cx - mitad * 0.035, base - alto];
    const cumbreD = [cx + mitad * 0.03, base - alto + 2];
    const izq = [];
    const der = [];
    for (let i = 0; i <= 24; i++) {
      izq.push(bezierQ([cx - mitad, base], [cx - mitad * 0.3, base - alto * 0.52], cumbreI, i / 24));
      der.push(bezierQ(cumbreD, [cx + mitad * 0.3, base - alto * 0.5], [cx + mitad, base], i / 24));
    }
    const cuerpo = izq.concat(der);
    const colorCono = mezclar(L.cerroLejano, '#55657A', 0.25);
    const gCono = gradV(ctx, 'cono', [[0, mezclar(colorCono, L.bruma, 0.05)], [1, mezclar(colorCono, L.bruma, 0.55)]]);
    let s = poli(cuerpo, 'fill="' + gCono + '"');
    // sombra del flanco derecho
    const sombra = [cumbreD].concat(der.slice(1)).concat([[cx + mitad * 0.12, base], [cx + mitad * 0.02, base - alto * 0.45]]);
    s += poli(sombra, 'fill="#1C2A3A" opacity=".16"');
    // nieve
    const limite = base - alto * (o.nieve || 0.42);
    const nIzq = izq.filter((p) => p[1] <= limite);
    const nDer = der.filter((p) => p[1] <= limite);
    if (nIzq.length && nDer.length) {
      const a = nIzq[0];
      const b = nDer[nDer.length - 1];
      const borde = [];
      const pasos = 16;
      for (let i = pasos; i >= 0; i--) {
        const t = i / pasos;
        const x = lerp(a[0], b[0], t);
        const lenguas = i % 2 === 0 ? alto * (0.04 + az() * 0.12) : -alto * (0.02 + az() * 0.03);
        borde.push([x, limite + lenguas]);
      }
      const nieve = nIzq.concat(nDer).concat(borde);
      const gNieve = gradL(ctx, 'nieve', 0, 0, 1, 0, [[0, '#FFFFFF'], [0.55, '#F2F5F6'], [1, '#C9D4DC']]);
      s += poli(nieve, 'fill="' + gNieve + '"');
      // canaletas de sombra en la nieve
      let d = '';
      for (let i = 0; i < 7; i++) {
        const t = 0.12 + i * 0.12 + (az() - 0.5) * 0.05;
        const x = lerp(a[0], b[0], t);
        const x0 = cx + (x - cx) * (0.2 + az() * 0.15);
        const y0 = base - alto + alto * (0.06 + az() * 0.08);
        d += 'M' + r(x0) + ' ' + r(y0) + ' Q' + r(lerp(x0, x, 0.5) + (az() - 0.5) * 8) + ' ' + r(lerp(y0, limite, 0.55)) + ' ' + r(x) + ' ' + r(limite + alto * (0.02 + az() * 0.06)) + ' ';
      }
      s += '<path d="' + d + '" stroke="#9FB0BE" stroke-width="1.2" opacity=".38" fill="none"/>';
    }
    // bruma basal
    const gBruma = gradV(ctx, 'brumaVolcan', [[0, L.bruma, 0], [1, L.bruma, 0.85]]);
    s += '<rect x="' + r(cx - mitad - 10) + '" y="' + r(base - alto * 0.35) + '" width="' + r(mitad * 2 + 20) + '" height="' + r(alto * 0.35 + 2) + '" fill="' + gBruma + '"/>';
    return { svg: s, contorno: cuerpo };
  }
  function nubes(ctx, n, yMax) {
    const g = gradR(ctx, 'nube', [[0, '#FFFFFF', 0.85], [0.6, '#FFFFFF', 0.45], [1, '#FFFFFF', 0]]);
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = ctx.az() * 820 - 10;
      const y = 30 + ctx.az() * yMax;
      const w = 90 + ctx.az() * 160;
      s += '<ellipse cx="' + r(x) + '" cy="' + r(y) + '" rx="' + r(w) + '" ry="' + r(w * 0.16) + '" fill="' + g + '"/>';
      s += '<ellipse cx="' + r(x + w * 0.3) + '" cy="' + r(y - 8) + '" rx="' + r(w * 0.5) + '" ry="' + r(w * 0.13) + '" fill="' + g + '"/>';
    }
    return s;
  }
  function cielo(ctx, alto) {
    const L = ctx.luz;
    const g = gradV(ctx, 'cielo', [[0, L.cielo[0]], [0.62, L.cielo[1]], [1, L.cielo[2]]]);
    const sol = gradR(ctx, 'sol', [[0, L.solColor, 0.95], [0.25, L.solColor, 0.45], [1, L.solColor, 0]]);
    return (
      '<rect width="800" height="' + alto + '" fill="' + g + '"/>' +
      '<circle cx="' + L.sol[0] + '" cy="' + L.sol[1] + '" r="260" fill="' + sol + '"/>'
    );
  }
  function agua(ctx, y0, y1, reflejo) {
    const L = ctx.luz;
    const g = gradV(ctx, 'agua', [[0, mezclar(L.agua[0], L.bruma, 0.35)], [0.25, L.agua[0]], [1, L.agua[1]]]);
    let s = '<rect y="' + y0 + '" width="800" height="' + (y1 - y0) + '" fill="' + g + '"/>';
    if (reflejo) s += reflejo;
    let d = '';
    for (let i = 0; i < 70; i++) {
      const y = y0 + 3 + Math.pow(ctx.az(), 1.6) * (y1 - y0 - 4);
      const x = ctx.az() * 800;
      const w = 6 + ((y - y0) / (y1 - y0)) * 40 * ctx.az() + 4;
      d += 'M' + r(x) + ' ' + r(y) + 'h' + r(w) + ' ';
    }
    s += '<path d="' + d + '" stroke="#FFFFFF" stroke-width="1.1" opacity=".32" stroke-linecap="round"/>';
    return s;
  }
  function pasto(ctx, x0, x1, y0, y1, n, color, opacidad) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, ctx.az());
      const y = lerp(y0, y1, Math.pow(ctx.az(), 0.8));
      const h = 3 + ((y - y0) / Math.max(1, y1 - y0)) * 12 * (0.5 + ctx.az());
      d += 'M' + r(x) + ' ' + r(y) + 'l' + r((ctx.az() - 0.5) * 5) + ' ' + r(-h) + ' ';
    }
    return '<path d="' + d + '" stroke="' + color + '" stroke-width="1.2" opacity="' + (opacidad || 0.4) + '" stroke-linecap="round" fill="none"/>';
  }
  function lupinos(ctx, x0, x1, y0, y1, n) {
    const colores = ['#8A6CB4', '#B07AAE', '#E2A3C2', '#6E80C2', '#F1E3EE'];
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = lerp(x0, x1, ctx.az());
      const y = lerp(y0, y1, ctx.az());
      const esc = 0.5 + ((y - y0) / Math.max(1, y1 - y0)) * 0.9;
      const h = (26 + ctx.az() * 16) * esc;
      const c = colores[Math.floor(ctx.az() * colores.length)];
      s += '<path d="M' + r(x) + ' ' + r(y) + 'v' + r(-h) + '" stroke="#4F6B3F" stroke-width="' + r(1.4 * esc) + '"/>';
      for (let k = 0; k < 7; k++) {
        const yy = y - h * 0.35 - k * h * 0.095;
        const rr = (3.2 - k * 0.32) * esc;
        s += '<ellipse cx="' + r(x) + '" cy="' + r(yy) + '" rx="' + r(rr * 1.25) + '" ry="' + r(rr) + '" fill="' + mezclar(c, '#FFFFFF', k * 0.06) + '"/>';
      }
      s += '<path d="M' + r(x - 6 * esc) + ' ' + r(y - 2) + 'q' + r(6 * esc) + ' ' + r(-8 * esc) + ' ' + r(12 * esc) + ' 0" stroke="#5C7A47" stroke-width="' + r(2 * esc) + '" fill="none"/>';
    }
    return s;
  }
  function hortensias(ctx, x, y, ancho, esc) {
    const colores = ['#7C93D0', '#A08AC9', '#C7A3D6', '#8FB3DA', '#E0B9D4'];
    let s = '<ellipse cx="' + r(x + ancho / 2) + '" cy="' + r(y) + '" rx="' + r(ancho / 2 + 6) + '" ry="' + r(8 * esc) + '" fill="#26352A" opacity=".35"/>';
    const matas = Math.max(2, Math.round(ancho / (24 * esc)));
    for (let i = 0; i < matas; i++) {
      const cx = x + ((i + 0.5) / matas) * ancho + (ctx.az() - 0.5) * 6;
      s += '<ellipse cx="' + r(cx) + '" cy="' + r(y - 10 * esc) + '" rx="' + r(16 * esc) + '" ry="' + r(12 * esc) + '" fill="#3E5B3A"/>';
      s += '<ellipse cx="' + r(cx - 6 * esc) + '" cy="' + r(y - 12 * esc) + '" rx="' + r(7 * esc) + '" ry="' + r(4 * esc) + '" fill="#557A48"/>';
      const c = colores[Math.floor(ctx.az() * colores.length)];
      for (let k = 0; k < 3; k++) {
        const fx = cx + (k - 1) * 9 * esc + (ctx.az() - 0.5) * 4;
        const fy = y - (20 + ctx.az() * 8) * esc;
        s += '<circle cx="' + r(fx) + '" cy="' + r(fy) + '" r="' + r(7.5 * esc) + '" fill="' + c + '"/>';
        s += '<circle cx="' + r(fx - 2 * esc) + '" cy="' + r(fy - 2 * esc) + '" r="' + r(4.5 * esc) + '" fill="' + aclarar(c, 0.3) + '"/>';
        s += '<circle cx="' + r(fx + 2.5 * esc) + '" cy="' + r(fy + 2.5 * esc) + '" r="' + r(3 * esc) + '" fill="' + oscurecer(c, 0.2) + '" opacity=".6"/>';
      }
    }
    return s;
  }
  function conifera(x, y, h, color) {
    const w = h * 0.42;
    let s = '<rect x="' + r(x - h * 0.025) + '" y="' + r(y - h * 0.14) + '" width="' + r(h * 0.05) + '" height="' + r(h * 0.15) + '" fill="#4A3628"/>';
    for (let i = 0; i < 4; i++) {
      const top = y - h + i * h * 0.2;
      const bot = y - h * 0.12 - (3 - i) * h * 0.13;
      const ww = w * (0.45 + i * 0.2);
      s += '<path d="M' + r(x) + ' ' + r(top) + 'L' + r(x + ww / 2) + ' ' + r(bot) + 'Q' + r(x) + ' ' + r(bot + h * 0.05) + ' ' + r(x - ww / 2) + ' ' + r(bot) + 'Z" fill="' + color + '"/>';
      s += '<path d="M' + r(x) + ' ' + r(top) + 'L' + r(x + ww / 2) + ' ' + r(bot) + 'Q' + r(x + ww * 0.2) + ' ' + r(bot + h * 0.03) + ' ' + r(x) + ' ' + r(bot + h * 0.04) + 'Z" fill="#0E1A16" opacity=".22"/>';
    }
    return s;
  }
  function frondoso(ctx, x, y, rad, color) {
    let s = '<path d="M' + r(x - rad * 0.06) + ' ' + r(y) + 'L' + r(x - rad * 0.03) + ' ' + r(y - rad * 1.2) + 'L' + r(x + rad * 0.05) + ' ' + r(y - rad * 1.2) + 'L' + r(x + rad * 0.08) + ' ' + r(y) + 'Z" fill="#4E3A2B"/>';
    const cy = y - rad * 1.55;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const cx2 = x + Math.cos(a) * rad * 0.55 + (ctx.az() - 0.5) * rad * 0.2;
      const cy2 = cy + Math.sin(a) * rad * 0.4;
      s += '<circle cx="' + r(cx2) + '" cy="' + r(cy2) + '" r="' + r(rad * (0.45 + ctx.az() * 0.15)) + '" fill="' + color + '"/>';
    }
    s += '<circle cx="' + r(x - rad * 0.2) + '" cy="' + r(cy - rad * 0.25) + '" r="' + r(rad * 0.45) + '" fill="' + aclarar(color, 0.14) + '"/>';
    s += '<ellipse cx="' + r(x + rad * 0.25) + '" cy="' + r(cy + rad * 0.25) + '" rx="' + r(rad * 0.6) + '" ry="' + r(rad * 0.35) + '" fill="#0E1A16" opacity=".18"/>';
    return s;
  }
  function araucaria(x, y, h) {
    let s = '<path d="M' + r(x - 3) + ' ' + r(y) + 'L' + r(x - 1.5) + ' ' + r(y - h) + 'L' + r(x + 1.5) + ' ' + r(y - h) + 'L' + r(x + 3) + ' ' + r(y) + 'Z" fill="#5B4636"/>';
    const niveles = 5;
    for (let i = 0; i < niveles; i++) {
      const yy = y - h * 0.58 - i * h * 0.09;
      const w = h * (0.32 - i * 0.05);
      s += '<path d="M' + r(x) + ' ' + r(yy) + 'Q' + r(x - w * 0.6) + ' ' + r(yy - h * 0.06) + ' ' + r(x - w) + ' ' + r(yy + h * 0.05) + 'M' + r(x) + ' ' + r(yy) + 'Q' + r(x + w * 0.6) + ' ' + r(yy - h * 0.06) + ' ' + r(x + w) + ' ' + r(yy + h * 0.05) + '" stroke="#2F4A36" stroke-width="' + r(h * 0.045) + '" stroke-linecap="round" fill="none"/>';
    }
    s += '<ellipse cx="' + r(x) + '" cy="' + r(y - h * 1.0) + '" rx="' + r(h * 0.07) + '" ry="' + r(h * 0.05) + '" fill="#2F4A36"/>';
    return s;
  }
  function cerco(x0, y0, x1, y1, n, color) {
    let s = '';
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = lerp(x0, x1, t);
      const y = lerp(y0, y1, t);
      const esc = lerp(1, 0.45, t);
      s += '<rect x="' + r(x - 2.5 * esc) + '" y="' + r(y - 34 * esc) + '" width="' + r(5 * esc) + '" height="' + r(34 * esc) + '" fill="' + color + '"/>';
    }
    s += '<path d="M' + r(x0) + ' ' + r(y0 - 26) + 'L' + r(x1) + ' ' + r(y1 - 26 * 0.45) + 'M' + r(x0) + ' ' + r(y0 - 14) + 'L' + r(x1) + ' ' + r(y1 - 14 * 0.45) + '" stroke="#3B3A36" stroke-width="1" opacity=".6"/>';
    return s;
  }

  /* Paisaje completo reutilizable: cielo, montaña y agua. */
  function paisaje(ctx, o) {
    const h = o.horizonte;
    let s = cielo(ctx, h + 10);
    s += nubes(ctx, o.nubes === undefined ? 4 : o.nubes, h * 0.45);
    if (o.montana === 'volcan') {
      const v = volcan(ctx, o.volcanX || 560, h + 2, o.volcanMitad || 230, o.volcanAlto || 190, { nieve: 0.45 });
      s += v.svg;
      if (o.agua) {
        // reflejo tenue del volcán
        s +=
          '<g transform="translate(0 ' + (2 * h + 4) + ') scale(1 -1)" opacity=".16">' +
          poli(v.contorno, 'fill="#FFFFFF"') +
          '</g>';
      }
    }
    if (o.montana === 'cerros' || o.montana === 'volcan') {
      const lejos = cresta(ctx.az, -20, 820, h - (o.montana === 'cerros' ? 40 : 10), o.montana === 'cerros' ? 34 : 14, 20);
      s += capa(lejos, h + 2, mezclar(ctx.luz.cerroLejano, ctx.luz.bruma, 0.3));
    }
    if (o.agua) {
      s += agua(ctx, h, o.aguaFin || 600);
      const orilla = cresta(ctx.az, -20, 820, h + 1, 5, 24);
      s += bosqueCapa(ctx, orilla, h + 4, mezclar(ctx.luz.cerroMedio, ctx.luz.bruma, 0.35), 6, 16, 9);
    } else {
      const llano = cresta(ctx.az, -20, 820, h + 4, 6, 20);
      s += bosqueCapa(ctx, llano, 600, mezclar(ctx.luz.cerroMedio, ctx.luz.bruma, 0.3), 8, 22, 9);
    }
    return s;
  }

  /* ---------- arquitectura exterior ---------- */
  function patronTejuela(ctx, base) {
    const nombre = 'tej' + base.slice(1);
    const osc = oscurecer(base, 0.35);
    const cl = aclarar(base, 0.1);
    let fila = '';
    for (const x of [0, 7]) fila += '<path d="M' + x + ' 0h7v4.5a3.5 3.5 0 0 1-7 0z" fill="' + base + '" stroke="' + osc + '" stroke-width=".6"/>';
    for (const x of [-3.5, 3.5, 10.5]) fila += '<path d="M' + x + ' 8h7v4.5a3.5 3.5 0 0 1-7 0z" fill="' + cl + '" stroke="' + osc + '" stroke-width=".6"/>';
    fila += '<path d="M1 2.2h5M8 2.6h5M4.5 10.4h5M11.5 10.2h2" stroke="#FFFFFF" stroke-width=".5" opacity=".18"/>';
    return def(
      ctx,
      nombre,
      '<pattern id="' + ctx.id + nombre + '" width="14" height="16" patternUnits="userSpaceOnUse"><rect width="14" height="16" fill="' + osc + '"/>' + fila + '</pattern>'
    );
  }
  function patronTablas(ctx, base, vertical) {
    const nombre = (vertical ? 'tv' : 'th') + base.slice(1);
    const osc = oscurecer(base, 0.3);
    const contenido = vertical
      ? '<rect width="12" height="40" fill="' + base + '"/><rect x="11" width="1.2" height="40" fill="' + osc + '"/><rect x="3" y="10" width="5" height="1" fill="' + aclarar(base, 0.08) + '" opacity=".6"/>'
      : '<rect width="40" height="10" fill="' + base + '"/><rect y="8.8" width="40" height="1.2" fill="' + osc + '"/><rect y="0" width="40" height="1.5" fill="' + aclarar(base, 0.12) + '" opacity=".6"/>';
    return def(
      ctx,
      nombre,
      '<pattern id="' + ctx.id + nombre + '" width="' + (vertical ? 12 : 40) + '" height="' + (vertical ? 40 : 10) + '" patternUnits="userSpaceOnUse">' + contenido + '</pattern>'
    );
  }
  function vidrio(ctx) {
    const L = ctx.luz;
    return gradL(ctx, 'vidrio', 0, 0, 0.6, 1, [[0, aclarar(L.cielo[1], 0.35)], [0.45, mezclar(L.cielo[0], '#2C4A55', 0.45)], [1, '#1E3238']]);
  }
  function ventana(ctx, x, y, w, h, marco, opciones) {
    const o = opciones || {};
    let s = '<rect x="' + r(x - 3) + '" y="' + r(y - 3) + '" width="' + r(w + 6) + '" height="' + r(h + 6) + '" fill="' + marco + '"/>';
    s += '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) + '" height="' + r(h) + '" fill="' + vidrio(ctx) + '"/>';
    if (o.calida) {
      const g = gradV(ctx, 'calida', [[0, '#F8D9A0', 0.35], [1, '#F2B866', 0.85]]);
      s += '<rect x="' + r(x) + '" y="' + r(y + h * 0.3) + '" width="' + r(w) + '" height="' + r(h * 0.7) + '" fill="' + g + '"/>';
    }
    s += '<path d="M' + r(x + w * 0.15) + ' ' + r(y) + 'L' + r(x + w * 0.45) + ' ' + r(y) + 'L' + r(x) + ' ' + r(y + h * 0.55) + 'L' + r(x) + ' ' + r(y + h * 0.2) + 'Z" fill="#FFFFFF" opacity=".22"/>';
    const divs = o.hojas || 2;
    for (let i = 1; i < divs; i++) s += '<rect x="' + r(x + (w * i) / divs - 1.5) + '" y="' + r(y) + '" width="3" height="' + r(h) + '" fill="' + marco + '"/>';
    if (o.travesano !== false) s += '<rect x="' + r(x) + '" y="' + r(y + h * 0.36 - 1.5) + '" width="' + r(w) + '" height="3" fill="' + marco + '"/>';
    s += '<rect x="' + r(x - 6) + '" y="' + r(y + h + 2) + '" width="' + r(w + 12) + '" height="4" fill="' + oscurecer(marco, 0.1) + '"/>';
    return s;
  }
  function ventanaLateral(ctx, mapa, u0, u1, v0, v1, marco) {
    const q = [mapa(u0, v0), mapa(u1, v0), mapa(u1, v1), mapa(u0, v1)];
    let s = poli(q, 'fill="' + vidrio(ctx) + '" stroke="' + marco + '" stroke-width="3"');
    s += '<path d="M' + linea([mapa((u0 + u1) / 2, v0), mapa((u0 + u1) / 2, v1)]) + '" stroke="' + marco + '" stroke-width="2.4"/>';
    s += poli([mapa(u0, v1), mapa(lerp(u0, u1, 0.4), v1), mapa(u0, lerp(v1, v0, 0.5))], 'fill="#FFFFFF" opacity=".16"');
    return s;
  }

  function casaTradicional(ctx, o) {
    const s0 = o.esc || 1;
    const x = o.x;
    const gy = o.suelo;
    const W = 180 * s0;
    const H = (o.pisos === 1 ? 92 : 168) * s0;
    const R = W * 0.6;
    const D = 165 * s0;
    const marco = o.marco || '#F4EFE6';
    const techo = o.techo || '#3A3F41';
    const P = [x + W / 2, gy - H - R];
    const P2 = [P[0] + D, P[1] + 16 * s0];
    const A = [x + W, gy];
    const B = [x + W + D, gy - 8 * s0];
    const C = [x + W + D, gy - H + 12 * s0];
    const Dd = [x + W, gy - H];
    const mapa = (u, v) => lerpP(lerpP(A, B, u), lerpP(Dd, C, u), v);
    const ov = 16 * s0;
    const E0 = [x - ov * 0.9, gy - H + ov * 0.55];
    const E1 = [x + W + ov * 0.9, gy - H + ov * 0.55];
    const E2 = [B[0] + ov * 0.7, C[1] + ov * 0.45];
    const tej = patronTejuela(ctx, o.color);
    let s = '';
    // sombra al suelo
    s += '<ellipse cx="' + r(x + W * 0.8) + '" cy="' + r(gy + 4) + '" rx="' + r(W * 1.1) + '" ry="' + r(14 * s0) + '" fill="#1E2A22" opacity=".28"/>';
    // muro lateral
    s += poli([A, B, C, Dd], 'fill="' + tej + '"');
    s += poli([A, B, C, Dd], 'fill="#0F1A1A" opacity=".26"');
    // ventanas laterales
    if (o.pisos === 1) {
      s += ventanaLateral(ctx, mapa, 0.15, 0.42, 0.25, 0.75, marco);
      s += ventanaLateral(ctx, mapa, 0.58, 0.85, 0.25, 0.75, marco);
    } else {
      s += ventanaLateral(ctx, mapa, 0.12, 0.38, 0.1, 0.4, marco);
      s += ventanaLateral(ctx, mapa, 0.55, 0.88, 0.1, 0.4, marco);
      s += ventanaLateral(ctx, mapa, 0.2, 0.45, 0.6, 0.86, marco);
      s += ventanaLateral(ctx, mapa, 0.62, 0.86, 0.6, 0.86, marco);
    }
    // faldón del techo
    const gTecho = gradL(ctx, 'techo' + techo.slice(1), 0, 0, 1, 1, [[0, aclarar(techo, 0.12)], [1, oscurecer(techo, 0.2)]]);
    s += poli([P, P2, E2, E1], 'fill="' + gTecho + '"');
    let nerv = '';
    for (let i = 1; i < 14; i++) {
      const t = i / 14;
      const a = lerpP(P, P2, t);
      const b = lerpP(E1, E2, t);
      nerv += 'M' + r(a[0]) + ' ' + r(a[1]) + 'L' + r(b[0]) + ' ' + r(b[1]);
    }
    s += '<path d="' + nerv + '" stroke="' + oscurecer(techo, 0.35) + '" stroke-width="1.2" opacity=".6"/>';
    s += '<path d="M' + linea([E1, E2]) + '" stroke="' + oscurecer(techo, 0.4) + '" stroke-width="' + r(4 * s0) + '"/>';
    // chimenea
    const ch = lerpP(lerpP(P, P2, 0.72), lerpP(E1, E2, 0.72), 0.35);
    s += '<rect x="' + r(ch[0] - 9 * s0) + '" y="' + r(ch[1] - 34 * s0) + '" width="' + r(18 * s0) + '" height="' + r(40 * s0) + '" fill="#6E6A64"/>';
    s += '<rect x="' + r(ch[0] - 11 * s0) + '" y="' + r(ch[1] - 38 * s0) + '" width="' + r(22 * s0) + '" height="' + r(5 * s0) + '" fill="#3E3B37"/>';
    if (o.humo) {
      const gh = gradR(ctx, 'humo', [[0, '#F4F2EE', 0.55], [1, '#F4F2EE', 0]]);
      s += '<ellipse cx="' + r(ch[0] + 14 * s0) + '" cy="' + r(ch[1] - 62 * s0) + '" rx="' + r(26 * s0) + '" ry="' + r(14 * s0) + '" fill="' + gh + '"/>';
      s += '<ellipse cx="' + r(ch[0] + 42 * s0) + '" cy="' + r(ch[1] - 92 * s0) + '" rx="' + r(36 * s0) + '" ry="' + r(16 * s0) + '" fill="' + gh + '"/>';
    }
    // fachada frontal (muro + tímpano)
    s += '<rect x="' + r(x) + '" y="' + r(gy - H) + '" width="' + r(W) + '" height="' + r(H) + '" fill="' + tej + '"/>';
    s += poli([[x, gy - H], P, [x + W, gy - H]], 'fill="' + tej + '"');
    s += '<rect x="' + r(x) + '" y="' + r(gy - H) + '" width="' + r(W) + '" height="' + r(H) + '" fill="' + ctx.luz.solColor + '" opacity="' + ctx.luz.calidez + '"/>';
    // sombra bajo alero
    s += poli([[x, gy - H], P, [x + W, gy - H], [x + W, gy - H + 8 * s0], P.map((v, i) => (i ? v + 14 * s0 : v)), [x, gy - H + 8 * s0]], 'fill="#0F1A1A" opacity=".2"');
    // tapas del alero (frontón)
    s += '<path d="M' + linea([E0, P, E1]) + '" stroke="' + marco + '" stroke-width="' + r(7 * s0) + '" fill="none" stroke-linejoin="miter"/>';
    s += '<path d="M' + linea([E0, P, E1]) + '" stroke="' + oscurecer(techo, 0.3) + '" stroke-width="' + r(2 * s0) + '" fill="none" transform="translate(0 ' + r(-4 * s0) + ')"/>';
    // esquineros
    s += '<rect x="' + r(x - 2 * s0) + '" y="' + r(gy - H) + '" width="' + r(6 * s0) + '" height="' + r(H) + '" fill="' + marco + '"/>';
    s += '<rect x="' + r(x + W - 4 * s0) + '" y="' + r(gy - H) + '" width="' + r(6 * s0) + '" height="' + r(H) + '" fill="' + marco + '"/>';
    // ventana del tímpano
    if (o.pisos === 1) {
      s += ventana(ctx, x + W / 2 - 15 * s0, gy - H - R * 0.55, 30 * s0, 30 * s0, marco, { hojas: 1 });
    } else {
      s += ventana(ctx, x + W / 2 - 16 * s0, gy - H - R * 0.6, 32 * s0, 38 * s0, marco, { hojas: 2 });
    }
    // ventanas frontales y puerta
    const calida = !!o.calida;
    if (o.pisos === 2) {
      s += ventana(ctx, x + 22 * s0, gy - H + 24 * s0, 46 * s0, 54 * s0, marco, { calida });
      s += ventana(ctx, x + W - 68 * s0, gy - H + 24 * s0, 46 * s0, 54 * s0, marco, { calida });
    }
    s += ventana(ctx, x + 18 * s0, gy - 76 * s0, 78 * s0, 54 * s0, marco, { hojas: 3, calida });
    // puerta
    const px = x + W - 58 * s0;
    s += '<rect x="' + r(px - 4 * s0) + '" y="' + r(gy - 82 * s0) + '" width="' + r(42 * s0) + '" height="' + r(70 * s0) + '" fill="' + marco + '"/>';
    s += '<rect x="' + r(px) + '" y="' + r(gy - 78 * s0) + '" width="' + r(34 * s0) + '" height="' + r(66 * s0) + '" fill="' + (o.puerta || '#5B3A29') + '"/>';
    s += '<rect x="' + r(px + 6 * s0) + '" y="' + r(gy - 72 * s0) + '" width="' + r(22 * s0) + '" height="' + r(18 * s0) + '" fill="' + vidrio(ctx) + '"/>';
    s += '<rect x="' + r(px + 6 * s0) + '" y="' + r(gy - 48 * s0) + '" width="' + r(22 * s0) + '" height="' + r(28 * s0) + '" fill="none" stroke="#000" stroke-opacity=".2"/>';
    s += '<circle cx="' + r(px + 28 * s0) + '" cy="' + r(gy - 44 * s0) + '" r="' + r(2 * s0) + '" fill="#D8C08A"/>';
    // cobertizo de la entrada
    s += '<path d="M' + r(px - 12 * s0) + ' ' + r(gy - 86 * s0) + 'L' + r(px + 17 * s0) + ' ' + r(gy - 104 * s0) + 'L' + r(px + 46 * s0) + ' ' + r(gy - 86 * s0) + '" fill="' + techo + '" stroke="' + marco + '" stroke-width="' + r(3 * s0) + '"/>';
    // zócalo y terraza
    s += '<rect x="' + r(x - 4 * s0) + '" y="' + r(gy - 12 * s0) + '" width="' + r(W + 8 * s0) + '" height="' + r(12 * s0) + '" fill="#6F6C66"/>';
    s += poli([A, B, [B[0], B[1] - 10 * s0], [A[0], A[1] - 12 * s0]], 'fill="#55524D"');
    const tz = gy + 2 * s0;
    s += '<rect x="' + r(x - 30 * s0) + '" y="' + r(tz - 12 * s0) + '" width="' + r(W * 0.62) + '" height="' + r(10 * s0) + '" fill="#8A6A4D"/>';
    s += '<rect x="' + r(x - 30 * s0) + '" y="' + r(tz - 2 * s0) + '" width="' + r(W * 0.62) + '" height="' + r(4 * s0) + '" fill="#5A4433"/>';
    let bar = '';
    for (let i = 0; i <= 9; i++) {
      const bx = x - 30 * s0 + (i / 9) * W * 0.6;
      bar += '<rect x="' + r(bx) + '" y="' + r(tz - 40 * s0) + '" width="' + r(2.6 * s0) + '" height="' + r(28 * s0) + '" fill="#E9E1D2"/>';
    }
    s += bar + '<rect x="' + r(x - 32 * s0) + '" y="' + r(tz - 43 * s0) + '" width="' + r(W * 0.62 + 4 * s0) + '" height="' + r(4 * s0) + '" fill="#F1EADD"/>';
    // escalones
    s += '<rect x="' + r(px - 6 * s0) + '" y="' + r(gy - 12 * s0) + '" width="' + r(46 * s0) + '" height="' + r(6 * s0) + '" fill="#8B8780"/>';
    s += '<rect x="' + r(px - 10 * s0) + '" y="' + r(gy - 6 * s0) + '" width="' + r(54 * s0) + '" height="' + r(7 * s0) + '" fill="#9E9A92"/>';
    return s;
  }

  function casaModerna(ctx, o) {
    const s0 = o.esc || 1;
    const x = o.x;
    const gy = o.suelo;
    const W = 300 * s0;
    const H = 96 * s0;
    const D = 120 * s0;
    const marco = '#2B2F2F';
    const tabla = patronTablas(ctx, o.color, true);
    let s = '<ellipse cx="' + r(x + W * 0.7) + '" cy="' + r(gy + 6) + '" rx="' + r(W * 0.85) + '" ry="' + r(14 * s0) + '" fill="#1E2A22" opacity=".3"/>';
    const A = [x + W, gy];
    const B = [x + W + D, gy - 10 * s0];
    const C = [x + W + D, gy - H + 4 * s0];
    const Dd = [x + W, gy - H - 8 * s0];
    const mapa = (u, v) => lerpP(lerpP(A, B, u), lerpP(Dd, C, u), v);
    s += poli([A, B, C, Dd], 'fill="' + tabla + '"');
    s += poli([A, B, C, Dd], 'fill="#0F1A1A" opacity=".3"');
    s += ventanaLateral(ctx, mapa, 0.2, 0.8, 0.3, 0.8, marco);
    // volumen principal
    s += '<rect x="' + r(x) + '" y="' + r(gy - H) + '" width="' + r(W) + '" height="' + r(H) + '" fill="' + tabla + '"/>';
    s += '<rect x="' + r(x) + '" y="' + r(gy - H) + '" width="' + r(W) + '" height="' + r(H) + '" fill="' + ctx.luz.solColor + '" opacity="' + ctx.luz.calidez + '"/>';
    // gran ventanal
    const vx = x + W * 0.32;
    const vw = W * 0.6;
    s += '<rect x="' + r(vx - 3) + '" y="' + r(gy - H + 14 * s0) + '" width="' + r(vw + 6) + '" height="' + r(H - 22 * s0) + '" fill="' + marco + '"/>';
    s += '<rect x="' + r(vx) + '" y="' + r(gy - H + 17 * s0) + '" width="' + r(vw) + '" height="' + r(H - 28 * s0) + '" fill="' + vidrio(ctx) + '"/>';
    if (o.calida) {
      const g = gradV(ctx, 'calidaM', [[0, '#F8D9A0', 0.2], [1, '#F2B866', 0.7]]);
      s += '<rect x="' + r(vx) + '" y="' + r(gy - H + 40 * s0) + '" width="' + r(vw) + '" height="' + r(H - 51 * s0) + '" fill="' + g + '"/>';
    }
    for (let i = 1; i < 4; i++) s += '<rect x="' + r(vx + (vw * i) / 4 - 1.5) + '" y="' + r(gy - H + 17 * s0) + '" width="3" height="' + r(H - 28 * s0) + '" fill="' + marco + '"/>';
    s += '<path d="M' + r(vx + vw * 0.05) + ' ' + r(gy - H + 17 * s0) + 'h' + r(vw * 0.3) + 'L' + r(vx + vw * 0.12) + ' ' + r(gy - 11 * s0) + 'h' + r(-vw * 0.12) + 'Z" fill="#FFFFFF" opacity=".16"/>';
    s += ventana(ctx, x + 22 * s0, gy - H + 22 * s0, 44 * s0, 36 * s0, marco, { hojas: 1, travesano: false });
    // segundo volumen
    if (o.pisos === 2) {
      const x2 = x + W * 0.12;
      const W2 = W * 0.58;
      const H2 = 80 * s0;
      const y2 = gy - H - H2;
      s += '<rect x="' + r(x2) + '" y="' + r(y2) + '" width="' + r(W2) + '" height="' + r(H2) + '" fill="' + aclarar(o.acento || '#E9E4DA', 0) + '"/>';
      s += '<rect x="' + r(x2) + '" y="' + r(y2) + '" width="' + r(W2) + '" height="' + r(H2) + '" fill="' + ctx.luz.solColor + '" opacity="' + ctx.luz.calidez + '"/>';
      s += ventana(ctx, x2 + 18 * s0, y2 + 18 * s0, W2 * 0.55, H2 - 34 * s0, marco, { hojas: 3, travesano: false, calida: o.calida });
      s += '<rect x="' + r(x2 - 10 * s0) + '" y="' + r(y2 - 8 * s0) + '" width="' + r(W2 + 20 * s0) + '" height="' + r(9 * s0) + '" fill="#2A2E2E"/>';
      s += '<rect x="' + r(x2) + '" y="' + r(gy - H - 4 * s0) + '" width="' + r(W2) + '" height="' + r(4 * s0) + '" fill="#0F1A1A" opacity=".25"/>';
    }
    // alero y losa
    s += '<path d="M' + r(x - 16 * s0) + ' ' + r(gy - H - 4 * s0) + 'L' + r(x + W + 22 * s0) + ' ' + r(gy - H - 14 * s0) + 'L' + r(x + W + D + 14 * s0) + ' ' + r(gy - H - 2 * s0) + 'L' + r(x + W + D + 14 * s0) + ' ' + r(gy - H + 4 * s0) + 'L' + r(x + W + 22 * s0) + ' ' + r(gy - H - 6 * s0) + 'L' + r(x - 16 * s0) + ' ' + r(gy - H + 4 * s0) + 'Z" fill="#2A2E2E"/>';
    s += '<rect x="' + r(x) + '" y="' + r(gy - H + 4 * s0) + '" width="' + r(W) + '" height="' + r(6 * s0) + '" fill="#0F1A1A" opacity=".22"/>';
    // deck
    s += poli([[x - 40 * s0, gy + 2 * s0], [x + W + 30 * s0, gy + 2 * s0], [x + W + 70 * s0, gy + 22 * s0], [x - 60 * s0, gy + 22 * s0]], 'fill="#A0805F"');
    let dl = '';
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      dl += 'M' + r(lerp(x - 40 * s0, x - 60 * s0, t)) + ' ' + r(lerp(gy + 2 * s0, gy + 22 * s0, t)) + 'L' + r(lerp(x + W + 30 * s0, x + W + 70 * s0, t)) + ' ' + r(lerp(gy + 2 * s0, gy + 22 * s0, t));
    }
    s += '<path d="' + dl + '" stroke="#6E553E" stroke-width="1"/>';
    s += '<rect x="' + r(x - 60 * s0) + '" y="' + r(gy + 22 * s0) + '" width="' + r(W + 130 * s0) + '" height="' + r(5 * s0) + '" fill="#5A4433"/>';
    return s;
  }

  function edificio(ctx, o) {
    const x = o.x;
    const gy = o.suelo;
    const pisos = o.pisos || 8;
    const hp = o.altoPiso || 34;
    const W = o.ancho || 250;
    const H = pisos * hp + 20;
    const D = o.fondo || 110;
    const base = o.color || '#DCD5C8';
    let s = '';
    const A = [x + W, gy];
    const B = [x + W + D, gy - 6];
    const C = [x + W + D, gy - H + 14];
    const Dd = [x + W, gy - H];
    const mapa = (u, v) => lerpP(lerpP(A, B, u), lerpP(Dd, C, u), v);
    s += poli([A, B, C, Dd], 'fill="' + oscurecer(base, 0.25) + '"');
    for (let p = 0; p < pisos; p++) {
      const v0 = (p * hp + 26) / H;
      const v1 = (p * hp + hp - 2) / H;
      s += ventanaLateral(ctx, mapa, 0.12, 0.42, v0, v1, oscurecer(base, 0.4));
      s += ventanaLateral(ctx, mapa, 0.58, 0.88, v0, v1, oscurecer(base, 0.4));
    }
    const lad = o.ladrillo ? patronTablas(ctx, base, false) : base;
    s += '<rect x="' + r(x) + '" y="' + r(gy - H) + '" width="' + r(W) + '" height="' + r(H) + '" fill="' + lad + '"/>';
    s += '<rect x="' + r(x) + '" y="' + r(gy - H) + '" width="' + r(W) + '" height="' + r(H) + '" fill="' + ctx.luz.solColor + '" opacity="' + (ctx.luz.calidez + 0.04) + '"/>';
    const vid = vidrio(ctx);
    for (let p = 0; p < pisos; p++) {
      const y = gy - (p + 1) * hp - 4;
      if (p === 0) {
        s += '<rect x="' + r(x + 20) + '" y="' + r(y + 4) + '" width="' + r(W * 0.4) + '" height="' + r(hp - 4) + '" fill="' + vid + '"/>';
        s += '<rect x="' + r(x + 20) + '" y="' + r(y + 4) + '" width="' + r(W * 0.4) + '" height="' + r(hp - 4) + '" fill="#F3C88A" opacity=".35"/>';
        s += '<rect x="' + r(x + 10) + '" y="' + r(y) + '" width="' + r(W * 0.4 + 20) + '" height="5" fill="#2E3536"/>';
        continue;
      }
      // ventanales y balcones
      s += '<rect x="' + r(x + 14) + '" y="' + r(y + 4) + '" width="' + r(W * 0.52) + '" height="' + r(hp - 9) + '" fill="' + vid + '"/>';
      s += '<rect x="' + r(x + W * 0.62) + '" y="' + r(y + 6) + '" width="' + r(W * 0.3) + '" height="' + r(hp - 14) + '" fill="' + vid + '"/>';
      if (ctx.az() < 0.22) s += '<rect x="' + r(x + W * 0.62) + '" y="' + r(y + 6 + (hp - 14) * 0.35) + '" width="' + r(W * 0.3) + '" height="' + r((hp - 14) * 0.65) + '" fill="#F3C88A" opacity=".55"/>';
      s += '<rect x="' + r(x + 14 + W * 0.26 - 1) + '" y="' + r(y + 4) + '" width="2" height="' + r(hp - 9) + '" fill="#2E3536" opacity=".7"/>';
      // losa de balcón
      s += '<rect x="' + r(x + 6) + '" y="' + r(y + hp - 6) + '" width="' + r(W * 0.56 + 6) + '" height="5" fill="' + aclarar(base, 0.35) + '"/>';
      s += '<rect x="' + r(x + 6) + '" y="' + r(y + hp - 16) + '" width="' + r(W * 0.56 + 6) + '" height="10" fill="#DDEBEE" opacity=".35"/>';
      s += '<rect x="' + r(x + 6) + '" y="' + r(y + hp - 17) + '" width="' + r(W * 0.56 + 6) + '" height="1.6" fill="#2E3536"/>';
      if (ctx.az() < 0.3) s += '<circle cx="' + r(x + 18 + ctx.az() * W * 0.4) + '" cy="' + r(y + hp - 14) + '" r="5" fill="#557A48"/>';
    }
    s += '<rect x="' + r(x - 4) + '" y="' + r(gy - H - 6) + '" width="' + r(W + 8) + '" height="8" fill="' + oscurecer(base, 0.35) + '"/>';
    s += poli([Dd, C, [C[0], C[1] - 6], [Dd[0], Dd[1] - 6]], 'fill="' + oscurecer(base, 0.45) + '"');
    return s;
  }

  function vereda(ctx, y) {
    let s = '<rect y="' + y + '" width="800" height="' + (600 - y) + '" fill="#BDB6AA"/>';
    let d = '';
    for (let x = -20; x < 820; x += 46) d += 'M' + x + ' ' + y + 'L' + (x - 30) + ' 600';
    for (let yy = y + 18; yy < 600; yy += 24) d += 'M0 ' + yy + 'H800';
    s += '<path d="' + d + '" stroke="#A39C90" stroke-width="1.2"/>';
    s += '<rect y="' + y + '" width="800" height="6" fill="#8F897E"/>';
    return s;
  }
  function ciudadFondo(ctx, base, n, colorBase) {
    let s = '';
    let x = -20;
    while (x < 820) {
      const w = 40 + ctx.az() * 70;
      const h = 40 + ctx.az() * n;
      const c = mezclar(colorBase, ctx.luz.bruma, 0.35 + ctx.az() * 0.3);
      s += '<rect x="' + r(x) + '" y="' + r(base - h) + '" width="' + r(w) + '" height="' + r(h) + '" fill="' + c + '"/>';
      let v = '';
      for (let yy = base - h + 8; yy < base - 6; yy += 10) v += 'M' + r(x + 6) + ' ' + r(yy) + 'h' + r(w - 12);
      s += '<path d="' + v + '" stroke="' + oscurecer(c, 0.15) + '" stroke-width="3" stroke-dasharray="6 4" opacity=".5"/>';
      x += w + 4 + ctx.az() * 10;
    }
    return s;
  }

  /* ---------- escenas ---------- */
  const ESCENAS = {};

  ESCENAS.fachada = function (ctx, o) {
    const h = 300;
    let s = paisaje(ctx, { horizonte: h, montana: o.montana || 'volcan', agua: o.agua !== false, volcanX: o.volcanX || 610, volcanMitad: 210, volcanAlto: 170 });
    // lomas con bosque detrás de la casa
    const loma = cresta(ctx.az, -20, 820, h + 34, 14, 18);
    s += bosqueCapa(ctx, loma, 600, ctx.luz.bosque, 18, 46, 10);
    const L = ctx.luz;
    const gPasto = gradV(ctx, 'pasto', [[0, L.pasto[0]], [1, L.pasto[1]]]);
    const prado = cresta(ctx.az, -20, 820, h + 74, 8, 30);
    s += capa(prado, 600, gPasto);
    s += pasto(ctx, 0, 800, h + 80, 600, 260, oscurecer(L.pasto[1], 0.3), 0.35);
    s += conifera(70, h + 150, 170, '#2F4A3C');
    s += conifera(130, h + 160, 120, '#365444');
    if (o.estilo === 'moderna') {
      s += casaModerna(ctx, { x: 190, suelo: 488, pisos: o.pisos, color: o.color, acento: o.acento, calida: o.calida });
    } else {
      s += casaTradicional(ctx, { x: 215, suelo: 500, pisos: o.pisos, color: o.color, techo: o.techo, marco: o.marco, puerta: o.puerta, calida: o.calida, humo: o.humo !== false });
    }
    s += frondoso(ctx, 720, 520, 46, '#4C6B45');
    s += hortensias(ctx, 160, 512, 56, 1);
    s += hortensias(ctx, 600, 530, 110, 1.15);
    // sendero
    s += '<path d="M330 600 C 360 560 390 530 420 506 L 448 506 C 430 532 420 566 430 600 Z" fill="#B8AE98" opacity=".9"/>';
    s += pasto(ctx, 0, 800, 540, 600, 120, '#2E4A2B', 0.45);
    return s;
  };

  ESCENAS.edificio = function (ctx, o) {
    const h = 330;
    let s = paisaje(ctx, { horizonte: h, montana: o.montana || 'cerros', agua: !!o.agua, volcanX: 640, volcanMitad: 180, volcanAlto: 150 });
    s += ciudadFondo(ctx, h + 30, 90, '#8E9A9B');
    s += edificio(ctx, { x: 200, suelo: 520, pisos: o.pisos || 8, ancho: 250, color: o.color, ladrillo: o.ladrillo, altoPiso: o.pisos > 9 ? 30 : 36 });
    s += vereda(ctx, 520);
    s += frondoso(ctx, 120, 560, 44, '#4E6E48');
    s += frondoso(ctx, 690, 566, 50, '#466843');
    // farol
    s += '<path d="M590 568V430h18" stroke="#2B3131" stroke-width="4" fill="none"/><rect x="604" y="428" width="16" height="6" rx="2" fill="#2B3131"/>';
    return s;
  };

  ESCENAS.oficinas = function (ctx, o) {
    const h = 320;
    let s = paisaje(ctx, { horizonte: h, montana: o.montana || 'cerros', agua: !!o.agua });
    s += ciudadFondo(ctx, h + 40, 110, '#8A9799');
    const x = 170;
    const W = 330;
    const top = 70;
    const gy = 520;
    const gVid = gradL(ctx, 'muroCortina', 0, 0, 1, 1, [[0, aclarar(ctx.luz.cielo[1], 0.2)], [0.5, mezclar(ctx.luz.cielo[0], '#2D4C57', 0.4)], [1, '#22383F']]);
    s += '<rect x="' + x + '" y="' + top + '" width="' + W + '" height="' + (gy - top) + '" fill="' + gVid + '"/>';
    let grid = '';
    for (let xx = x; xx <= x + W; xx += 33) grid += 'M' + xx + ' ' + top + 'V' + gy;
    for (let yy = top; yy <= gy; yy += 30) grid += 'M' + x + ' ' + yy + 'H' + (x + W);
    s += '<path d="' + grid + '" stroke="#C9D3D4" stroke-width="1.6" opacity=".7"/>';
    s += '<path d="M' + x + ' ' + (top + 40) + 'L' + (x + 150) + ' ' + top + 'L' + (x + 230) + ' ' + top + 'L' + x + ' ' + (top + 200) + 'Z" fill="#FFFFFF" opacity=".14"/>';
    // reflejo de cerro
    s += '<path d="M' + x + ' ' + (gy - 120) + 'Q' + (x + 120) + ' ' + (gy - 175) + ' ' + (x + W) + ' ' + (gy - 130) + 'V' + gy + 'H' + x + 'Z" fill="#3E5E55" opacity=".35"/>';
    for (let xx = x; xx <= x + W; xx += 66) s += '<rect x="' + (xx - 3) + '" y="' + top + '" width="6" height="' + (gy - top) + '" fill="#D8DCD7"/>';
    s += poli([[x + W, top], [x + W + 90, top + 16], [x + W + 90, gy - 6], [x + W, gy]], 'fill="#5E6A6B"');
    s += '<rect x="' + (x - 6) + '" y="' + (top - 10) + '" width="' + (W + 12) + '" height="12" fill="#C7C9C3"/>';
    s += '<rect x="' + (x + 120) + '" y="' + (gy - 64) + '" width="90" height="64" fill="#1E2C30"/><rect x="' + (x + 124) + '" y="' + (gy - 60) + '" width="40" height="60" fill="#F0C98A" opacity=".55"/>';
    s += '<rect x="' + (x + 100) + '" y="' + (gy - 74) + '" width="130" height="10" fill="#C7C9C3"/>';
    s += vereda(ctx, gy);
    s += frondoso(ctx, 100, 560, 48, '#4E6E48');
    s += frondoso(ctx, 700, 570, 40, '#466843');
    return s;
  };

  ESCENAS.local = function (ctx, o) {
    const L = ctx.luz;
    let s = cielo(ctx, 200) + nubes(ctx, 3, 80);
    s += '<rect x="0" y="150" width="120" height="380" fill="#B8A88F"/><rect x="680" y="130" width="120" height="400" fill="#8E9A93"/>';
    const tej = patronTejuela(ctx, o.color || '#D6C7A8');
    const x = 120;
    const W = 560;
    s += '<rect x="' + x + '" y="110" width="' + W + '" height="420" fill="' + tej + '"/>';
    s += '<rect x="' + x + '" y="110" width="' + W + '" height="420" fill="' + L.solColor + '" opacity=".08"/>';
    s += '<path d="M' + (x - 20) + ' 112L400 30L' + (x + W + 20) + ' 112Z" fill="' + (o.techo || '#3A3F41') + '"/>';
    s += '<path d="M' + (x - 20) + ' 112L400 30L' + (x + W + 20) + ' 112" stroke="#F1EADD" stroke-width="6" fill="none"/>';
    s += ventana(ctx, 180, 160, 90, 80, '#F1EADD', {});
    s += ventana(ctx, 355, 160, 90, 80, '#F1EADD', {});
    s += ventana(ctx, 530, 160, 90, 80, '#F1EADD', {});
    // vitrina
    s += '<rect x="' + x + '" y="300" width="' + W + '" height="230" fill="#2B3434"/>';
    s += '<rect x="150" y="345" width="320" height="175" fill="' + vidrio(ctx) + '"/>';
    s += '<rect x="150" y="345" width="320" height="175" fill="#F4D9A8" opacity=".3"/>';
    s += '<path d="M170 345h120L190 520h-40z" fill="#FFFFFF" opacity=".14"/>';
    s += '<rect x="308" y="345" width="4" height="175" fill="#2B3434"/>';
    s += '<rect x="500" y="345" width="90" height="175" fill="' + vidrio(ctx) + '"/><rect x="574" y="420" width="4" height="26" fill="#D8C08A"/>';
    // toldo
    const toldo = o.toldo || '#B8794B';
    let franjas = '';
    for (let i = 0; i < 14; i++) franjas += '<path d="M' + (130 + i * 40) + ' 300h20l-6 34h-20z" fill="' + (i % 2 ? toldo : '#F1E8DA') + '"/>';
    s += '<path d="M126 300h548l-14 34H112z" fill="' + toldo + '"/>' + franjas;
    s += '<path d="M112 334h548" stroke="' + oscurecer(toldo, 0.3) + '" stroke-width="3"/>';
    s += '<rect x="250" y="262" width="300" height="30" rx="2" fill="#F4EFE6" stroke="#2B3434" stroke-width="2"/>';
    s += '<text x="400" y="283" text-anchor="middle" font-family="Manrope, sans-serif" font-size="15" font-weight="700" letter-spacing="3" fill="#1F4A4A">DISPONIBLE</text>';
    s += vereda(ctx, 530);
    s += '<rect x="630" y="500" width="34" height="40" fill="#7A5A44"/><ellipse cx="647" cy="496" rx="24" ry="18" fill="#557A48"/>';
    s += hortensias(ctx, 132, 548, 60, 0.9);
    return s;
  };

  ESCENAS.terreno = function (ctx, o) {
    const h = 290;
    const L = ctx.luz;
    let s = paisaje(ctx, { horizonte: h, montana: 'volcan', agua: !!o.agua, volcanX: o.volcanX || 520, volcanMitad: 250, volcanAlto: 200 });
    const loma1 = cresta(ctx.az, -20, 820, h + 22, 10, 22);
    s += bosqueCapa(ctx, loma1, 600, mezclar(L.bosque, L.bruma, 0.35), 10, 26, 8);
    const gP = gradV(ctx, 'potrero', [[0, aclarar(L.pasto[0], 0.08)], [1, L.pasto[1]]]);
    const potrero = cresta(ctx.az, -20, 820, h + 46, 18, 26);
    s += capa(potrero, 600, gP);
    // franjas de pasto cortado
    let fr = '';
    for (let i = 0; i < 9; i++) fr += 'M' + (-100 + i * 120) + ' 600 Q ' + (300 + i * 30) + ' ' + (h + 120) + ' ' + (360 + i * 40) + ' ' + (h + 60);
    s += '<path d="' + fr + '" stroke="#FFFFFF" stroke-width="18" opacity=".05" fill="none"/>';
    if (o.bosque) {
      const nat = cresta(ctx.az, 330, 820, h + 90, 26, 14);
      s += bosqueCapa(ctx, nat, h + 190, '#2F4A3A', 40, 96, 12);
      const frente = cresta(ctx.az, -20, 820, h + 170, 10, 30);
      s += capa(frente, 600, gP);
      s += frondoso(ctx, 470, h + 200, 34, '#3F6140');
      s += conifera(720, h + 240, 150, '#2A4537');
    } else {
      s += frondoso(ctx, 640, h + 120, 26, '#4C6B45');
      s += frondoso(ctx, 680, h + 128, 20, '#557548');
    }
    s += cerco(30, 560, 520, h + 70, 12, '#6B5545');
    s += pasto(ctx, 0, 800, h + 60, 600, 320, oscurecer(L.pasto[1], 0.35), 0.35);
    s += lupinos(ctx, 0, 380, h + 170, 590, o.bosque ? 18 : 34);
    // estaca de deslinde
    s += '<rect x="560" y="470" width="6" height="70" fill="#E9E2D6"/><rect x="560" y="470" width="6" height="14" fill="#B8794B"/>';
    return s;
  };

  ESCENAS.acceso = function (ctx, o) {
    const h = 270;
    const L = ctx.luz;
    let s = paisaje(ctx, { horizonte: h, montana: 'cerros', agua: false });
    const loma = cresta(ctx.az, -20, 820, h + 30, 16, 18);
    s += bosqueCapa(ctx, loma, 600, L.bosque, 24, 60, 10);
    const gP = gradV(ctx, 'pradoAcceso', [[0, L.pasto[0]], [1, L.pasto[1]]]);
    s += '<rect y="' + (h + 40) + '" width="800" height="' + (560 - h) + '" fill="' + gP + '"/>';
    // camino de ripio
    s += '<path d="M250 600 C 330 480 380 400 392 ' + (h + 42) + ' L 408 ' + (h + 42) + ' C 440 400 560 480 680 600 Z" fill="#B9AE9A"/>';
    let rip = '';
    for (let i = 0; i < 160; i++) {
      const t = ctx.az();
      const y = h + 44 + t * (600 - h - 44);
      const half = 8 + t * 220;
      const x = 400 + (ctx.az() - 0.5) * 2 * half;
      rip += 'M' + r(x) + ' ' + r(y) + 'h' + r(1 + t * 3);
    }
    s += '<path d="' + rip + '" stroke="#8E8473" stroke-width="2" stroke-linecap="round"/>';
    // tranquera
    s += '<rect x="230" y="420" width="12" height="130" fill="#5E4A3B"/><rect x="560" y="420" width="12" height="130" fill="#5E4A3B"/>';
    let tr = '';
    for (let i = 0; i < 5; i++) tr += '<rect x="242" y="' + (436 + i * 20) + '" width="140" height="7" fill="#8A6E58"/>';
    tr += '<path d="M244 438L380 520M244 520L380 438" stroke="#8A6E58" stroke-width="6"/>';
    s += tr;
    s += cerco(10, 560, 228, 520, 4, '#5E4A3B') + cerco(580, 520, 800, 560, 4, '#5E4A3B');
    s += conifera(110, 470, 170, '#2E4A3B') + conifera(700, 480, 190, '#2A4537');
    s += pasto(ctx, 0, 800, h + 50, 600, 260, oscurecer(L.pasto[1], 0.3), 0.4);
    s += lupinos(ctx, 600, 800, 480, 590, 10);
    return s;
  };

  ESCENAS.entorno = function (ctx, o) {
    const tipo = o.lugar || 'lago';
    const L = ctx.luz;
    let s = '';
    if (tipo === 'lago' || tipo === 'muelle') {
      const h = 290;
      s += paisaje(ctx, { horizonte: h, montana: 'volcan', agua: true, volcanX: o.volcanX || 470, volcanMitad: 260, volcanAlto: 210 });
      // costanera
      s += '<path d="M0 470 Q 300 440 800 455 V600H0Z" fill="#6E7F62"/>';
      s += '<path d="M0 485 Q 300 455 800 470 V600H0Z" fill="#B3A890"/>';
      s += pasto(ctx, 0, 800, 490, 600, 90, '#7D735F', 0.4);
      if (tipo === 'muelle') {
        s += '<path d="M330 470 L 420 360 L 438 360 L 372 470Z" fill="#8A6A4D"/>';
        let pil = '';
        for (let i = 0; i < 8; i++) {
          const t = i / 7;
          const x = lerp(340, 426, t);
          const y = lerp(470, 362, t);
          pil += '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(3 - t * 1.5) + '" height="' + r(18 - t * 10) + '" fill="#4F3D2E"/>';
        }
        s += pil;
        s += '<path d="M418 352 l14 0 l-2 8 h-10z" fill="#E9E2D6"/>';
      } else {
        s += '<path d="M520 400 q 18 8 36 0 l -6 8 h-24z" fill="#F1EADD"/><path d="M538 398 v -26 l 14 22z" fill="#F7F3EA"/>';
      }
      s += frondoso(ctx, 90, 520, 52, '#4D6B45') + frondoso(ctx, 730, 530, 44, '#557548');
      s += lupinos(ctx, 180, 760, 520, 595, 26);
    } else if (tipo === 'bahia') {
      const h = 300;
      s += paisaje(ctx, { horizonte: h, montana: 'volcan', agua: true, volcanX: 650, volcanMitad: 150, volcanAlto: 130, nubes: 6 });
      // isla
      const isla = cresta(ctx.az, 60, 420, h + 40, 12, 16);
      s += bosqueCapa(ctx, isla.concat([[420, h + 60]]), h + 62, '#41594F', 10, 22, 8);
      // botes
      const botes = [[200, 470, '#B8433A'], [330, 430, '#2F5A7A'], [560, 455, '#E1B347'], [660, 500, '#2F6B5A']];
      for (const b of botes) {
        s += '<path d="M' + b[0] + ' ' + b[1] + 'h60l-10 14h-42z" fill="' + b[2] + '"/><rect x="' + (b[0] + 20) + '" y="' + (b[1] - 16) + '" width="20" height="16" fill="#F1EADD"/><path d="M' + (b[0] + 30) + ' ' + (b[1] - 16) + 'v-26" stroke="#3B3A36" stroke-width="2"/>';
        s += '<path d="M' + (b[0] - 4) + ' ' + (b[1] + 18) + 'h70" stroke="#FFFFFF" opacity=".35" stroke-width="2"/>';
      }
      s += '<path d="M0 540 Q 400 520 800 545 V600H0Z" fill="#7C7F74"/>';
      s += '<path d="M0 552 Q 400 532 800 557" stroke="#5E6058" stroke-width="3" fill="none"/>';
    } else if (tipo === 'rio') {
      const h = 280;
      s += cielo(ctx, h + 20) + nubes(ctx, 5, 120);
      const lejos = cresta(ctx.az, -20, 820, h, 20, 20);
      s += bosqueCapa(ctx, lejos, h + 40, mezclar(L.cerroMedio, L.bruma, 0.4), 14, 30, 9);
      s += agua(ctx, h + 20, 600);
      const orilla = cresta(ctx.az, -20, 470, h + 74, 12, 14).map((p) => [p[0], p[1] + Math.max(0, p[0] - 300) * 0.25]);
      s += '<path d="M' + linea(orilla) + ' L480 ' + (h + 118) + ' Q 260 ' + (h + 150) + ' 0 ' + (h + 196) + 'Z" fill="#3A5648"/>';
      s += '<path d="' + arbolesSilueta(ctx.az, orilla, 30, 72, 11) + '" fill="#3A5648"/>';
      s += '<path d="M480 ' + (h + 118) + ' Q 260 ' + (h + 150) + ' 0 ' + (h + 196) + '" stroke="#FFFFFF" stroke-width="2" opacity=".25" fill="none"/>';
      // bote de remo y pontón
      s += '<path d="M500 450h120l-14 16H514z" fill="#F1EADD"/><path d="M520 452h80" stroke="#B8433A" stroke-width="3"/>';
      s += '<path d="M540 440 L 600 470" stroke="#6B5545" stroke-width="2.5"/>';
      s += '<rect x="620" y="520" width="180" height="16" fill="#7A6A58"/><rect x="620" y="536" width="180" height="6" fill="#4F4538"/>';
      s += '<path d="M690 520 q 14 -18 34 -10 q 10 4 16 10z" fill="#5A4E46"/>';
      s += frondoso(ctx, 740, 470, 40, '#4C6B45');
    } else if (tipo === 'araucarias') {
      const h = 330;
      s += paisaje(ctx, { horizonte: h, montana: 'cerros', agua: false, nubes: 5 });
      const cerro = cresta(ctx.az, -20, 820, h - 10, 40, 18);
      s += bosqueCapa(ctx, cerro, 600, mezclar(L.bosque, L.bruma, 0.15), 18, 40, 9);
      s += ciudadFondo(ctx, h + 120, 60, '#9AA39F');
      const gP = gradV(ctx, 'praderaAr', [[0, L.pasto[0]], [1, L.pasto[1]]]);
      s += '<path d="M0 470 Q 400 440 800 470 V600H0Z" fill="' + gP + '"/>';
      s += araucaria(150, 560, 230) + araucaria(260, 520, 160) + araucaria(660, 570, 260);
      s += pasto(ctx, 0, 800, 470, 600, 160, oscurecer(L.pasto[1], 0.3), 0.4);
    } else if (tipo === 'puente') {
      const h = 300;
      s += paisaje(ctx, { horizonte: h, montana: 'cerros', agua: true, nubes: 4 });
      s += ciudadFondo(ctx, h + 6, 80, '#8E9A9B');
      // puente largo
      s += '<path d="M0 360 L 800 330" stroke="#5B6461" stroke-width="10"/>';
      let pil = '';
      for (let i = 0; i < 12; i++) {
        const x = i * 72;
        const y = 360 - (x / 800) * 30;
        pil += '<rect x="' + x + '" y="' + r(y) + '" width="7" height="' + r(440 - y) + '" fill="#6B7370"/>';
      }
      s += pil + '<path d="M0 350 L 800 320" stroke="#C9CCC4" stroke-width="3"/>';
      s += '<path d="M0 500 Q 400 470 800 505 V600H0Z" fill="#6E7F62"/>';
      s += frondoso(ctx, 120, 560, 50, '#4C6B45') + frondoso(ctx, 650, 560, 42, '#557548');
      s += pasto(ctx, 0, 800, 500, 600, 120, '#3E5733', 0.4);
    }
    return s;
  };

  /* ---------- interiores ---------- */
  const VP = [400, 300];
  const PARED = { x0: 170, x1: 630, y0: 120, y1: 370 };
  function proyectar(xFondo, yFondo, yDestino) {
    const k = (yDestino - VP[1]) / (yFondo - VP[1]);
    return [VP[0] + (xFondo - VP[0]) * k, yDestino];
  }
  function habitacion(ctx, o) {
    const P = PARED;
    const muro = o.muro || '#EFE9DF';
    const piso = o.piso || '#B88A5F';
    let s = '';
    // cielo machihembrado
    s += poli([[0, 0], [800, 0], [P.x1, P.y0], [P.x0, P.y0]], 'fill="' + (o.cielo || '#D8BE96') + '"');
    let cl = '';
    for (let i = 0; i <= 16; i++) {
      const xb = lerp(P.x0, P.x1, i / 16);
      const f = proyectar(xb, P.y0, 0);
      cl += 'M' + r(xb) + ' ' + P.y0 + 'L' + r(f[0]) + ' 0';
    }
    s += '<path d="' + cl + '" stroke="' + oscurecer(o.cielo || '#D8BE96', 0.2) + '" stroke-width="1" opacity=".7"/>';
    // vigas
    for (const t of [0.35, 0.7]) {
      const y = lerp(0, P.y0, t);
      const xi = lerp(0, P.x0, t);
      const xd = lerp(800, P.x1, t);
      s += poli([[xi, y - 9 * (1 - t) - 3], [xd, y - 9 * (1 - t) - 3], [xd, y + 5], [xi, y + 5]], 'fill="' + oscurecer(o.cielo || '#D8BE96', 0.35) + '"');
    }
    // muros laterales
    s += poli([[0, 0], [P.x0, P.y0], [P.x0, P.y1], [0, 600]], 'fill="' + oscurecer(muro, 0.1) + '"');
    s += poli([[800, 0], [P.x1, P.y0], [P.x1, P.y1], [800, 600]], 'fill="' + oscurecer(muro, 0.05) + '"');
    // muro de fondo
    s += '<rect x="' + P.x0 + '" y="' + P.y0 + '" width="' + (P.x1 - P.x0) + '" height="' + (P.y1 - P.y0) + '" fill="' + muro + '"/>';
    // piso de madera
    const gPiso = gradV(ctx, 'piso', [[0, oscurecer(piso, 0.1)], [1, aclarar(piso, 0.08)]]);
    s += poli([[P.x0, P.y1], [P.x1, P.y1], [800, 600], [0, 600]], 'fill="' + gPiso + '"');
    let pl = '';
    for (let i = 0; i <= 22; i++) {
      const xb = lerp(P.x0, P.x1, i / 22);
      const f = proyectar(xb, P.y1, 600);
      pl += 'M' + r(xb) + ' ' + P.y1 + 'L' + r(f[0]) + ' 600';
    }
    for (let i = 0; i < 40; i++) {
      const y = lerp(P.y1 + 4, 598, Math.pow(ctx.az(), 0.7));
      const tt = (y - VP[1]) / (P.y1 - VP[1]);
      const x = lerp(VP[0] - (VP[0] - P.x0) * tt, VP[0] + (P.x1 - VP[0]) * tt, ctx.az());
      pl += 'M' + r(x) + ' ' + r(y) + 'h' + r(6 + tt * 6);
    }
    s += '<path d="' + pl + '" stroke="' + oscurecer(piso, 0.3) + '" stroke-width="1" opacity=".55"/>';
    // guardapolvo
    s += '<rect x="' + P.x0 + '" y="' + (P.y1 - 8) + '" width="' + (P.x1 - P.x0) + '" height="8" fill="' + aclarar(muro, 0.4) + '"/>';
    s += '<path d="M0 600L' + P.x0 + ' ' + P.y1 + 'M800 600L' + P.x1 + ' ' + P.y1 + '" stroke="' + oscurecer(muro, 0.25) + '" stroke-width="2"/>';
    return s;
  }
  function vistaVentana(ctx, x, y, w, h, opciones) {
    const o = opciones || {};
    const clip = ctx.id + 'v' + Math.round(x) + '_' + Math.round(y);
    ctx.defs.push('<clipPath id="' + clip + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '"/></clipPath>');
    let interior;
    if (o.ciudad) {
      interior = paisaje(ctx, { horizonte: 340, montana: 'cerros', agua: !!o.agua, nubes: 3 }) + ciudadFondo(ctx, 600, 260, '#8E9A9B');
    } else {
      interior = paisaje(ctx, { horizonte: 320, montana: o.montana || 'volcan', agua: o.agua !== false, volcanX: 420, volcanMitad: 260, volcanAlto: 210, nubes: 3 });
      const loma = cresta(ctx.az, -20, 820, 470, 18, 18);
      interior += bosqueCapa(ctx, loma, 600, ctx.luz.bosque, 30, 70, 12);
    }
    let s = '<g clip-path="url(#' + clip + ')"><svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">' + interior + '</svg></g>';
    // marco
    const m = o.marco || '#3A3530';
    s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="none" stroke="' + m + '" stroke-width="8"/>';
    const hojas = o.hojas || 3;
    for (let i = 1; i < hojas; i++) s += '<rect x="' + r(x + (w * i) / hojas - 3) + '" y="' + y + '" width="6" height="' + h + '" fill="' + m + '"/>';
    s += '<path d="M' + (x + 10) + ' ' + y + 'h' + r(w * 0.22) + 'L' + (x + 4) + ' ' + r(y + h * 0.6) + 'V' + (y + 10) + 'Z" fill="#FFFFFF" opacity=".1"/>';
    return s;
  }
  function luzPiso(ctx, x, w, yVentana) {
    const g = gradV(ctx, 'haz', [[0, ctx.luz.solColor, 0.35], [1, ctx.luz.solColor, 0]]);
    const a = proyectar(x, PARED.y1, 470);
    const b = proyectar(x + w, PARED.y1, 470);
    return poli([[x, PARED.y1], [x + w, PARED.y1], [b[0] + 60, 560], [a[0] + 60, 560]], 'fill="' + g + '"') + (yVentana ? '' : '');
  }
  function planta(x, y, esc) {
    let s = '<path d="M' + r(x - 18 * esc) + ' ' + r(y - 46 * esc) + 'h' + r(36 * esc) + 'l' + r(-5 * esc) + ' ' + r(46 * esc) + 'h' + r(-26 * esc) + 'z" fill="#C9B8A0"/>';
    const hojas = [[-40, -110, -8], [-10, -150, 0], [30, -120, 10], [-50, -70, -14], [44, -80, 14], [6, -105, 4]];
    for (const h of hojas) {
      s += '<path d="M' + r(x) + ' ' + r(y - 46 * esc) + 'Q' + r(x + h[0] * 0.3 * esc) + ' ' + r(y + h[1] * 0.6 * esc) + ' ' + r(x + h[0] * esc) + ' ' + r(y + h[1] * esc) + '" stroke="#3F5E3A" stroke-width="2" fill="none"/>';
      s += '<ellipse cx="' + r(x + h[0] * esc) + '" cy="' + r(y + h[1] * esc) + '" rx="' + r(18 * esc) + '" ry="' + r(9 * esc) + '" transform="rotate(' + (h[2] * 3) + ' ' + r(x + h[0] * esc) + ' ' + r(y + h[1] * esc) + ')" fill="' + (h[2] > 0 ? '#4C7444' : '#3E6438') + '"/>';
    }
    return s;
  }
  function lamparaColgante(ctx, x, y, color) {
    const g = gradR(ctx, 'brillo', [[0, '#FFE6B5', 0.7], [1, '#FFE6B5', 0]]);
    return (
      '<path d="M' + x + ' 0V' + (y - 18) + '" stroke="#2B2B2B" stroke-width="1.5"/>' +
      '<circle cx="' + x + '" cy="' + (y + 10) + '" r="60" fill="' + g + '"/>' +
      '<path d="M' + (x - 22) + ' ' + y + 'Q' + x + ' ' + (y - 34) + ' ' + (x + 22) + ' ' + y + 'Z" fill="' + color + '"/>' +
      '<ellipse cx="' + x + '" cy="' + y + '" rx="22" ry="4" fill="#FFE9BE"/>'
    );
  }

  ESCENAS.living = function (ctx, o) {
    let s = habitacion(ctx, { muro: o.muro || '#EEE8DD', piso: o.piso || '#B48A62', cielo: '#D9BF97' });
    s += vistaVentana(ctx, 200, 140, 400, 196, { agua: o.agua !== false, montana: o.montana || 'volcan', ciudad: o.ciudad, hojas: 3 });
    s += luzPiso(ctx, 220, 360);
    // alfombra
    s += poli([[200, 470], [600, 470], [700, 590], [100, 590]], 'fill="' + (o.alfombra || '#D9CCB6') + '"');
    s += poli([[214, 480], [586, 480], [676, 580], [124, 580]], 'fill="none" stroke="' + oscurecer(o.alfombra || '#D9CCB6', 0.18) + '" stroke-width="3"');
    // estufa a combustión (muro derecho)
    s += '<path d="M690 50V330" stroke="#1F2222" stroke-width="12"/>';
    s += '<rect x="650" y="330" width="80" height="110" rx="6" fill="#262A2A"/>';
    const gFuego = gradV(ctx, 'fuego', [[0, '#FFD27A'], [0.6, '#F08A3C'], [1, '#9C3A1E']]);
    s += '<rect x="664" y="352" width="52" height="46" rx="4" fill="' + gFuego + '"/>';
    s += '<path d="M672 398q6-26 14-14q4-20 12-6q6-12 12 20z" fill="#FFF0C2" opacity=".8"/>';
    s += '<ellipse cx="690" cy="378" rx="80" ry="60" fill="#F7A55A" opacity=".08"/>';
    s += '<rect x="656" y="440" width="10" height="20" fill="#262A2A"/><rect x="714" y="440" width="10" height="20" fill="#262A2A"/>';
    // leña
    let lena = '';
    for (let i = 0; i < 6; i++) lena += '<circle cx="' + (742 + (i % 3) * 16) + '" cy="' + (470 - Math.floor(i / 3) * 14) + '" r="8" fill="#C79A6B" stroke="#7A5638" stroke-width="2"/>';
    s += lena;
    // sofá
    const sofa = o.sofa || '#C8BCA8';
    s += '<ellipse cx="300" cy="548" rx="190" ry="16" fill="#2A2018" opacity=".25"/>';
    s += '<rect x="130" y="420" width="330" height="80" rx="14" fill="' + oscurecer(sofa, 0.08) + '"/>';
    s += '<rect x="150" y="470" width="290" height="58" rx="10" fill="' + sofa + '"/>';
    s += '<rect x="112" y="450" width="46" height="88" rx="14" fill="' + oscurecer(sofa, 0.05) + '"/>';
    s += '<rect x="432" y="450" width="46" height="88" rx="14" fill="' + oscurecer(sofa, 0.05) + '"/>';
    s += '<path d="M295 474v52" stroke="' + oscurecer(sofa, 0.15) + '" stroke-width="2"/>';
    s += '<rect x="170" y="430" width="62" height="46" rx="10" fill="' + (o.cojin || '#B8794B') + '" transform="rotate(-8 200 452)"/>';
    s += '<rect x="370" y="432" width="56" height="44" rx="10" fill="#E8DFC9" transform="rotate(7 398 454)"/>';
    s += '<rect x="130" y="536" width="8" height="14" fill="#3A2A1E"/><rect x="452" y="536" width="8" height="14" fill="#3A2A1E"/>';
    // mesa de centro
    s += '<ellipse cx="420" cy="568" rx="96" ry="14" fill="#2A2018" opacity=".2"/>';
    s += '<rect x="340" y="530" width="170" height="14" rx="4" fill="#8C6644"/><rect x="352" y="544" width="8" height="24" fill="#5A4030"/><rect x="490" y="544" width="8" height="24" fill="#5A4030"/>';
    s += '<rect x="372" y="518" width="44" height="12" fill="#1F4A4A"/><rect x="376" y="510" width="40" height="8" fill="#E9E2D6"/><path d="M456 512h16v18h-16z" fill="#F4EFE6"/><path d="M472 516q8 4 0 10" stroke="#F4EFE6" stroke-width="3" fill="none"/>';
    // lámpara de pie y planta
    s += '<path d="M90 560V300" stroke="#2B2B2B" stroke-width="4"/><path d="M60 300h60l-10-40H70z" fill="#EADFC8"/><ellipse cx="90" cy="300" rx="70" ry="50" fill="#FFE6B5" opacity=".12"/>';
    s += planta(560, 480, 0.9);
    // cuadro
    s += '<rect x="618" y="160" width="0" height="0"/>';
    return s;
  };

  ESCENAS.cocina = function (ctx, o) {
    const mueble = o.mueble || '#8FA38E';
    let s = habitacion(ctx, { muro: '#F1ECE3', piso: o.piso || '#A9805A', cielo: '#DCC49E' });
    // azulejos
    const az = def(
      ctx,
      'azulejo',
      '<pattern id="' + ctx.id + 'azulejo" width="16" height="9" patternUnits="userSpaceOnUse"><rect width="16" height="9" fill="#D9D3C7"/><rect x=".6" y=".6" width="14.8" height="7.8" fill="#F7F4EE"/></pattern>'
    );
    s += '<rect x="170" y="210" width="460" height="90" fill="' + az + '"/>';
    // ventana sobre lavaplatos
    s += vistaVentana(ctx, 320, 160, 160, 120, { hojas: 2, montana: o.montana || 'volcan', agua: o.agua !== false, ciudad: o.ciudad });
    // muebles altos
    s += '<rect x="176" y="130" width="130" height="74" fill="' + mueble + '"/><rect x="494" y="130" width="130" height="74" fill="' + mueble + '"/>';
    s += '<path d="M241 134v66M559 134v66" stroke="' + oscurecer(mueble, 0.25) + '" stroke-width="2"/>';
    s += '<rect x="176" y="204" width="130" height="5" fill="#0F1A1A" opacity=".15"/><rect x="494" y="204" width="130" height="5" fill="#0F1A1A" opacity=".15"/>';
    // muebles bajos
    s += '<rect x="170" y="300" width="460" height="10" fill="#E7E1D5"/><rect x="170" y="310" width="460" height="56" fill="' + mueble + '"/>';
    let pu = '';
    for (let i = 1; i < 6; i++) pu += 'M' + (170 + (460 * i) / 6) + ' 314v48';
    s += '<path d="' + pu + '" stroke="' + oscurecer(mueble, 0.25) + '" stroke-width="2"/>';
    s += '<path d="M392 300v-26h16v4h-10v22" fill="#B9BDBA"/>';
    s += '<rect x="200" y="280" width="30" height="20" rx="3" fill="#B8794B"/><rect x="236" y="286" width="20" height="14" rx="2" fill="#E9E2D6"/>';
    s += '<path d="M560 300v-30h30v30" fill="#6B7370"/>';
    // isla
    s += poli([[220, 420], [580, 420], [620, 450], [180, 450]], 'fill="#E9E3D7"');
    s += '<rect x="180" y="450" width="440" height="110" fill="' + oscurecer(mueble, 0.08) + '"/>';
    let ver = '';
    for (let i = 1; i < 8; i++) ver += 'M' + (180 + 55 * i) + ' 454v102';
    s += '<path d="' + ver + '" stroke="' + oscurecer(mueble, 0.25) + '" stroke-width="1.5"/>';
    s += '<rect x="180" y="450" width="440" height="6" fill="#0F1A1A" opacity=".18"/>';
    s += '<ellipse cx="300" cy="422" rx="40" ry="8" fill="#C79A6B"/><circle cx="292" cy="414" r="8" fill="#D4A64A"/><circle cx="306" cy="412" r="8" fill="#B8433A"/>';
    s += '<path d="M470 420v-30h16v30z" fill="#F4EFE6" opacity=".9"/><path d="M478 390q-12-24 4-38q10 16-4 38" fill="#4C7444"/>';
    // pisos (taburetes)
    for (const x of [250, 400, 550]) {
      s += '<path d="M' + (x - 14) + ' 600L' + (x - 8) + ' 520M' + (x + 14) + ' 600L' + (x + 8) + ' 520" stroke="#2B2B2B" stroke-width="3"/>';
      s += '<ellipse cx="' + x + '" cy="518" rx="26" ry="8" fill="#8C6644"/>';
    }
    // colgantes
    s += lamparaColgante(ctx, 300, 330, '#1F4A4A') + lamparaColgante(ctx, 400, 320, '#1F4A4A') + lamparaColgante(ctx, 500, 330, '#1F4A4A');
    s += planta(118, 560, 1.05);
    return s;
  };

  ESCENAS.dormitorio = function (ctx, o) {
    let s = habitacion(ctx, { muro: o.muro || '#E9E4DA', piso: o.piso || '#BC9670', cielo: '#DCC49E' });
    // muro de cabecera revestido
    const tab = patronTablas(ctx, o.revestimiento || '#C7AE8C', true);
    s += '<rect x="250" y="120" width="300" height="250" fill="' + tab + '"/>';
    // ventana lateral izquierda
    const clip = ctx.id + 'vlat';
    ctx.defs.push('<clipPath id="' + clip + '"><path d="M40 120L140 160L140 330L40 380Z"/></clipPath>');
    const vista = paisaje(ctx, { horizonte: 320, montana: o.montana || 'volcan', agua: o.agua !== false, volcanX: 400, nubes: 2 }) + bosqueCapa(ctx, cresta(ctx.az, -20, 820, 460, 18, 18), 600, ctx.luz.bosque, 30, 70, 12);
    s += '<g clip-path="url(#' + clip + ')"><svg x="10" y="110" width="160" height="290" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">' + vista + '</svg></g>';
    s += '<path d="M40 120L140 160L140 330L40 380Z" fill="none" stroke="#3A3530" stroke-width="7"/><path d="M90 140V355" stroke="#3A3530" stroke-width="4"/>';
    s += '<path d="M24 100 Q 34 260 20 420 L 48 410 Q 56 250 46 104Z" fill="#E9DFCF"/>';
    s += '<path d="M146 150 Q 156 260 150 345 L 166 340 Q 168 250 160 152Z" fill="#E9DFCF"/>';
    s += poli([[140, 330], [40, 380], [170, 470], [290, 400]], 'fill="' + ctx.luz.solColor + '" opacity=".14"');
    // cama
    const manta = o.manta || '#1F4A4A';
    s += '<ellipse cx="400" cy="520" rx="200" ry="22" fill="#2A2018" opacity=".22"/>';
    s += '<rect x="290" y="250" width="220" height="90" rx="6" fill="#7E5C42"/>';
    s += poli([[296, 330], [504, 330], [560, 470], [240, 470]], 'fill="#F4F0E8"');
    s += '<rect x="240" y="470" width="320" height="40" fill="#E6DFD2"/>';
    s += '<rect x="312" y="300" width="80" height="40" rx="12" fill="#FBF8F2"/><rect x="408" y="300" width="80" height="40" rx="12" fill="#FBF8F2"/>';
    s += '<rect x="330" y="318" width="64" height="30" rx="10" fill="' + (o.cojin || '#D9C3A4') + '"/>';
    s += poli([[262, 420], [538, 420], [560, 470], [240, 470]], 'fill="' + manta + '"');
    s += '<rect x="240" y="470" width="320" height="22" fill="' + oscurecer(manta, 0.15) + '"/>';
    s += '<path d="M300 380 Q 400 370 500 382" stroke="#D8D0C2" stroke-width="2" fill="none"/>';
    // veladores y lámparas
    for (const x of [214, 586]) {
      s += '<rect x="' + (x - 30) + '" y="380" width="60" height="70" fill="#8C6644"/><rect x="' + (x - 30) + '" y="410" width="60" height="2" fill="#5A4030"/>';
      s += '<path d="M' + x + ' 380v-30" stroke="#2B2B2B" stroke-width="3"/><path d="M' + (x - 20) + ' 352h40l-8-30h-24z" fill="#EADFC8"/>';
      s += '<ellipse cx="' + x + '" cy="350" rx="60" ry="40" fill="#FFE6B5" opacity=".18"/>';
    }
    s += '<rect x="340" y="160" width="120" height="70" fill="#F4EFE6" stroke="#5A4030" stroke-width="4"/><path d="M350 220 L 380 180 L 400 200 L 420 176 L 450 220Z" fill="#8FA7AE"/><path d="M380 180l8 9h-14z" fill="#FFFFFF"/>';
    return s;
  };

  ESCENAS.oficina = function (ctx, o) {
    let s = habitacion(ctx, { muro: '#ECEAE4', piso: '#8F8A82', cielo: '#E9E6E0' });
    s += vistaVentana(ctx, 180, 132, 440, 200, { ciudad: true, agua: !!o.agua, hojas: 4, marco: '#2B2F2F' });
    // luminarias lineales
    s += '<path d="M260 50h280M230 90h340" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/><path d="M260 50h280M230 90h340" stroke="#FFF2D2" stroke-width="16" opacity=".25" stroke-linecap="round"/>';
    // alfombra modular
    s += poli([[240, 420], [560, 420], [660, 600], [140, 600]], 'fill="#6E7672" opacity=".55"');
    // escritorios
    function escritorio(x, y, w, esc) {
      let e = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + 10 * esc + '" fill="#F4F2EC"/>';
      e += '<rect x="' + (x + 6) + '" y="' + (y + 10 * esc) + '" width="' + 5 * esc + '" height="' + 60 * esc + '" fill="#2B2F2F"/><rect x="' + (x + w - 11) + '" y="' + (y + 10 * esc) + '" width="' + 5 * esc + '" height="' + 60 * esc + '" fill="#2B2F2F"/>';
      e += '<rect x="' + (x + w * 0.2) + '" y="' + (y - 44 * esc) + '" width="' + 70 * esc + '" height="' + 42 * esc + '" rx="2" fill="#1E2526"/><rect x="' + (x + w * 0.2 + 3 * esc) + '" y="' + (y - 41 * esc) + '" width="' + 64 * esc + '" height="' + 36 * esc + '" fill="#4C6B70"/>';
      e += '<rect x="' + (x + w * 0.2 + 30 * esc) + '" y="' + (y - 2) + '" width="' + 10 * esc + '" height="3" fill="#1E2526"/>';
      e += '<ellipse cx="' + (x + w * 0.5) + '" cy="' + (y + 100 * esc) + '" rx="' + 26 * esc + '" ry="' + 6 * esc + '" fill="#2B2F2F" opacity=".4"/>';
      e += '<rect x="' + (x + w * 0.5 - 22 * esc) + '" y="' + (y + 20 * esc) + '" width="' + 44 * esc + '" height="' + 50 * esc + '" rx="8" fill="#1F4A4A"/>';
      return e;
    }
    s += escritorio(230, 390, 150, 0.8) + escritorio(420, 390, 150, 0.8);
    s += escritorio(130, 470, 210, 1.05) + escritorio(460, 470, 210, 1.05);
    s += planta(90, 580, 1.1) + planta(730, 570, 0.95);
    return s;
  };

  ESCENAS.localInterior = function (ctx, o) {
    let s = habitacion(ctx, { muro: '#F0EBE2', piso: '#9E7A58', cielo: '#E3D2B4' });
    s += vistaVentana(ctx, 200, 150, 400, 210, { ciudad: true, hojas: 2, marco: '#2B3434' });
    // estanterías vacías laterales
    let est = poli([[40, 140], [150, 172], [150, 380], [40, 430]], 'fill="#D9C2A0"');
    for (let i = 0; i < 5; i++) {
      const v = i / 4;
      const yi = lerp(150, 420, v);
      const yd = lerp(178, 374, v);
      est += poli([[40, yi], [150, yd], [150, yd + 6], [40, yi + 8]], 'fill="#9E7A58"');
    }
    est += poli([[40, 140], [48, 142], [48, 428], [40, 430]], 'fill="#8C6644"') + poli([[144, 170], [150, 172], [150, 380], [144, 382]], 'fill="#8C6644"');
    s += est;
    s += '<rect x="520" y="430" width="200" height="90" fill="#8C6644"/><rect x="510" y="420" width="220" height="12" fill="#E9E3D7"/>';
    s += luzPiso(ctx, 220, 360);
    s += lamparaColgante(ctx, 330, 300, '#2B2F2F') + lamparaColgante(ctx, 470, 300, '#2B2F2F');
    return s;
  };

  /* ---------- mapa aproximado ---------- */
  function mapa(comuna, punto, etiqueta) {
    const ctx = crearContexto('mapa-' + comuna, 'dia');
    const az = ctx.az;
    let s = '<rect width="800" height="600" fill="#EFEADF"/>';
    // manzanas
    let man = '';
    for (let i = 0; i < 70; i++) {
      const x = az() * 800;
      const y = az() * 600;
      man += '<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(30 + az() * 50) + '" height="' + r(22 + az() * 40) + '" rx="3" fill="#E4DDCF"/>';
    }
    s += man;
    const formas = {
      'puerto-varas': '<path d="M800 0 V600 H560 Q520 480 600 380 Q680 250 590 120 Q560 60 600 0Z" fill="#A9C6CF"/>',
      frutillar: '<path d="M800 0 V600 H600 Q560 450 640 300 Q690 200 620 0Z" fill="#A9C6CF"/>',
      'puerto-montt': '<path d="M0 600 H800 V420 Q600 470 420 430 Q220 390 0 470Z" fill="#A9C6CF"/>',
      valdivia: '<path d="M0 260 Q200 230 380 300 Q560 370 800 330 V410 Q560 450 380 380 Q200 310 0 340Z" fill="#A9C6CF"/>',
      temuco: '<path d="M0 520 Q300 480 500 530 Q650 570 800 540 V580 Q650 610 500 570 Q300 520 0 560Z" fill="#A9C6CF"/><ellipse cx="610" cy="170" rx="140" ry="90" fill="#C9D7B5"/>',
      concepcion: '<path d="M0 600 V420 Q120 400 220 470 Q300 520 380 600Z" fill="#A9C6CF"/><path d="M560 0 Q600 200 800 260 V0Z" fill="#C9D7B5"/>',
    };
    s += formas[comuna] || '';
    // calles
    let calles = '';
    for (let i = 0; i < 6; i++) {
      const y = 60 + i * 95 + az() * 20;
      calles += 'M-10 ' + r(y) + 'Q 400 ' + r(y + (az() - 0.5) * 60) + ' 810 ' + r(y + (az() - 0.5) * 40);
    }
    for (let i = 0; i < 7; i++) {
      const x = 40 + i * 120 + az() * 20;
      calles += 'M' + r(x) + ' -10 Q ' + r(x + (az() - 0.5) * 60) + ' 300 ' + r(x + (az() - 0.5) * 40) + ' 610';
    }
    s += '<path d="' + calles + '" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round"/>';
    s += '<path d="M-10 ' + r(200 + az() * 200) + ' Q 400 ' + r(250 + az() * 100) + ' 810 ' + r(220 + az() * 200) + '" stroke="#F3D9A8" stroke-width="14" fill="none"/>';
    s += '<circle cx="' + r(140 + az() * 200) + '" cy="' + r(380 + az() * 120) + '" r="46" fill="#C9D7B5"/>';
    // reapintar agua por encima de calles
    s += (formas[comuna] || '').replace(/#C9D7B5/g, 'transparent');
    // zona aproximada
    const px = r(punto[0] * 800);
    const py = r(punto[1] * 600);
    s += '<circle cx="' + px + '" cy="' + py + '" r="105" fill="#1F4A4A" opacity=".14"/>';
    s += '<circle cx="' + px + '" cy="' + py + '" r="105" fill="none" stroke="#1F4A4A" stroke-width="3" stroke-dasharray="10 8"/>';
    s += '<circle cx="' + px + '" cy="' + py + '" r="9" fill="#B8794B" stroke="#FFFFFF" stroke-width="3"/>';
    // rosa de los vientos
    s += '<g transform="translate(60 70)"><circle r="26" fill="#FAFAF7" stroke="#5B6461"/><path d="M0 -20L6 0L0 20L-6 0Z" fill="#1F4A4A"/><path d="M0 -20L6 0H-6Z" fill="#B8794B"/><text y="-30" text-anchor="middle" font-family="Manrope, sans-serif" font-size="14" font-weight="700" fill="#1F4A4A">N</text></g>';
    const aria = etiqueta ? 'role="img" aria-label="' + etiqueta.replace(/"/g, '&quot;') + '"' : 'aria-hidden="true" focusable="false"';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" ' + aria + '>' + s + '</svg>';
  }

  /* ---------- API pública ---------- */
  HS.escena = function (escena, clave, etiqueta, opcionesExtra) {
    const ctx = crearContexto(clave + ':' + escena.tipo, escena.hora || 'dia');
    const fn = ESCENAS[escena.tipo] || ESCENAS.entorno;
    const cuerpo = fn(ctx, escena);
    return envolver(ctx, cuerpo, etiqueta, opcionesExtra);
  };
  HS.mapaAproximado = mapa;
  HS._util = { mezclar, oscurecer, aclarar };
})();
