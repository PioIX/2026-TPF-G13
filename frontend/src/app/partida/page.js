
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Tablero from "@/components/Tablero";
import Button from "@/components/Button";
import PanelJugador from "@/components/PanelJugador";
import PopupEvento from "@/components/PopupEvento";
import PopupRendimiento from "@/components/PopupRendimiento";

export default function PartidaPage() {
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const [idUsuario, setIdUsuario] = useState(null);
    const [jugadores, setJugadores] = useState([]);
    const [resultadoDado, setResultadoDado] = useState(null);
    const [eventoActual, setEventoActual] = useState(null);
    const [mensaje, setMensaje] = useState("Cargando partida...");
    const [conectado, setConectado] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [mostrarEvento, setMostrarEvento] = useState(false);
    const [rendimientoActual, setRendimientoActual] = useState(null);
    const [mostrarRendimiento, setMostrarRendimiento] = useState(false);

    const socketRef = useRef(null);

    useEffect(() => {
        if (!idPartida) return;
        let idUsuarioActual = null;
        let socket;
        let cancelado = false;

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
                if (cancelado) return null;

                idUsuarioActual = Number(usuario.id_usuario);
                setIdUsuario(idUsuarioActual);

                return fetch(
                    `http://localhost:4000/partidas/${idPartida}/jugadores`,
                    { credentials: "include" }
                );
            })
            .then((respuesta) => {
                if (!respuesta || cancelado) return null;

                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar los jugadores.");
                }

                return respuesta.json();
            })
            .then((datos) => {
                if (!datos || cancelado) return;

                setJugadores(datos);
                setCargando(false);

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

                socket.on("estadoPartidaActualizado", (estado) => {
                    setJugadores(estado.jugadores);
                    const jugoYo =
                        Number(estado.idUsuarioQueJugo) === Number(idUsuarioActual);

                    setJugadores(estado.jugadores);

                    if (jugoYo) {
                        setResultadoDado(estado.resultadoDado);

                        setRendimientoActual(estado.rendimiento ?? null);
                        setMostrarRendimiento(false);

                        if (estado.evento) {
                            setEventoActual(estado.evento);
                            setMostrarEvento(true);
                        } else {
                            setEventoActual(null);
                            setMostrarEvento(false);
                        }
                    } else {
                        setEventoActual(null);
                        setMostrarEvento(false);
                        setRendimientoActual(null);
                        setMostrarRendimiento(false);
                    }

                    if (estado.turnoPerdido) {
                        setMensaje(
                            jugoYo
                                ? "Perdiste este turno por un evento anterior."
                                : "Tu rival perdió su turno por un evento anterior."
                        );
                        return;
                    }

                    setMensaje(
                        jugoYo
                            ? "Tu turno se actualizó."
                            : `El rival sacó un ${estado.resultadoDado}.`
                    );
                });

                socket.on("errorPartida", (error) => {
                    setMensaje(error.mensaje);
                });
            })
            .catch((error) => {
                if (cancelado) return;

                setMensaje(error.message);
                setCargando(false);
            });

        return () => {
            cancelado = true;

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
        return (
            <p className="game-state">
                No se encontró el identificador de la partida.
            </p>
        );
    }

    if (cargando) {
        return <p className="game-state">{mensaje}</p>;
    }

    return (
        <main className="game-page game-page--partida">
            <h1>El Trayecto</h1>

            <div className="game-jugadores">
                <PanelJugador
                    titulo="Tu futbolista"
                    jugador={miJugador}
                />

                <PanelJugador
                    titulo="Rival"
                    jugador={rival}
                />
            </div>

            <Tablero
                posicionJugador1={miPosicion}
                posicionJugador2={posicionRival}
            />

            <section className="game-turno">
                <h2>Tu turno</h2>

                <p>
                    Resultado del dado:{" "}
                    {resultadoDado ?? "Todavía no lanzado"}
                </p>

                <Button
                    type="button"
                    text="Lanzar dado"
                    onClick={lanzarDado}
                    disabled={
                        !conectado ||
                        !esMiTurno ||
                        !ambosListos
                    }
                />

                <p>{mensaje}</p>

                {!esMiTurno && (
                    <p>Esperando el turno del rival.</p>
                )}
            </section>


            <PopupEvento
                evento={mostrarEvento ? eventoActual : null}
                onContinuar={() => {
                    setMostrarEvento(false);

                    if (rendimientoActual) {
                        setMostrarRendimiento(true);
                    }
                }}
            />

            <PopupRendimiento
                rendimiento={mostrarRendimiento ? rendimientoActual : null}
                onCerrar={() => setMostrarRendimiento(false)}
            />

        </main>
    );
}
