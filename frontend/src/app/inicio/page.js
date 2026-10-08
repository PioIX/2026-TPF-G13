"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function InicioPage() {

    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [nombreSala, setNombreSala] = useState("");
    const [mensajeSala, setMensajeSala] = useState("");

    const router = useRouter();

    useEffect(() => {
        function obtenerUsuario() {

            fetch("http://localhost:4000/usuario", {
                method: "GET",
                credentials: "include"
            })
                .then((respuesta) => {

                    if (!respuesta.ok) {
                        return respuesta.json().then((datos) => {
                            throw new Error(datos.error);
                        });
                    }

                    return respuesta.json();
                })
                .then((datos) => {
                    setUsuario(datos);
                })
                .catch((error) => {
                    console.error(error);
                    setError(error.message);
                })
                .finally(() => {
                    setCargando(false);
                });
        }
        obtenerUsuario();
    }, []);


    function cerrarSesion() {

        fetch("http://localhost:4000/logout", {
            method: "POST",
            credentials: "include"
        })
            .then((respuesta) => {

                if (respuesta.ok) {
                    window.location.href = "/login";
                }

            })
            .catch((error) => {
                console.error(error);
            });
    }


    function entrarASala(event) {

        event.preventDefault();

        setMensajeSala("");

        fetch("http://localhost:4000/salas/entrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                nombre_sala: nombreSala
            })
        })
            .then((respuesta) => respuesta.json())
            .then((datos) => {

                if (!datos) {
                    setMensajeSala("No se pudo obtener una respuesta del servidor");
                    return;
                }

                if (datos.error) {
                    setMensajeSala(datos.error);
                    return;
                }

                console.log("Partida:", datos.id_partida);

                router.push(`/lobby?id_partida=${datos.id_partida}`);

            })
            .catch((error) => {
                console.error(error);
                setMensajeSala("No se pudo conectar con el servidor");
            });
    }


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

            <button onClick={cerrarSesion}>
                Cerrar sesión
            </button>

            <form onSubmit={entrarASala}>
                <input
                    type="text"
                    placeholder="Nombre de la sala"
                    value={nombreSala}
                    onChange={(event) => setNombreSala(event.target.value)}
                />

                <button type="submit">
                    Entrar a sala
                </button>
            </form>

            {mensajeSala && <p>{mensajeSala}</p>}
        </main>
    );
}