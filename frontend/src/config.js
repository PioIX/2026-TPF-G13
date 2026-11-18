// Configuración única de la URL del backend.
// Por defecto usa localhost. Para jugar en modo cliente/servidor, definí
// NEXT_PUBLIC_BACKEND_URL en frontend/.env.local (ej: http://192.168.1.10:4000)
// y reiniciá `npm run dev`.

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

// URL para fetch a la API REST
const API_URL = BACKEND_URL;

// URL para socket.io (mismo host, esquema ws)
const SOCKET_URL = BACKEND_URL.replace(/^http/, "ws");

export { BACKEND_URL, API_URL, SOCKET_URL };
