
"use client";

import Evento from "@/components/Evento";
import Button from "@/components/Button";
import "./PopupEvento.css";

export default function PopupEvento({ evento, onContinuar }) {
    if (!evento) return null;

    const categoria = String(evento.categoria ?? "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const clasesPorCategoria = {
        positivo: "popup-evento--positivo",
        seleccion: "popup-evento--seleccion",
        lesion: "popup-evento--lesion",
        "cambio de club": "popup-evento--cambio-club",
        aleatorio: "popup-evento--aleatorio",
        negativo: "popup-evento--negativo",
    };

    const claseCategoria = clasesPorCategoria[categoria] ?? "popup-evento--neutro";

    return (
        <div className="popup-evento-overlay">
            <section
                className={`popup-evento ${claseCategoria}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-evento-titulo"
            >
                <Evento evento={evento}>
                    <div className="popup-evento-efectos">
                        <h3>Efectos del evento</h3>

                        <p>
                            <span>Fama</span>
                            <strong>
                                {Number(evento.efecto_fama) > 0 ? "+" : ""}
                                {evento.efecto_fama ?? 0}
                            </strong>
                        </p>

                        <p>
                            <span>Plata</span>
                            <strong>
                                {Number(evento.efecto_plata) > 0 ? "+" : ""}
                                {evento.efecto_plata ?? 0}
                            </strong>
                        </p>

                        <p>
                            <span>Idolatría</span>
                            <strong>
                                {Number(evento.efecto_idolatria) > 0 ? "+" : ""}
                                {evento.efecto_idolatria ?? 0}
                            </strong>
                        </p>
                    </div>

                    {Boolean(Number(evento.bloquea_avance)) && (
                        <p className="popup-evento-advertencia">
                            ¡Este evento impidió avanzar de casilla!
                        </p>
                    )}

                    {Number(evento.turnos_perdidos) > 0 && (
                        <p className="popup-evento-advertencia">
                            Perderás {evento.turnos_perdidos} turno(s) en futuras rondas.
                        </p>
                    )}

                    <div className="popup-evento-acciones">
                        <Button text="Continuar" onClick={onContinuar} />
                    </div>
                </Evento>
            </section>
        </div>
    );
}
