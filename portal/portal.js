// Oculta las miniaturas que no existan (se ve el respaldo de color) y comprueba si el servidor local responde.
document.querySelectorAll('img[data-miniatura]').forEach((img) => {
  const ocultar = () => { img.hidden = true; };
  if (img.complete && !img.naturalWidth) ocultar();
  img.addEventListener('error', ocultar);
});

(function revisarServidor() {
  const salida = document.getElementById('estado-servidor');
  if (!salida) return;
  if (location.protocol === 'file:') {
    salida.textContent = 'Abriste el archivo directamente. Las webs funcionan así, pero la app necesita el servidor: ejecuta npm start y entra a http://localhost:4317/.';
    return;
  }
  fetch('/api/salud', { cache: 'no-store' })
    .then((r) => { salida.textContent = r.ok ? '● Servidor local activo.' : 'El servidor respondió con un error.'; })
    .catch(() => { salida.textContent = 'No se detecta el servidor local. Ejecuta npm start en la carpeta del proyecto.'; });
})();
