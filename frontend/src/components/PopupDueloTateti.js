
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import "./PopupEvento.css";
import "./PopupDueloTateti.css";

/**
 * Minijuego de duelo por un título disputado: Tatetí 1v1 en tiempo real.
 *
 * El popup se abre para AMBOS jugadores al mismo tiempo (el servidor avisa
 * por socket `dueloIniciado`). El tablero se dibuja localmente y cada
 * jugada se valida SIEMPRE en el servidor (el frontend solo pinta).
 *
 * props:
 * - duelo: null | { idDuelo, titulo, idDueno, idRival, nombreDueno,
 *                  nombreRival, turno, simboloDueno, simboloRival }
 * - idUsuario: id del usuario actual (para saber qué jugador sos vos)
 * - socket: instancia de socket.io conectada a la sala
 * - onCerrar: callback al cerrar el popup (recibe el resultado final)
 */
export default function PopupDueloTateti({
    duelo,
    idUsuario,
    socket,
    onCerrar
}) {
    const [tablero, setTablero] = useState(Array(9).fill(null));
    const [turno, setTurno] = useState(null);
    const [resultado, setResultado] = useState(null); // { idGanador, motivo }
    const [mensaje, setMensaje] = useState("");

    // Reinicio cuando empieza un duelo nuevo.
    useEffect(() => {
        if (!duelo) {
            setTablero(Array(9).fill(null));
            setTurno(null);
            setResultado(null);
            setMensaje("");
            return;
        }
        setTablero(Array(9).fill(null));
        setTurno(duelo.turno);
        setResultado(null);
        setMensaje("");
    }, [duelo?.idDuelo]);

    // Aviso si intento jugar fuera de turno (el servidor también valida).
    useEffect(() => {
        if (!socket) return undefined;

        const alError = (error) => {
            setMensaje(error.mensaje);
        };

        socket.on("errorPartida", alError);

        return () => {
            socket.off("errorPartida", alError);
        };
    }, [socket]);

    // Suscripción a los eventos del duelo.
    useEffect(() => {
        if (!duelo || !socket) return undefined;

        const alActualizar = (datos) => {
            if (datos.idDuelo !== duelo.idDuelo) return;
            setTablero(datos.tablero);
            setTurno(datos.turno);
        };

        const alFinalizar = (datos) => {
            if (datos.idDuelo !== duelo.idDuelo) return;
            setTablero(datos.tablero);
            setResultado({ idGanador: datos.idGanador, motivo: datos.motivo });
        };

        socket.on("dueloActualizado", alActualizar);
        socket.on("dueloFinalizado", alFinalizar);

        return () => {
            socket.off("dueloActualizado", alActualizar);
            socket.off("dueloFinalizado", alFinalizar);
        };
    }, [duelo?.idDuelo, socket]);

    if (!duelo) return null;

    const soyDueno = Number(idUsuario) === Number(duelo.idDueno);
    const ganeYo = Boolean(
        resultado && Number(resultado.idGanador) === Number(idUsuario)
    );
    const miSimbolo = soyDueno
        ? duelo.simboloDueno
        : duelo.simboloRival;
    const rivalNombre = soyDueno
        ? duelo.nombreRival
        : duelo.nombreDueno;

    const esMiTurno = Number(turno) === Number(idUsuario);
    const dueloTerminado = Boolean(resultado);

    function jugar(casilla) {
        if (dueloTerminado || !esMiTurno || !socket) return;
        if (tablero[casilla] !== null) return;
        socket.emit("dueloJugada", {
            idDuelo: duelo.idDuelo,
            casilla
        });
    }

    function confirmarResultado() {
        if (!socket) return;
        socket.emit("dueloConfirmar", {
            idDuelo: duelo.idDuelo,
            idGanador: resultado?.idGanador
        });
        onCerrar?.(resultado);
    }

    return (
        <div className="popup-evento-overlay">
            <section
                className="popup-evento"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-duelo-encabezado"
            >
                <h2 id="popup-duelo-encabezado">
                    {dueloTerminado
                        ? (ganeYo ? "¡Duelo ganado!" : "Duelo perdido")
                        : "¡Título en disputa!"}
                </h2>

                <div className="popup-titulo-contenido">
                    <p className="popup-titulo-intro">
                        {dueloTerminado
                            ? soyDueno
                                ? (ganeYo
                                    ? "Defendiste tu título como un campeón. Los puntos son tuyos."
                                    : "Te robaron el título en el duelo. Los puntos de campeón van para tu rival.")
                                : (ganeYo
                                    ? "Le ganaste al rival y te quedaste con los puntos de su título."
                                    : "El rival defendió su título. Se te escapó la chance de robarlo.")
                            : soyDueno
                                ? "Se juega en un Tatetí. Si perdés, perdés el título."
                                : "Se juega en un Tatetí. Si ganás, le arrancás el título al rival y te quedás con sus puntos."}
                    </p>

                    <div className="duelo-titulo-info">
                        {duelo.titulo?.imagen && (
                            <Image
                                src={duelo.titulo.imagen}
                                alt={duelo.titulo.nombre}
                                width={90}
                                height={90}
                            />
                        )}
                        <div>
                            <p className="duelo-titulo-nombre">
                                {duelo.titulo?.nombre}
                            </p>
                            <p className="duelo-titulo-puntos">
                                +{duelo.titulo?.puntos_campeon} puntos en juego
                            </p>
                        </div>
                    </div>

                    <p className="duelo-versus">
                        <strong>
                            {soyDueno ? "Vos" : duelo.nombreDueno}
                        </strong>
                        {" (X) vs "}
                        <strong>
                            {soyDueno ? duelo.nombreRival : "Vos"}
                        </strong>
                        {" (O)"}
                    </p>

                    {!dueloTerminado && (
                        <p className={`duelo-turno${esMiTurno ? " duelo-turno--tuyo" : ""}`}>
                            {esMiTurno
                                ? "🎯 ¡Es tu turno! Elegí una casilla."
                                : `⏳ Esperando la jugada de ${rivalNombre}...`}
                        </p>
                    )}

                    <div className="duelo-tateti" role="grid" aria-label="Tablero de tatetí">
                        {tablero.map((valor, indice) => (
                            <button
                                key={indice}
                                type="button"
                                role="gridcell"
                                className={`duelo-tateti-casilla${
                                    valor
                                        ? ` duelo-tateti-casilla--ocupada duelo-tateti-casilla--${valor}`
                                        : ""
                                }${
                                    esMiTurno && !valor && !dueloTerminado
                                        ? " duelo-tateti-casilla--tu-turno"
                                        : ""
                                }`}
                                onClick={() => jugar(indice)}
                                disabled={
                                    Boolean(valor) ||
                                    dueloTerminado
                                }
                                aria-label={`Casilla ${indice + 1}${valor ? `: ${valor}` : " vacía"}`}
                            >
                                {valor ?? ""}
                            </button>
                        ))}
                    </div>

                    {mensaje && <p className="duelo-mensaje">{mensaje}</p>}

                    <div className="popup-evento-acciones">
                        {dueloTerminado && (
                            <Button
                                text="Continuar"
                                onClick={confirmarResultado}
                            />
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
