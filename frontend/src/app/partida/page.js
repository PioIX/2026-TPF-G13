
"use client";
import { API_BASE } from "@/config";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Tablero from "@/components/Tablero";
import Button from "@/components/Button";
import PanelJugador from "@/components/PanelJugador";
import PopupEvento from "@/components/PopupEvento";
import PopupRendimiento from "@/components/PopupRendimiento";
import PopupTitulo from "@/components/PopupTitulo";
import PopupCambioClub from "@/components/PopupCambioClub";
import PopupDueloTateti from "@/components/PopupDueloTateti";
import PopupDueloReaccion from "@/components/PopupDueloReaccion";

// Qué celdas de la grilla 3x3 del dado están encendidas para cada resultado.
// Orden: fila por fila (1: arriba-izq ... 9: abajo-der).
const PUNTOS_DADO = {
    1: [0, 0, 0, 0, 1, 0, 0, 0, 0],
    2: [1, 0, 0, 0, 0, 0, 0, 0, 1],
    3: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    4: [1, 0, 1, 0, 0, 0, 1, 0, 1],
    5: [1, 0, 1, 0, 1, 0, 1, 0, 1],
    6: [1, 1, 1, 0, 0, 0, 1, 1, 1],
};

export default function PartidaPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const [idUsuario, setIdUsuario] = useState(null);
    const [jugadores, setJugadores] = useState([]);

    const [eventoActual, setEventoActual] = useState(null);
    const [mensaje, setMensaje] = useState("Cargando partida...");
    const [conectado, setConectado] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [mostrarEvento, setMostrarEvento] = useState(false);
    const [rendimientoActual, setRendimientoActual] = useState(null);
    const [mostrarRendimiento, setMostrarRendimiento] = useState(false);
    const [titulosGanados, setTitulosGanados] = useState([]);
    const [mostrarTitulos, setMostrarTitulos] = useState(false);
    const [tirandoDado, setTirandoDado] = useState(false);
    const [resultadoMostrado, setResultadoMostrado] = useState(null);
    const [cambioClubPendiente, setCambioClubPendiente] = useState(null);
    const [partidaTerminada, setPartidaTerminada] = useState(false);
    const [dueloActivo, setDueloActivo] = useState(null); // minijuego por título
    const [tituloDisputadoPendiente, setTituloDisputadoPendiente] = useState(null);

    const socketRef = useRef(null);
    const redireccionFinalRef = useRef(null);
    const temporizadorTiradaRef = useRef(null);
    const temporizadorEventoRef = useRef(null);
    const inicioTiradaRef = useRef(null);
    const eventoPendienteRef = useRef(null);

    useEffect(() => {
        if (!idPartida) return;
        let idUsuarioActual = null;
        let socket;
        let cancelado = false;

        fetch(`${API_BASE}/usuario`, {
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

                return fetch(`${API_BASE}/partidas/${idPartida}/jugadores`,
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

                socket = io(`${API_BASE}`, {
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
                    if (Number(estado.idUsuarioQueJugo) === idUsuarioActual) {
                        setRendimientoActual(estado.rendimiento ?? null);
                        setTitulosGanados(estado.rendimiento?.titulos ?? []);
                    }
                    if (Number(estado.idUsuarioQueJugo) === idUsuarioActual) {
                        const tiempoRestante = Math.max(
                            0,
                            3000 - (Date.now() - (inicioTiradaRef.current ?? 0))
                        );
                        if (temporizadorTiradaRef.current) {
                            clearTimeout(temporizadorTiradaRef.current);
                        }
                        temporizadorTiradaRef.current = setTimeout(() => {
                            setTirandoDado(false);
                            temporizadorTiradaRef.current = null;
                            inicioTiradaRef.current = null;
                            setResultadoMostrado(estado.resultadoDado);
                            temporizadorEventoRef.current = setTimeout(() => {
                                if (eventoPendienteRef.current) {
                                    setEventoActual(eventoPendienteRef.current);
                                    setMostrarEvento(true);
                                    eventoPendienteRef.current = null;
                                }
                                temporizadorEventoRef.current = null;
                            }, 1500);
                        }, tiempoRestante);
                    }

                    setJugadores(estado.jugadores);
                    const jugoYo =
                        Number(estado.idUsuarioQueJugo) === Number(idUsuarioActual);

                    // El evento se presenta solo después de mostrar la cara final del dado.
                    if (jugoYo && estado.evento) {
                        eventoPendienteRef.current = estado.evento;
                    } else if (!jugoYo) {
                        eventoPendienteRef.current = null;
                        setEventoActual(null);
                        setMostrarEvento(false);
                    }

                    if (!jugoYo && estado.evento) {
                        setEventoActual(estado.evento);
                        setMostrarEvento(true);
                    }

                    if (
                        jugoYo &&
                        estado.evento?.cambioClub?.opciones?.length > 0
                    ) {
                        setCambioClubPendiente(estado.evento.cambioClub);
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

                // Alguien llegó al casillero 20: la carrera terminó.
                // Se deja ver el último evento y después se pasa a la
                // pantalla final, que revela las estadísticas de a poco.
                socket.on("partidaFinalizada", (datos) => {
                    if (Number(datos.idPartida) !== Number(idPartida)) return;

                    setPartidaTerminada(true);
                    setMensaje("La carrera terminó. Preparando los resultados...");

                    // Se espera a que el jugador cierre el último evento
                    // (o un máximo de 12 s) para no cortar la secuencia.
                    if (redireccionFinalRef.current) {
                        clearTimeout(redireccionFinalRef.current);
                    }

                    redireccionFinalRef.current = setTimeout(() => {
                        router.push(`/finaljuego?id_partida=${idPartida}`);
                    }, 12000);
                });

                socket.on("errorPartida", (error) => {
                    setMensaje(error.mensaje);
                });

                // Un título quedó en disputa: se juega un minijuego 1v1
                // (tatetí) para definir si el jugador se queda con el título
                // o el rival se lo roba.
                socket.on("tituloDisputado", (datos) => {
                    if (Number(datos.idPartida) !== Number(idPartida)) return;
                    setTituloDisputadoPendiente(datos);
                });

                socket.on("dueloIniciado", (datos) => {
                    // Aceptamos "tateti" o "reaccion" (cualquier juego conocido).
                    if (datos.juego !== "tateti" && datos.juego !== "reaccion") return;
                    setDueloActivo(datos);
                });

                socket.on("dueloResuelto", (datos) => {
                    setDueloActivo(null);
                    setTituloDisputadoPendiente(null);
                    if (datos.tituloGanadoPorDueno) {
                        setMensaje(
                            Number(datos.idGanador) === idUsuarioActual
                                ? "¡Defendiste tu título! Los puntos de campeón son tuyos."
                                : "El rival defendió su título. Se te escapó la chance de robar los puntos."
                        );
                    } else {
                        setMensaje(
                            Number(datos.idGanador) === idUsuarioActual
                                ? `¡Le robaste el título al rival! Sumaste ${datos.puntosRecompensa} puntos de campeón.`
                                : "Te robaron el título en el duelo. Los puntos de campeón fueron para tu rival."
                        );
                    }
                });
            })
            .catch((error) => {
                if (cancelado) return;

                setMensaje(error.message);
                setCargando(false);
            });

        return () => {
            cancelado = true;

            if (temporizadorTiradaRef.current) {
                clearTimeout(temporizadorTiradaRef.current);
                temporizadorTiradaRef.current = null;
            }
            if (temporizadorEventoRef.current) {
                clearTimeout(temporizadorEventoRef.current);
                temporizadorEventoRef.current = null;
            }
            if (redireccionFinalRef.current) {
                clearTimeout(redireccionFinalRef.current);
                redireccionFinalRef.current = null;
            }

            if (socket) {
                socket.disconnect();
            }

            socketRef.current = null;
        };
    }, [idPartida, router]);

    function lanzarDado() {
        if (!socketRef.current || !conectado || !esMiTurno) {
            return;
        }

        if (tirandoDado) return;

        inicioTiradaRef.current = Date.now();
        setResultadoMostrado(null);
        setTirandoDado(true);
        setMensaje("El dado está girando...");
        temporizadorTiradaRef.current = setTimeout(() => {
            setTirandoDado(false);
            temporizadorTiradaRef.current = null;
            inicioTiradaRef.current = null;
        }, 3000);

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
        <main className={`game-page game-page--partida${tirandoDado ? " game-page--tirando" : ""}`}>
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

                <div className={`dado-visual${tirandoDado ? " dado-visual--animando" : ""}`} aria-live="polite" aria-label={tirandoDado ? "El dado está girando" : `Resultado del dado: ${resultadoMostrado ?? "todavía no lanzado"}`}>
                    <span className={`dado-visual-cara-dibujo${tirandoDado || !resultadoMostrado ? " dado-visual-cara-dibujo--oculta" : ""}`} aria-hidden="true">
                        {resultadoMostrado ? PUNTOS_DADO[resultadoMostrado].map((celda, indice) => (
                            <span
                                key={indice}
                                className={`dado-punto${celda ? " dado-punto--encendido" : ""}`}
                                style={{ gridArea: `${Math.floor(indice / 3) + 1} / ${(indice % 3) + 1}` }}
                            />
                        )) : null}
                    </span>
                    <span className="dado-visual-cara dado-visual-cara--movimiento" aria-hidden="true">⚄</span>
                </div>



                <Button
                    type="button"
                    text="Lanzar dado"
                    onClick={lanzarDado}
                    disabled={
                        !conectado ||
                        tirandoDado ||
                        !esMiTurno ||
                        !ambosListos ||
                        partidaTerminada
                    }
                />

                <p>{mensaje}</p>

                {!esMiTurno && !partidaTerminada && (
                    <p>Esperando el turno del rival.</p>
                )}

                {partidaTerminada && (
                    <Button
                        type="button"
                        text="Ver resultados"
                        onClick={() => router.push(`/finaljuego?id_partida=${idPartida}`)}
                    />
                )}
            </section>


            <PopupEvento
                evento={mostrarEvento ? eventoActual : null}
                onContinuar={() => {
                    setMostrarEvento(false);

                    // Si la carrera terminó, después del último evento se
                    // pasa directo a la pantalla final.
                    if (partidaTerminada) {
                        if (redireccionFinalRef.current) {
                            clearTimeout(redireccionFinalRef.current);
                            redireccionFinalRef.current = null;
                        }
                        router.push(`/finaljuego?id_partida=${idPartida}`);
                        return;
                    }

                    if (rendimientoActual) {
                        setMostrarRendimiento(true);
                    } else if (titulosGanados.length > 0) {
                        setMostrarTitulos(true);
                    }
                }}
            />

            <PopupRendimiento
                rendimiento={mostrarRendimiento ? rendimientoActual : null}
                onCerrar={() => {
                    setMostrarRendimiento(false);

                    // Después del rendimiento de la temporada, si hubo
                    // títulos ganados, se celebra con su propio popup.
                    if (titulosGanados.length > 0) {
                        setMostrarTitulos(true);
                    }
                }}
            />

            <PopupTitulo
                titulos={mostrarTitulos ? titulosGanados : null}
                onCerrar={() => {
                    setMostrarTitulos(false);

                    // Si algún título quedó en disputa, después de cerrar la
                    // celebración se arranca el duelo (tatetí) contra el rival.
                    if (tituloDisputadoPendiente) {
                        socketRef.current?.emit("dueloJugar", {
                            idPartida: Number(idPartida),
                            idParticipante: tituloDisputadoPendiente.idParticipante
                        });
                    }
                }}
            />

            <PopupCambioClub
                cambioClub={cambioClubPendiente}
                clubActual={miJugador?.nombre_club}
                onElegir={(idClub) => {
                    fetch(`${API_BASE}/partidas/${idPartida}/cambioClub`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id_club: idClub })
                    })
                        .then((respuesta) => respuesta.json())
                        .then((datos) => {
                            if (datos.jugadores) {
                                setJugadores(datos.jugadores);
                            }
                            setCambioClubPendiente(null);
                            setMensaje("Te cambiaste de club. ¡Nueva etapa!");
                        })
                        .catch(() => {
                            setCambioClubPendiente(null);
                        });
                }}
            />

            {dueloActivo?.juego === "reaccion" ? (
                <PopupDueloReaccion
                    duelo={dueloActivo}
                    idUsuario={idUsuario}
                    socket={socketRef.current}
                    onCerrar={() => {
                        setDueloActivo(null);
                        setTituloDisputadoPendiente(null);
                    }}
                />
            ) : (
                <PopupDueloTateti
                    duelo={dueloActivo}
                    idUsuario={idUsuario}
                    socket={socketRef.current}
                    onCerrar={() => {
                        setDueloActivo(null);
                        setTituloDisputadoPendiente(null);
                    }}
                />
            )}

        </main>
    );
}
