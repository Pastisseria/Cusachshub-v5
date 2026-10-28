(function () {
  var listo = false;
  var panel = document.getElementById('inicio-error');
  function mostrar(mensaje) {
    panel.hidden = false;
    document.getElementById('inicio-detalle').textContent = mensaje || 'No se completó la carga de la aplicación.';
  }
  var timer = setTimeout(function () {
    if (!listo) mostrar('La aplicación no ha terminado de arrancar. Comprueba la conexión y vuelve a intentarlo.');
  }, 25000);
  window.cusachsInicioListo = function () { listo = true; clearTimeout(timer); panel.hidden = true; };
  window.cusachsErrorInicio = function (mensaje) { clearTimeout(timer); mostrar(mensaje); };
  window.addEventListener('error', function (evento) {
    if (!listo && (evento.message || evento.target && evento.target.tagName === 'SCRIPT')) {
      clearTimeout(timer);
      mostrar(evento.message || 'No se ha podido descargar un archivo de la aplicación.');
    }
  }, true);
  window.addEventListener('unhandledrejection', function (evento) {
    if (!listo) { clearTimeout(timer); mostrar(evento.reason && evento.reason.message || 'Error al iniciar la aplicación.'); }
  });
  document.getElementById('inicio-reintentar').onclick = function () {
    var url = new URL(window.location.href);
    url.searchParams.set('inicio', Date.now().toString());
    window.location.replace(url.href);
  };
})();
