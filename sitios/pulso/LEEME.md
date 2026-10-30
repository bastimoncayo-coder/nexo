# Pulso — gimnasio de barrio (ficticio)

Sitio de demostración de **Estudio Norte**. Pulso es un negocio **inventado**: dirección (Calle Tilo Morado 2471, Ñuñoa), teléfono, correo (`hola@pulso.example`), entrenadores, precios y horarios son de ejemplo. Los formularios no envían nada: todo queda en el navegador de quien lo prueba.

Abrir: `http://localhost:4317/sitios/pulso/` o directamente `index.html` (también funciona con `file://`; JS como script clásico, sin módulos, para evitar bloqueos CORS).

## Contenido

| Archivo | Qué es |
|---|---|
| `index.html` | Página única: aviso de negocio ficticio, portada, planes + tabla comparativa, disciplinas, equipo, horarios, clase de prueba, «Tus solicitudes», preguntas frecuentes, ubicación y pie. |
| `styles.css` | Estilos (tokens en `:root`, móvil primero, `prefers-reduced-motion`). |
| `app.js` | Menú móvil, conmutador de precios, horarios filtrables, formulario con validación, lista de solicitudes, estado «abierto ahora». |
| `assets/fonts/` | Archivo Black 400 y Archivo 400/500/600/700/800 (subconjunto latin, `.woff2`). |
| `assets/img/` | Retratos SVG de los cuatro entrenadores y favicon. La ilustración de portada, los íconos de disciplinas y el mapa están en línea en el HTML. |

## Recorridos para probar

1. **Precios**: en «Planes», cambia entre Mensual, Semestral (−10 %) y Anual (−20 %). Las tarjetas y la fila «Valor mensual» de la tabla se recalculan; en semestral/anual aparece el pago total y el ahorro. La elección se recuerda (`pulso:periodo`).
2. **Tabla comparativa**: a 390 px se convierte en una tarjeta por característica con el nombre de cada plan delante del valor (roles ARIA explícitos para conservar la semántica de tabla).
3. **Horarios**: filtra por día y por actividad (botones de radio dentro de `fieldset`). La selección se escribe en la URL (`?dia=lun&actividad=yoga`) y en `localStorage` (`pulso:filtros`). Lunes + Yoga muestra el estado vacío con los días en que sí hay Yoga y atajos para ampliar el filtro. En escritorio (≥1180 px) la semana se ve en grilla de 7 columnas; en móvil, como lista por día. El día actual se marca con «Hoy».
4. **Desde una disciplina o una clase**: «Ver horarios de …» aplica el filtro y lleva a la agenda; «Pedir prueba» en una clase precarga disciplina, la próxima fecha en que ocurre y el horario.
5. **Clase de prueba**: intenta enviar vacío (errores junto a cada campo, `aria-invalid`, resumen con enlaces y foco al primer error). Prueba un correo sin dominio, un teléfono de 8 dígitos, una fecha pasada o a más de 30 días. Elige Yoga y un lunes: el selector de horario dice que no hay clases y ofrece próximas fechas con Yoga. Solo se ofrecen clases que existen ese día para esa disciplina y, si la fecha es hoy, que aún no empiezan. Se rechaza una solicitud duplicada (misma clase y fecha).
6. **Confirmación y «Tus solicitudes»**: al guardar aparece una confirmación que dice que la solicitud quedó solo en este navegador y **no se envió a nadie**. La solicitud se lista abajo (`pulso:solicitudes`), sigue ahí al recargar y se puede **anular** (queda marcada como anulada) y luego quitar del historial.
7. **Menú móvil**: botón «Menú» con `aria-expanded`; Esc lo cierra y devuelve el foco.

Formatos chilenos: precios con `Intl.NumberFormat('es-CL', CLP)`, fechas en texto con `toLocaleDateString('es-CL')`, horas en 24 h, teléfono normalizado a `+56 9 1234 5678` (acepta celulares y fijos de 9 dígitos, con o sin `+56`).

## Decisiones

- **Paleta**: tinta `#0E0F12`, blanco, hueso `#F4F4EF`, lima `#C6F432` (solo sobre fondo oscuro o con texto tinta encima) y coral `#FF5A36` como secundario (solo sobre oscuro o como relleno). Para texto sobre claro se usan variantes oscurecidas: coral `#B83312` (5,9:1) y lima `#4D6B00` (6,1:1). Los colores por disciplina en la agenda son franjas decorativas; el nombre siempre va en texto.
- **Composición**: secciones con bordes diagonales (`clip-path`), franja inclinada con las disciplinas, números grandes y bloques que alternan oscuro, claro y lima.
- **Movimiento**: animaciones con número fijo de repeticiones (onda de pulso, estelas, punto «en vivo», onda del mapa), para no tener movimiento infinito. Con `prefers-reduced-motion: reduce` se anulan animaciones y transiciones y el desplazamiento suave.
- **Datos**: la agenda (35 clases) y los planes viven en `app.js`; la cifra «35 clases» de la portada se calcula desde los datos. Horario del local: L–V 06:30–22:30, sábado 08:00–20:00, domingo 09:00–14:00; todas las clases terminan dentro de ese horario.
- **Almacenamiento**: todas las lecturas y escrituras de `localStorage` van en `try/catch` con prefijo `pulso:`. Si está bloqueado, el sitio funciona igual y avisa que las solicitudes no se conservarán al recargar.
- **Entrenadores**: perfiles ficticios con especialidad y disciplinas; sin títulos, certificaciones ni logros.
- **Fecha**: se usa el `input type="date"` nativo (en navegadores en español se muestra `dd-mm-aaaa`), con `min`/`max` calculados en tiempo de ejecución con `new Date()`, y además se valida en JS.

## Recursos y licencias

- **Archivo** y **Archivo Black** (Omnibus-Type), vía `@fontsource/archivo` y `@fontsource/archivo-black`: SIL Open Font License 1.1.
- **Ilustraciones** (atleta de portada, retratos, íconos, mapa ilustrativo, favicon): SVG originales hechos para este sitio por Estudio Norte. Sin imágenes remotas ni recursos externos en tiempo de ejecución.
