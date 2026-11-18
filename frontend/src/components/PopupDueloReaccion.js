
"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import "./PopupEvento.css";
import "./PopupDueloTateti.css";

/**
 * Minijuego de reacción por un título disputado.
 *
 * El botón se ilumina en un momento aleatorio (decidido por el SERVIDOR,
 * para que sea justo para ambos): el primero en clickear gana el duelo.
 * Si clickeás antes de que se encienda, quemás la largada y perdés.
 *
 * props:
 * - duelo: null | { idDuelo, juego, titulo, idDueno, idRival, ... }
 * - idUsuario: id del usuario actual
 * - socket: instancia de socket.io conectada a la sala
 * - onCerrar: callback al cerrar el popup
 */
export default function PopupDueloReaccion({
    duelo,
    idUsuario,
    socket,
    onCerrar
}) {
    const [fase, setFase] = useState("preparando"); // preparando | listo | terminado
    const [resultado, setResultado] = useState(null);

    // Reinicio al empezar un duelo nuevo.
    useEffect(() => {
        if (!duelo) {
            setFase("preparando");
            setResultado(null);
        }
    }, [duelo?.idDuelo]);

    // Suscripción a los eventos del duelo de reacción.
    useEffect(() => {
        if (!duelo || !socket || duelo.juego !== "reaccion") return undefined;

        const alPreparar = (datos) => {
            if (datos.idDuelo !== duelo.idDuelo) return;
            setFase("preparando");
        };

        const alListo = (datos) => {
            if (datos.idDuelo !== duelo.idDuelo) return;
            setFase("listo");
        };

        const alFinalizar = (datos) => {
            if (datos.idDuelo !== duelo.idDuelo) return;
            setResultado({
                idGanador: datos.idGanador,
                motivo: datos.motivo
            });
            setFase("terminado");
        };

        socket.on("dueloReaccionPreparando", alPreparar);
        socket.on("dueloReaccionListo", alListo);
        socket.on("dueloFinalizado", alFinalizar);

        return () => {
            socket.off("dueloReaccionPreparando", alPreparar);
            socket.off("dueloReaccionListo", alListo);
            socket.off("dueloFinalizado", alFinalizar);
        };
    }, [duelo?.idDuelo, socket]);

    if (!duelo) return null;

    const soyDueno = Number(idUsuario) === Number(duelo.idDueno);
    const ganeYo = Boolean(
        resultado && Number(resultado.idGanador) === Number(idUsuario)
    );
    const rivalNombre = soyDueno ? duelo.nombreRival : duelo.nombreDueno;

    const dueloTerminado = fase === "terminado";

    function click() {
        if (dueloTerminado || !socket) return;
        socket.emit("dueloReaccionClick", { idDuelo: duelo.idDuelo });
    }

    function confirmarResultado() {
        if (!socket) return;
        socket.emit("dueloConfirmar", {
            idDuelo: duelo.idDuelo,
            idGanador: resultado?.idGanador
        });
        onCerrar?.(resultado);
    }

    // Textos según quién sos y cómo terminó.
    let mensajeFase;
    if (dueloTerminado) {
        if (resultado?.motivo === "reaccion_quemado") {
            mensajeFase = ganeYo
                ? `¡${rivalNombre} quemó la largada! Ganás por su salida nula.`
                : "¡Quemaste la largada! Clickeaste antes de tiempo y perdiste.";
        } else if (resultado?.motivo === "reaccion_timeout") {
            mensajeFase = "Nadie reaccionó a tiempo. El destino decidió al azar.";
        } else {
            mensajeFase = ganeYo
                ? "¡Fuiste el más rápido! Tu reflejo te ganó el duelo."
                : `Te ganó de reflejo ${rivalNombre}.`;
        }
    } else if (fase === "preparando") {
        mensajeFase = "Esperá la señal... no clickees antes de tiempo.";
    } else {
        mensajeFase = "¡AHORA! ¡CLICKEÁ!";
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
                            ? mensajeFase
                            : soyDueno
                                ? "Minijuego de reacción. El más rápido se queda con el título."
                                : "Minijuego de reacción. Si ganás, le robás el título y sus puntos al rival."}
                    </p>

                    <div className="duelo-titulo-info">
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
                        <strong>{soyDueno ? "Vos" : duelo.nombreDueno}</strong>
                        {" vs "}
                        <strong>{soyDueno ? duelo.nombreRival : "Vos"}</strong>
                    </p>

                    <button
                        type="button"
                        className={`duelo-reaccion-boton duelo-reaccion-boton--${fase}`}
                        onClick={click}
                        disabled={dueloTerminado}
                        aria-label={
                            fase === "listo"
                                ? "¡Clickeá ahora!"
                                : "Esperando la señal"
                        }
                    >
                        {dueloTerminado
                            ? (ganeYo ? "🏆 ¡Ganaste!" : "💀 Perdiste")
                            : fase === "listo"
                                ? "¡AHORA!"
                                : "ESPERÁ..."}
                    </button>

                    <p className={`duelo-turno${fase === "listo" ? " duelo-turno--tuyo" : ""}`}>
                        {mensajeFase}
                    </p>

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
