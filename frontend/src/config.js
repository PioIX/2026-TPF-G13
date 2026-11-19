// Configuración única de la URL del backend.
//
// Para que la cookie de sesión funcione, el navegador debe hablar con el
// backend en el MISMO host desde el que se cargó la página (si la página está
// en localhost y el backend en una IP distinta, la cookie es "cross-site" y el
// navegador no la reenvía, por lo que /usuario responde 401).
//
// Por eso, en el navegador derivamos el host del backend a partir de
// window.location.hostname y le fijamos el puerto del backend. Así, abras la
// app en http://localhost:3000 o en http://192.168.0.59:3000, siempre apunta
// al backend del mismo host.
//
// Podés sobrescribir el puerto con NEXT_PUBLIC_BACKEND_PORT. En SSR (sin
// window) se usa NEXT_PUBLIC_BACKEND_URL o localhost como respaldo.

const BACKEND_PORT = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";

function resolverBackendUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL || `http://localhost:${BACKEND_PORT}`;
}

const BACKEND_URL = resolverBackendUrl();

// URL para fetch a la API REST
const API_URL = BACKEND_URL;

// URL para socket.io (mismo host, esquema ws)
const SOCKET_URL = BACKEND_URL.replace(/^http/, "ws");

export { BACKEND_URL, API_URL, SOCKET_URL };
