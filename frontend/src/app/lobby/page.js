"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function LobbyPage() {

    const searchParams = useSearchParams();

    const idPartida = searchParams.get("id_partida");

    const [jugadores, setJugadores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {

        if (!idPartida) {
            setError("No se encontró la partida");
            setCargando(false);
            return;
        }

        fetch(`http://localhost:4000/partidas/${idPartida}/jugadores`, {
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

                setJugadores(datos);

            })
            .catch((error) => {

                console.error(error);
                setError(error.message);

            })
            .finally(() => {

                setCargando(false);

            });

    }, [idPartida]);


    if (cargando) {
        return <p>Cargando lobby...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <main>

            <h1>Lobby</h1>

            <p>
                Jugadores: {jugadores.length}/2
            </p>

            {jugadores.length < 2 && (
                <p>Esperando al segundo jugador...</p>
            )}

            {jugadores.length === 2 && (
                <p>¡Ya están los dos jugadores!</p>
            )}

            <h2>Jugadores</h2>

            {jugadores.map((jugador) => (
                <p key={jugador.id_participante}>
                    {jugador.nombre_usuario}
                    {jugador.listo ? " - LISTO" : " - No listo"}
                </p>
            ))}

            <button>
                Listo
            </button>

        </main>
    );
}