# Acceso sin conexión

La web necesita una visita con Internet y terminar la instalación del service worker. El build genera un precache de todo dist; si falta un archivo no se activa esa versión. La actualización se activa al cerrar las pestañas anteriores. Se conservan caches anteriores para pestañas abiertas.

Android incorpora dist mediante Capacitor, sin depender del service worker. Es necesario instalar el nuevo APK.

Es necesario iniciar sesión y cargar el perfil con Internet al menos una vez en cada dispositivo. Se reutiliza la sesión almacenada por el SDK y el perfil de esa misma cuenta; nunca se concede un rol por defecto. La autorización del servidor sigue dependiendo de Supabase/RLS. Las instantáneas locales no acreditan permisos actuales del servidor.

Las consultas REST GET satisfactorias guardan instantáneas locales por proyecto, usuario, URL y cabeceras de consulta (sin tokens). Solo se muestran consultas ya disponibles. El almacenamiento puede fallar por cuota o configuración; no se garantiza disponibilidad de todos los módulos. Los borradores existentes se conservan. Las escrituras sin conexión fallan explícitamente; no existe cola ni sincronización completa. Al volver la conexión se revalida la sesión/perfil; recarga la vista para actualizar sus datos. No se modifican tablas ni datos remotos.

Verificación manual pendiente: dispositivo Android real, iniciar con red, abrir las pantallas necesarias, activar modo avión, cerrar y abrir, comprobar datos guardados, ausencia de datos y cambio de cuenta. Web: esperar instalación, cerrar pestañas, abrir sin red, repetir tras una actualización.
