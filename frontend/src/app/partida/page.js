
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Tablero from "@/components/Tablero";
import Button from "@/components/Button";

export default function PartidaPage() {
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const [idUsuario, setIdUsuario] = useState(null);
    const [jugadores, setJugadores] = useState([]);
    const [resultadoDado, setResultadoDado] = useState(null);
    const [mensaje, setMensaje] = useState("Cargando partida...");
    const [conectado, setConectado] = useState(false);
    const [cargando, setCargando] = useState(true);
    const socketRef = useRef(null);             //sirve para que el componente no se vuelva a renderizar para cuando haya un cambio en el tablero (o los casilleros)

    useEffect(() => {
        if (!idPartida) return;

        let socket;

        // Obtener el usuario de la sesión.
        fetch("http://localhost:4000/usuario", {
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("Tenés que iniciar sesión.");
                }
                return respuesta.json();
            })
            .then((usuario) => {
                setIdUsuario(Number(usuario.id_usuario));

                // Cargar posiciones y turnos guardados en MySQL.
                return fetch(
                    `http://localhost:4000/partidas/${idPartida}/jugadores`,
                    { credentials: "include" }
                );
            })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar los jugadores.");
                }
                return respuesta.json();
            })
            .then((datos) => {
                setJugadores(datos);
                setCargando(false);

                // Conectar con Socket.IO.
                socket = io("http://localhost:4000", {
                    withCredentials: true
                });

                socketRef.current = socket;

                socket.on("connect", () => {
                    setConectado(true);
                    socket.emit("joinRoom", {
                        idPartida: Number(idPartida)
                    });
                    setMensaje("Conectado. ¡A jugar!");
                });

                socket.on("disconnect", () => {
                    setConectado(false);
                    setMensaje("Se perdió la conexión con el servidor.");
                });

                // Recibir el estado que actualizó el servidor.
                socket.on("estadoPartidaActualizado", (estado) => {
                    setJugadores(estado.jugadores);
                    setResultadoDado(estado.resultadoDado);

                    const jugoYo =
                        Number(estado.idUsuarioQueJugo) ===
                        Number(idUsuario);

                    setMensaje(
                        jugoYo
                            ? `Sacaste un ${estado.resultadoDado}. Avanzaste una temporada.`
                            : `El rival sacó un ${estado.resultadoDado}.`
                    );
                });

                socket.on("errorPartida", (error) => {
                    setMensaje(error.mensaje);
                });
            })
            .catch((error) => {
                setMensaje(error.message);
                setCargando(false);
            });

        return () => {
            if (socket) {
                socket.disconnect();
            }
            socketRef.current = null;
        };
    }, [idPartida]);

    function lanzarDado() {
        if (!socketRef.current || !conectado || !esMiTurno) {
            return;
        }

        setMensaje("Procesando turno...");

        socketRef.current.emit("jugarTurno", {
            idPartida: Number(idPartida)
        });
    }

    const miJugador = jugadores.find(
        (jugador) => Number(jugador.id_usuario) === idUsuario
    );

    const rival = jugadores.find(
        (jugador) => Number(jugador.id_usuario) !== idUsuario
    );

    const miPosicion = Number(miJugador?.posicion_actual ?? 1);
    const posicionRival = Number(rival?.posicion_actual ?? 1);
    const esMiTurno = Boolean(Number(miJugador?.turno));
    const ambosListos =
        jugadores.length === 2 &&
        jugadores.every((jugador) => Boolean(Number(jugador.listo)));

    if (!idPartida) {
        return <p>No se encontró el identificador de la partida.</p>;
    }

    if (cargando) {
        return <p>{mensaje}</p>;
    }

    return (
        <main>
            <h1>El Trayecto</h1>
            <p>Partida: {idPartida}</p>
            <p>
                Conexión: {conectado ? "Conectado" : "Desconectado"}
            </p>

            <section>
                <h2>Tu futbolista</h2>
                <p>Jugador: {miJugador?.nombre_usuario ?? "Cargando..."}</p>
                <p>Posición: {miPosicion}</p>
            </section>

            <section>
                <h2>Rival</h2>
                <p>Jugador: {rival?.nombre_usuario ?? "Esperando rival..."}</p>
                <p>Posición: {posicionRival}</p>
            </section>

            <Tablero
                posicionJugador1={miPosicion}
                posicionJugador2={posicionRival}
            />

            <section>
                <h2>Tu turno</h2>
                <p>
                    Resultado del dado:{" "}
                    {resultadoDado ?? "Todavía no lanzado"}
                </p>

                <Button
                    type="button"
                    text="Lanzar dado"
                    onClick={lanzarDado}
                    disabled={!conectado || !esMiTurno || !ambosListos}
                />

                <p>{mensaje}</p>
                {!esMiTurno && <p>Esperando el turno del rival.</p>}
            </section>
        </main>
    );
}
