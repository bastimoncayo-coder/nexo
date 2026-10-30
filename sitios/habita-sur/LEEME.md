# Habita Sur — sitio de demostración

Corredora de propiedades **ficticia** del sur de Chile (oficina inventada en Puerto Varas). Sitio de demostración creado por Estudio Norte para su portafolio. Todas las propiedades, precios, sectores, direcciones, teléfonos y correos son inventados; las comunas son reales.

## Qué contiene

| Archivo | Contenido |
| --- | --- |
| `index.html` | Portada: buscador rápido (operación, tipo, comuna), 3 destacadas, las 6 comunas con su conteo, «Cómo trabajamos», sección para propietarios, oficina con esquema ilustrado y formulario de contacto. |
| `propiedades.html` | Catálogo de 15 propiedades con filtros combinables, orden, chips de filtros activos, contador, estado vacío y vista «Mis favoritos». |
| `propiedad.html?id=hs-101` | Ficha: galería navegable con teclado y visor ampliado, datos clave, descripción, características, ficha técnica, ubicación aproximada ilustrada, formulario de consulta y propiedades similares. Un id inexistente muestra un mensaje y enlace al catálogo. |
| `consultas.html` | «Mis consultas»: lista de consultas guardadas en este navegador, con eliminar una o todas (con confirmación). |
| `styles.css` | Estilos (móvil primero, tokens de color en `:root`). |
| `js/escenas.js` | Generador de «fotografías» ilustradas en SVG a partir de parámetros. |
| `js/datos.js` | Las 15 propiedades ficticias y las 6 comunas. |
| `js/comun.js` | Formato CLP/UF, almacenamiento, favoritos, consultas, tarjetas, menú móvil y validación de formularios. |
| `js/inicio.js`, `js/catalogo.js`, `js/ficha.js`, `js/consultas.js` | Lógica de cada página. |
| `assets/fonts/` | Manrope 400/500/600/700 y DM Serif Display 400 normal/cursiva (subconjunto latin, woff2). |
| `assets/img/favicon.svg` | Ícono del sitio. |

Funciona servido (`http://localhost:4317/sitios/habita-sur/`) y abriendo `index.html` directamente (file://): solo scripts clásicos y rutas relativas, nada externo en tiempo de ejecución.

## Recorridos para probar

1. **Filtros:** en `propiedades.html` elige *Venta* + *Casa* + *Puerto Varas* y máximo `400000000`. La URL queda como `?operacion=venta&tipo=casa&comuna=puerto-varas&max=400000000`; recarga o comparte el enlace y se restaura. Cambia el orden (precio o superficie). Prueba *Parcela o terreno* + *Arriendo* para ver el estado vacío y su botón «Limpiar filtros». Los chips permiten quitar filtros uno a uno.
2. **Favoritos:** toca el corazón de varias tarjetas (botón con `aria-pressed`), mira el contador de la cabecera, recarga y siguen ahí. «Favoritos» en la cabecera lleva a `propiedades.html?favoritos=1`. Desmarca desde la ficha o desde la vista de favoritos hasta ver el estado vacío.
3. **Ficha y galería:** abre una ficha, pon el foco en la foto y usa ← → / Inicio / Fin; «Ampliar» abre un visor modal (Esc cierra y devuelve el foco). Prueba `propiedad.html?id=hs-999`.
4. **Formulario:** envíalo vacío (resumen de errores, mensajes por campo, foco en el primero); luego correo sin dominio, teléfono `12345`, motivo «Coordinar una visita» con fecha pasada. Con datos válidos aparece una confirmación local que dice que **no se envió a ningún corredor**. Revisa `consultas.html`.

## Decisiones

- **Aviso de ficción** en una franja fija dentro de la cabecera de todas las páginas, una etiqueta «Ejemplo ficticio» en cada foto de tarjeta, un recuadro en cada ficha y en el pie.
- **Precios:** CLP con `Intl.NumberFormat('es-CL')`; arriendos como valor mensual. En ventas se muestra la UF como dato secundario y **referencial**, calculada con una UF fija de $40.000 definida para la demo (no es el valor del día), y así se indica junto a los precios.
- **Filtro de precio** único para ventas y arriendos (los arriendos se comparan por su valor mensual, como se explica bajo el campo). Si el mínimo supera al máximo se avisa junto a los campos. Orden por superficie: m² construidos o, si no hay, m² de terreno.
- **URL:** los filtros se escriben con `history.replaceState` (no llenan el historial); parámetros desconocidos o inválidos se ignoran.
- **Teléfono chileno:** se aceptan 9 dígitos con o sin `+56`, espacios o guiones; móviles (9…) y fijos (2… o código regional) y se guardan normalizados (`+56 9 8765 4321`).
- **Fecha de visita** solo aparece con el motivo «Coordinar una visita», es opcional y no puede ser anterior a hoy (`new Date()`).
- **Ubicación aproximada:** esquema ilustrado por comuna (agua, calles, áreas verdes) con un círculo de zona aproximada y una lista de las seis comunas de norte a sur; sin mapas externos ni direcciones reales. No se enlazan teléfonos (`tel:`) porque los números son inventados y podrían existir.
- **Almacenamiento:** claves `habita-sur:favoritos` y `habita-sur:consultas`, siempre dentro de `try/catch`. Si `localStorage` está bloqueado el sitio sigue funcionando en memoria y avisa que no se conservará al recargar. Los favoritos se sincronizan entre pestañas (`storage`).
- **Imágenes:** cada propiedad tiene de 3 a 5 vistas (fachada/edificio, living, cocina, dormitorio, terreno, acceso, entorno) generadas por `escenas.js` según parámetros: estilo (tejuela tradicional o moderna), pisos, colores de revestimiento y techo, hora (día, tarde, nublado), agua, volcán o cerros. El azar es determinista (sembrado por id), así que cada ficha se ve siempre igual. Llevan un grano sutil y viñeta para darles aspecto fotográfico.
- **Contraste AA** verificado para los pares de color usados en texto; el cobre `#B8794B` se usa solo en elementos decorativos e íconos (3,57:1) y para texto se usa `#8C5631` (5,75:1).

## Recursos y licencias

- **Manrope** y **DM Serif Display**: SIL Open Font License 1.1, copiadas desde `@fontsource/manrope` y `@fontsource/dm-serif-display`.
- **Ilustraciones, íconos, logotipo y esquemas de ubicación**: SVG originales creados para este sitio (generados por código en `js/escenas.js` y en línea en el HTML). Sin imágenes de terceros ni servicios de generación de imágenes.
