# Acceso sin conexión

La web necesita una visita con Internet y terminar la instalación del service worker. El build genera un precache de todo dist; si falta un archivo no se activa esa versión. La actualización se activa al cerrar las pestañas anteriores. Se conservan caches anteriores para pestañas abiertas.

Android incorpora dist mediante Capacitor, sin depender del service worker. Es necesario instalar el nuevo APK.

Es necesario iniciar sesión y cargar el perfil con Internet al menos una vez en cada dispositivo. Se reutiliza la sesión almacenada por el SDK y el perfil de esa misma cuenta; nunca se concede un rol por defecto. La autorización del servidor sigue dependiendo de Supabase/RLS. Las instantáneas locales no acreditan permisos actuales del servidor.

Las consultas REST GET satisfactorias guardan instantáneas locales por proyecto, usuario, URL y cabeceras de consulta (sin tokens). Solo se muestran consultas ya disponibles. El almacenamiento puede fallar por cuota o configuración; no se garantiza disponibilidad de todos los módulos. Los borradores existentes se conservan. Las escrituras sin conexión fallan explícitamente; no existe cola ni sincronización completa. Al volver la conexión se revalida la sesión/perfil; recarga la vista para actualizar sus datos. No se modifican tablas ni datos remotos.

Verificación manual pendiente: dispositivo Android real, iniciar con red, abrir las pantallas necesarias, activar modo avión, cerrar y abrir, comprobar datos guardados, ausencia de datos y cambio de cuenta. Web: esperar instalación, cerrar pestañas, abrir sin red, repetir tras una actualización.

## Comprobación de presupuestos

Las consultas de datos usan un cliente independiente de los bloqueos de renovación de sesión. El listado no se oculta si faltan clientes, productos o visitadores locales. Las respuestas grandes se conservan en IndexedDB, manteniendo compatibilidad con las copias pequeñas anteriores. La lista y las líneas de detalle deben haberse descargado con Internet; no se pueden recuperar documentos nunca consultados mientras no hay conexión.

Prueba de navegador reproducible (requiere Playwright y Edge): después de npm run build, ejecutar node tests/offline-budgets.browser.cjs. Puede indicarse la ruta del módulo mediante PLAYWRIGHT_MODULE y el navegador mediante TEST_BROWSER_CHANNEL. Verifica listado de más de 1,5 MB, detalle, sesión caducada, ausencia de catálogos y red local sin salida a Internet. Utiliza datos simulados y no escribe en Supabase.
