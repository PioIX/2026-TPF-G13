"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { io } from "socket.io-client";
import Button from "@/components/Button";

export default function LobbyPage() {
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const [jugadores, setJugadores] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [conectado, setConectado] = useState(false);

    // Cargar los jugadores inicialmente con Fetch
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
                setError("");
            })
            .catch((error) => {
                console.error("Error al cargar jugadores:", error);
                setError(error.message);
            })
            .finally(() => {
                setCargando(false);
            });
    }, [idPartida]);

    // Actualizar los jugadores en tiempo real con Socket.IO
    useEffect(() => {
        if (!idPartida) return;

        const socket = io("http://localhost:4000", {
            withCredentials: true
        });

        socket.on("connect", () => {
            console.log("Conectado a Socket.IO");
            setConectado(true);

            socket.emit("joinRoom", {
                idPartida: idPartida
            });
        });

        socket.on("disconnect", () => {
            console.log("Desconectado de Socket.IO");
            setConectado(false);
        });

        socket.on("jugadoresActualizados", (datos) => {
            console.log("Jugadores actualizados:", datos);
            setJugadores(datos);
            setError("");
        });

        socket.on("connect_error", (error) => {
            console.error("Error de conexión con Socket.IO:", error);
            setConectado(false);
        });

        return () => {
            socket.disconnect();
        };
    }, [idPartida]);


    function marcarComoListo() {
        console.log("¡Se pulsó el botón Listo!", idPartida);
        fetch(`http://localhost:4000/partidas/${idPartida}/listo`, {
            method: "POST",
            credentials: "include"
        })
            .then((respuesta) => respuesta.json())
            .then((datos) => {
                if (datos.error) {
                    setError(datos.error);
                    return;
                }

                setError("");
                console.log(datos.mensaje);
            })
            .catch((error) => {
                console.error("Error al marcar como listo:", error);
                setError("No se pudo conectar con el servidor");
            });
    }


    if (cargando) {
        return <p>Cargando lobby...</p>;
    }

    if (error && jugadores.length === 0) {
        return <p>{error}</p>;
    }

    return (
        <main>
            <h1>Lobby</h1>

            <p>
                Conexión en tiempo real:{" "}
                {conectado ? "Conectado" : "Conectando..."}
            </p>

            <p>Jugadores: {jugadores.length}/2</p>

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

            <Button
                type="button"
                text="Listo"
                onClick={marcarComoListo}
            />
        </main>
    );
}
