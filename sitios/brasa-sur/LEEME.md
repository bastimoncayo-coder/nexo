# Brasa Sur — restaurante (ficticio)

Sitio de demostración de **Estudio Norte**. Brasa Sur es un negocio ficticio: cocina a las brasas con leña de luma y ulmo, carnes de campo, pescados de la costa de Los Ríos y verduras de huerta, en una dirección inventada de Barrio Italia (Providencia). No hay premios, prensa, testimonios ni cifras comerciales.

Abrir en `http://localhost:4317/sitios/brasa-sur/` o directamente `index.html` (file://). No usa nada externo en tiempo de ejecución.

## Qué contiene

| Archivo | Uso |
| --- | --- |
| `index.html` | Página única: portada, la cocina, carta, historia, galería, reservas y pie. |
| `styles.css` | Estilos (móvil primero, tokens de color, `@font-face`, movimiento reducido). |
| `app.js` | Script clásico (`defer`, sin módulos ni dependencias): precios CLP, menú móvil, pestañas, visor, formulario y lista de solicitudes. |
| `assets/img/*.svg` | 9 ilustraciones originales + favicon. |
| `assets/fonts/` | Fraunces y Karla (`.woff2`, subconjunto latin) y sus licencias OFL. |

Secciones:

- **Portada**: titular editorial en Fraunces, ilustración cenital en marco de arco (boca de horno), sello giratorio, botón «Solicitar una mesa» que lleva a `#reservar` y el horario de hoy calculado con `new Date()`.
- **La cocina**: manifiesto y cuatro pilares (leña, campo, costa, huerta).
- **Carta**: 6 categorías en pestañas ARIA (flechas, Inicio y Fin), 30 platos y bebidas con descripción y **precios de ejemplo** formateados con `Intl.NumberFormat('es-CL', CLP)`. Marcas V (vegetariano) y SG (sin gluten) con leyenda. Sin JS se ven todas las categorías una tras otra.
- **Historia**: relato ficticio (marcado como tal), cita de la cocinera ficticia y una línea de tiempo.
- **Galería**: 7 láminas en retícula asimétrica. El visor usa `<dialog>` modal: el foco va a «Cerrar», se mueve con ← y →, se cierra con Esc o con clic fuera, Tab queda dentro y el foco vuelve a la lámina.
- **Reservas**: formulario de solicitud, confirmación local y «Tus solicitudes en este navegador».
- **Pie**: dirección, horario y contacto de ejemplo, aviso de negocio ficticio y enlace «Ver portafolio de Estudio Norte» (`../../index.html`).

El aviso «Negocio ficticio · Sitio de demostración creado por Estudio Norte» aparece en una franja ámbar arriba, en el pie y otra vez junto al formulario.

## Reglas del formulario

- **Nombre**: obligatorio, al menos 2 letras; acepta tildes, ñ, apóstrofo y guion.
- **Teléfono chileno**: 9 dígitos, con o sin `+56`, espacios o guiones. Celular (empieza con 9) o fijo (2 a 7). Se guarda normalizado como `+56 9 1234 5678`.
- **Correo**: debe tener la forma `nombre@dominio.tld`.
- **Fecha**: no puede ser pasada, no puede ser lunes (cerrado) y como máximo 60 días desde hoy. Se muestra en texto, por ejemplo «Elegiste el sábado 7 de noviembre».
- **Turno según el día**:
  - Martes a sábado: almuerzo 13:00–15:00 y cena 19:30–22:00, en tramos de 30 minutos (la última mesa entra una hora antes del cierre).
  - Domingo: solo almuerzo, de 13:00 a 16:00.
  - Para hoy se ocultan las horas con menos de 60 minutos de anticipación.
- **Personas**: de 1 a 10, con botones − y +. Con más de 10 aparece un recuadro para grupos y la solicitud se rechaza.
- **Comentarios**: opcional, hasta 300 caracteres, con contador.
- **Errores**: mensaje junto a cada campo (`aria-invalid` y `aria-describedby`), resumen con enlaces y foco en el primer error.
- **Envío correcto**: estado «Guardando…» de 0,6 s y luego una confirmación con código `BS-XXXXX` y resumen. La confirmación dice que la solicitud **no se envió a nadie** y quedó solo en este navegador.
- **Almacenamiento**: `localStorage` con la clave `brasa-sur:solicitudes`, siempre dentro de `try/catch`. Si está bloqueado, el sitio funciona en memoria y muestra un aviso.
- **Anular**: pide confirmación en línea («Sí, anular» o «No, mantener»; Esc cancela). Hay estado vacío y un mensaje `role="status"` tras anular.

## Recorridos para probar

1. Envía el formulario vacío: aparecen el resumen de errores y el foco en «Nombre».
2. Prueba con un teléfono `12345`, un correo `ana@correo`, una fecha pasada, un lunes o 12 personas: cada caso muestra su mensaje.
3. Elige un domingo: «Cena» se deshabilita y las horas van de 13:00 a 16:00.
4. Completa datos válidos y guarda: aparece la confirmación con su código. Recarga la página: la solicitud sigue en «Tus solicitudes en este navegador».
5. Anula la solicitud: primero «No, mantener», luego «Sí, anular». Al no quedar ninguna, vuelve el estado vacío.
6. En la galería, abre una lámina y recórrela con ← y →; ciérrala con Esc.
7. A 390 px, abre «Menú» y ciérralo con Esc.

## Decisiones

- **Composición de revista**: titulares grandes en Fraunces (normal e itálica 300), números de sección en itálica, «láminas» numeradas, arcos que evocan un horno de barro y una retícula de 12 columnas con bloques desplazados.
- **Paleta**:

  | Color | Valor |
  | --- | --- |
  | Carbón | `#1C1512` |
  | Brasa | `#B4441E` (una versión más oscura, `#983816`, para texto pequeño) |
  | Ámbar | `#E39B3B` |
  | Crema | `#F4EADB` |
  | Oliva | `#5E6B3A` |

- **Contraste AA verificado** para los pares usados en texto:

  | Par | Contraste |
  | --- | --- |
  | Texto principal sobre crema | 15,1:1 |
  | Texto secundario `#54453B` sobre crema | 7,7:1 |
  | Brasa oscura sobre crema | 6,1:1 |
  | Brasa (titulares) sobre crema | 4,7:1 |
  | Blanco sobre botón brasa | 5,6:1 |
  | Ámbar sobre carbón | 7,7:1 |
  | Oliva sobre papel | 5,4:1 |
  | Error sobre papel | 6,9:1 |

- **Fecha**: se usa `input type="date"`; en Edge con configuración regional chilena se muestra como dd-mm-aaaa. En los textos la fecha aparece larga y en dd-mm-aaaa.
- **Sin `preload` de fuentes**: con file:// las solicitudes `crossorigin` se bloquean y ensucian la consola; `@font-face` sí carga en ambos casos.
- **Teléfonos**: no se enlazan con `tel:`, porque son ficticios.

## Recursos y licencias

- **Tipografías**: [Fraunces](https://github.com/undercasetype/Fraunces) (300 itálica, 400, 400 itálica, 600, 600 itálica) y Karla (400, 400 itálica, 500, 700), copiadas desde `@fontsource`. Licencia SIL Open Font License 1.1 (textos incluidos en `assets/fonts/`).
- **Ilustraciones**: SVG originales hechos para este sitio, con capas, degradados, sombras con `feGaussianBlur`, grano con `feTurbulence` y elementos de procedimiento (vetas, brasas, anillos). Se generaron una vez con un script propio que no forma parte del sitio; los archivos resultantes son estáticos. No se usaron imágenes de terceros ni servicios de generación de imágenes.
  - Tabla de asado (portada)
  - Pila de leña (historia)
  - Fogón
  - Reineta
  - Zapallo camote
  - Pan amasado y pebre
  - Choritos en paila
  - Bandeja de huerta
  - Leche asada con murtas
