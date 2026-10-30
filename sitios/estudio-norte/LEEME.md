# Estudio Norte: web de la agencia (marca ficticia)

Web de presentación de **Estudio Norte**, una agencia **ficticia y provisional** de contenido, diseño y desarrollo web para pymes con base en Santiago. Sirve de portada al portafolio de demostración. No tiene clientes, premios, cifras ni testimonios reales, y los precios son de ejemplo.

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | Página única: aviso de marca ficticia, portada, estudio, servicios, proceso, portafolio, app de gestión, brief y pie. |
| `styles.css` | Estilos (móvil primero, tokens de color con contraste AA, `prefers-reduced-motion`, estilos de impresión del brief). |
| `app.js` | Script clásico con `defer` (no módulo, para que funcione también con `file://`): menú móvil, precios en CLP, aparición al hacer scroll y todo el formulario de brief. |
| `assets/fonts/` | Bricolage Grotesque variable (pesos 200–800, ancho 75–100 %, subconjunto `latin`, `.woff2`). |
| `assets/img/favicon.svg` | Favicon original (brújula). |

Todas las ilustraciones (la brújula de la portada, las cinco minicomposiciones del portafolio y los íconos) son **SVG originales escritos en línea** en `index.html`. La maqueta de la app (tablero, calendario y tarjeta de aprobación) es HTML y CSS decorativo con `aria-hidden`.

## Secciones

1. **Aviso** fijo arriba: «Marca ficticia · Estudio Norte es una agencia de demostración…», que se repite en la portada, en una tarjeta de la sección Estudio y en el pie.
2. **Portada**: titular, coordenadas de Santiago y una brújula SVG cuya aguja se anima al cargar (sin animación si se pide movimiento reducido).
3. **Estudio**: qué hace la agencia y para quién (gastronomía, servicios con hora agendada, catálogos y comercio local).
4. **Servicios**: contenido, diseño y desarrollo web, con lo que incluye cada uno y valores «desde» en CLP. El rótulo «Precios de ejemplo» los identifica como tales. Los montos se escriben con `Intl.NumberFormat('es-CL', { currency: 'CLP' })`.
5. **Proceso**: diagnóstico, propuesta, producción, revisión y aprobación, publicación y entrega, medición. Cada paso indica qué recibe el cliente.
6. **Portafolio**: cinco tarjetas marcadas como «Demostración · negocio ficticio», con lo que se resolvió en cada caso:
   - `../brasa-sur/index.html`: restaurante (carta, reservas, horarios).
   - `../distrito-barber/index.html`: barbería (servicios, agenda de horas).
   - `../habita-sur/index.html`: inmobiliaria (catálogo con filtros, favoritos, ficha).
   - `../pulso/index.html`: gimnasio (horario de clases, planes, reserva de clase).
   - `./index.html`: este mismo sitio, como muestra de agencia.
7. **App de gestión**: enlace destacado a `../../app/index.html` y descripción de sus módulos (clientes, calendario editorial, tablero de producción, revisión y aprobación con vista de cliente de demostración, biblioteca y exportación). La app la construye otra persona; aquí solo se enlaza.
8. **Brief por pasos** (ver abajo).
9. **Pie**: datos de contacto de ejemplo (`.example`), créditos tipográficos y el enlace «Ver portafolio de Estudio Norte» a `../../index.html`.

## Formulario de brief

- Tiene cinco pasos: **Negocio** (nombre, rubro y un campo «Otro» que aparece solo si se elige esa opción, comuna con lista de las 52 comunas de la RM o cualquier otra), **Objetivos y servicios** (casillas), **Público y tono**, **Referencias, plazo y presupuesto** (fecha `dd-mm-aaaa` con máscara y la fecha escrita en palabras, rango en CLP), y **Contacto** (nombre, correo y teléfono chileno opcional).
- **Validación**: mensajes en español junto a cada campo (`aria-invalid` y `aria-describedby`), un resumen de errores con enlaces y el foco en el primer error. Se rechazan:
  - campos obligatorios vacíos;
  - textos demasiado cortos;
  - comunas con números;
  - correos mal formados;
  - teléfonos que no sean chilenos de 9 dígitos;
  - fechas inexistentes, fechas pasadas (se comparan con `new Date()`) y fechas a más de tres años.

  Antes de generar el brief se validan otra vez todos los pasos.
- **Borrador automático** en `localStorage` con la clave `estudio-norte:brief-borrador` (siempre dentro de `try/catch`). Guarda las respuestas, el paso actual y si el brief estaba terminado. Al recargar se recupera y se avisa cuándo se guardó. Si el almacenamiento está bloqueado, el formulario sigue funcionando y lo avisa.
- **Borrar borrador**: abre un `<dialog>` modal de confirmación (se cierra con Esc y devuelve el foco). Si se confirma, se vacían el almacenamiento y el formulario.
- **Resultado**: una confirmación local («se guardó solo en este navegador y no se envió a nadie»), la vista previa formateada y tres acciones:
  - **Descargar brief (.md)** y **Descargar como .txt**, generados con `Blob`. El nombre es `brief-<negocio>-AAAA-MM-DD.ext`.
  - **Copiar brief**: usa la Clipboard API. Si falla, prueba `execCommand('copy')`. Si eso también falla, muestra el texto seleccionado en un área para copiarlo a mano. En todos los casos aparece un mensaje de éxito o de error.
- **Nada se envía a ningún servidor.**

## Recorridos para probar

1. Abre `http://localhost:4317/sitios/estudio-norte/` (o el `index.html` directamente). En móvil, abre el menú y ciérralo con Esc.
2. Ve a «Preparar un brief» y pulsa «Siguiente» sin llenar nada: aparecen el resumen de errores y el foco en el primer campo.
3. Completa los pasos. En el paso 4 prueba `01-01-2020` (fecha pasada) y `31-02-2027` (fecha inexistente).
4. A mitad del formulario, recarga la página: el borrador vuelve al mismo paso.
5. Termina el brief, descárgalo en .md y .txt y cópialo.
6. Usa «Borrar borrador»: primero cancela, después confirma.

## Decisiones

- Paleta: tinta `#12162B`, papel `#F3F0EA`, naranja «norte» `#FF6B2C` y verde aurora `#3DDC97`. Esos dos acentos se usan como fondo o forma, o como texto sobre tinta (6,3:1 y 10:1). Para texto sobre papel hay variantes oscuras: naranja `#A83C0B` (5,6:1) y verde `#0F6B45` (5,8:1). El gris sugerido `#6B6F80` da solo 4,4:1 sobre papel, así que el texto secundario usa `#5C6072` (5,5:1). Sobre tinta se usa `#A3A9BD`.
- Los titulares usan Bricolage Grotesque condensada (ancho 78 %) y las cifras (precios, horas) van con números tabulares.
- No hay `<script type="module">` ni `<link rel="preload">` de fuentes. Con `file://` Chromium bloquea ambos por CORS (origen `null`), y así el sitio funciona igual abriéndolo como archivo.
- Las fechas del brief se escriben como «martes 8 de diciembre de 2026 (08-12-2026)». El nombre del archivo descargado usa el formato ISO para que se ordene bien.

## Recursos y licencias

- **Bricolage Grotesque** (Mathieu Triay), copiada de `@fontsource-variable/bricolage-grotesque`, con licencia SIL Open Font License 1.1.
- Ilustraciones, íconos y favicon: SVG originales creados para este sitio. No hay imágenes remotas, CDN ni analítica.

## Alex, asistente de admisión

`alex.js` y `alex.css` agregan un botón flotante «Habla con Alex». Es una adaptación del Alex de Nexo 3.7: una pregunta por turno (rubro, frente prioritario, negocio en marcha, responsable, plazo y presupuesto), precios de ejemplo en CLP sin perder la pregunta pendiente, y como siguiente paso el brief de esta web. Funciona con reglas en el navegador: no usa IA externa, no envía mensajes, no agenda y la conversación se borra al recargar. Pruebas: `tests/unit/alex.test.mjs`.
