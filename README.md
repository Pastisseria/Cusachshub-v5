# Cusachs Hub

## Activar el acceso de usuarios

1. En Supabase, abre **SQL Editor** y ejecuta `supabase/configurar_accesos.sql`.
2. Abre **Authentication > Users** y crea el usuario administrador.
3. Vuelve al final del archivo SQL, sustituye `TU_CORREO@EJEMPLO.COM` por su correo y ejecuta las tres líneas indicadas.
4. Crea las demás cuentas desde **Authentication > Users**. Automáticamente serán cuentas de Catering.

La aplicación utiliza las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` existentes. No se deben guardar contraseñas ni claves privadas dentro del proyecto.

## Desarrollo

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
