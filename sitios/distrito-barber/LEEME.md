# Distrito Barber: sitio de demostración

**Negocio ficticio · Sitio de demostración creado por Estudio Norte.** Distrito Barber no existe. La dirección (Pasaje Los Faroles 318, Barrio Lastarria, Santiago), el teléfono, el correo (`.example`), el equipo y los precios son inventados. Las reservas se guardan solo en el `localStorage` del navegador y no se envían a nadie.

## Qué contiene

| Archivo | Contenido |
|---|---|
| `index.html` | Página única: aviso de demo, portada, servicios, oficio, equipo, galería, reserva, «Mis reservas», ubicación y pie |
| `styles.css` | Estilos, del móvil hacia arriba. Tokens de color y tipografía en `:root` |
| `app.js` | Script clásico, sin módulos, para que funcione también con `file://`: agenda, reserva por pasos, «Mis reservas», menú móvil, lightbox y revelado al hacer scroll |
| `assets/fonts/` | Anton 400 y Space Grotesk 400/500/700 (solo el subconjunto `latin`, en `.woff2`) más sus licencias OFL |
| `assets/img/` | Ilustraciones SVG originales: `navaja`, `tijeras` y `maquina`; `equipo-*` (4 retratos gráficos); `corte-01…06` (perfiles de cortes); `favicon` |

El poste de barbero de la portada y el plano esquemático van en línea dentro del HTML para que usen las tipografías de la página.

## Secciones

1. **Portada**: titular tipográfico («Fade. Navaja. Barrio.»), un poste de barbero animado, un sello que gira, un botón «Reservar hora» y una franja con horario y dirección.
2. **Servicios**: siete servicios con duración en minutos y precio de ejemplo en CLP. Cada uno tiene un botón «Reservar» que preselecciona el servicio y salta al paso 2.
3. **El oficio**: navaja, tijeras y máquina.
4. **Equipo**: Mauro, Javi, Nico y Tito, con especialidad y días de trabajo (en texto para lector de pantalla y en fichas L–D). No hay reseñas.
5. **Galería**: seis cortes ilustrados en un lightbox accesible con `<dialog>`. Se navega con ←/→, se cierra con Esc o con clic en el fondo, y el foco vuelve a la miniatura.
6. **Reserva**: flujo de 5 pasos más una confirmación, con un ticket lateral que se actualiza en vivo.
7. **Mis reservas en este navegador**: lista con «Anular». Pide confirmación en un `<dialog>` y muestra un estado vacío cuando no hay reservas.
8. **Visítanos**: plano esquemático en SVG (sin mapas incrustados), datos de contacto ficticios y horario.

## Reglas de la agenda

- La barbería atiende de lunes a sábado de 10:00 a 20:00 y cierra el domingo. Los bloques son de 30 minutos.
- Días de trabajo: Mauro de lunes a viernes; Javi de martes a sábado; Nico lunes, miércoles, viernes y sábado; Tito lunes, martes, jueves y sábado.
- Restricciones por servicio: el afeitado con toalla caliente lo hacen solo Mauro o Tito; el corte con diseño, solo Javi o Nico.
- **Fecha**: se muestran los próximos 21 días (hoy y 20 más). Los domingos, los días en que el profesional elegido no trabaja, los días completos y el día de hoy cuando ya no quedan bloques aparecen deshabilitados, con el motivo en texto.
- **Horario**: solo se ofrecen inicios cuyo servicio termina a más tardar a las 20:00. Hoy, solo los que parten al menos 30 minutos después de la hora actual. Hay tres estados:
  - *Libre*.
  - *Ocupado*: el bloque ya tiene una reserva de ejemplo o una hecha en este navegador («Tu reserva DB-XXXX»).
  - *No alcanza*: el inicio está libre, pero la duración choca con la reserva siguiente. El texto para lector de pantalla dice con qué hora choca.
- **Ocupados de ejemplo**: se generan de forma determinista con un PRNG sembrado con `fecha + profesional`, y salen entre 3 y 5 por profesional y día. La misma fecha siempre muestra los mismos bloques.
- **Sin preferencia**: se asigna el profesional habilitado que esté libre en ese bloque y tenga menos minutos ocupados ese día. El ticket muestra a quién se asignó.
- **Revalidación al confirmar**: antes de guardar se relee `localStorage`. Si el bloque se ocupó entretanto (por ejemplo, desde otra pestaña) o la hora ya pasó, el flujo vuelve al paso 4 con un aviso (`role="alert"`) y conserva los datos escritos. Con «sin preferencia» se reasigna a otro profesional libre si lo hay. Además, el evento `storage` refresca la agenda y la lista si cambian en otra pestaña.
- **Almacenamiento**: la clave es `distrito-barber:reservas` y todo acceso va dentro de `try/catch`. Si el navegador bloquea el almacenamiento, aparece un aviso y la reserva funciona solo en memoria.

## Validación (paso 5)

- **Nombre**: obligatorio, con al menos 3 letras. Acepta letras, espacios, apóstrofo y guion.
- **Celular chileno**: obligatorio. Acepta `+56 9 1234 5678`, `56912345678` o `912345678` (con espacios, guiones o paréntesis). Rechaza teléfonos fijos, largos incorrectos, letras y números repetidos como `9 9999 9999`. Se guarda normalizado como `+56 9 XXXX XXXX`.
- **Correo**: opcional. Si se escribe, debe tener un formato válido.
- Cada campo muestra su mensaje en español junto a él, con `aria-invalid` y `aria-describedby`. Arriba aparece un resumen de errores con enlaces a cada campo y el foco pasa al primer error.

## Recorridos para probar

1. Pulsa «Siguiente» en el paso 1 sin elegir nada: aparece un error y el foco va a la primera opción.
2. Elige Corte clásico, Javi y un día cualquiera. El lunes aparece como «Javi no atiende» y el domingo como «Cerrado». Elige un horario libre, deja los datos vacíos y pulsa «Confirmar»: aparecen los errores. Completa con `Camila Pérez` y `+56 9 8765 4321` y confirma: obtienes un código `DB-XXXX`.
3. Recarga la página. La reserva aparece en «Mis reservas», y si repites el recorrido con el mismo barbero y día, ese bloque sale como «Tu reserva» y no se puede elegir.
4. Elige Corte + barba (60 min) con el mismo barbero y día: el bloque anterior al ocupado aparece como «No alcanza».
5. Para ver la revalidación, llega al paso 5 en una pestaña, reserva el mismo bloque en otra y vuelve a confirmar en la primera: el flujo regresa al paso 4 con el aviso.
6. En «Mis reservas», pulsa «Anular». Esc o «Mantener reserva» la conservan; «Sí, anular» la borra y libera el bloque.
7. Prueba la navegación por teclado:
   - Tab: lo primero es «Saltar al contenido».
   - Flechas: cambian de opción en los grupos de radio.
   - Enter: avanza de paso.
   - Los pasos ya completados del indicador son botones para volver a ellos.
   - Esc cierra el menú móvil, el lightbox y el diálogo.

## Decisiones

- **Color**: amarillo señal (`#F5C518`) como acento principal, siempre sobre negro o como fondo con texto negro (contraste de unos 11,6:1). El rojo del poste (`#D7263D`) es solo decorativo: rayas, fondos de ilustración y el punto del encabezado. Los errores usan `#A3182B` sobre fondo claro (unos 6,7:1).
- **Composición**: tipografía como imagen (Anton enorme), bandas, numeración grande en contorno, retícula de fondo, franjas de poste y sellos.
- **Opciones del flujo**: son radios nativos dentro de `fieldset`, con estilo de ficha. Eso da navegación con flechas y anuncio correcto del estado deshabilitado. Cada ficha incluye un texto solo para lector de pantalla con el motivo («ocupado…», «no alcanza…»).
- **Script clásico** en lugar de módulo ES, para que `index.html` funcione abierto con `file://`.
- **Movimiento reducido**: con `prefers-reduced-motion: reduce` se detienen el poste, el sello, la cinta y el revelado.

## Recursos y licencias

- **Anton**: © The Anton Project Authors. SIL Open Font License 1.1 (`assets/fonts/LICENCIA-Anton-OFL.txt`). Copiada de `@fontsource/anton`.
- **Space Grotesk**: © The Space Grotesk Project Authors. SIL Open Font License 1.1 (`assets/fonts/LICENCIA-SpaceGrotesk-OFL.txt`). Copiada de `@fontsource/space-grotesk`.
- **Ilustraciones SVG**: originales, hechas para esta demostración (herramientas, retratos estilizados, cortes de perfil, poste, sello y plano). No usan imágenes externas ni servicios de generación.
- No hay recursos externos en tiempo de ejecución: ni CDN, ni fuentes remotas, ni mapas, ni analítica.
