"use client";

import { useEffect, useState } from "react";

export default function InicioPage() {

    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function obtenerUsuario() {

            try {
                const respuesta = await fetch("http://localhost:4000/usuario", {
                    method: "GET",
                    credentials: "include"
                });

                const datos = await respuesta.json();

                if (!respuesta.ok) {
                    setError(datos.error);
                    return;
                }

                setUsuario(datos);

            } catch (error) {
                console.error(error);
                setError("No se pudo conectar con el servidor");
            } finally {             //Haya salido bien o haya ocurrido un error, hacé esto igualmente
                setCargando(false);
            }
        }

        obtenerUsuario();
    }, []);

    if (cargando) {
        return <p>Cargando...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <main>
            <h1>El Trayecto</h1>

            <h2>Bienvenido, {usuario.nombre_usuario}</h2>

            <p>Email: {usuario.email}</p>
            <p>Rol: {usuario.rol}</p>

            <button>
                Crear partida
            </button>

            <button>
                Unirse a partida
            </button>

            <button>
                Historial
            </button>
        </main>
    );
}