// Configuración central de la API del backend.
//
// Usa el hostname de la ventana: si jugás en la misma compu es "localhost",
// y si abrís el frontend desde otra compu con la URL de red de Next
// (http://<IP>:3001), el backend se resuelve a la MISMA IP (http://<IP>:4000)
// sin tocar código. Así el juego funciona tanto en una compu con dos
// sesiones como en dos computadoras distintas.
export const API_BASE =
    typeof window !== "undefined"
        ? `http://${window.location.hostname}:4000`
        : "http://localhost:4000";
