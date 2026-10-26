
"use client";

import Evento from "@/components/Evento";
import Button from "@/components/Button";
import "./PopupEvento.css";

export default function PopupEvento({ evento, onCerrar }) {
    if (!evento) return null;

    return (
        <div className="popup-evento-overlay">
            <section
                className="popup-evento"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-evento-titulo"
            >
                <Evento evento={evento}>
                    <div className="popup-evento-efectos">
                        <h3>Efectos del evento</h3>

                        <p>
                            Fama: {Number(evento.efecto_fama) > 0 ? "+" : ""}
                            {evento.efecto_fama ?? 0}
                        </p>

                        <p>
                            Plata: {Number(evento.efecto_plata) > 0 ? "+" : ""}
                            {evento.efecto_plata ?? 0}
                        </p>

                        <p>
                            Idolatría: {Number(evento.efecto_idolatria) > 0 ? "+" : ""}
                            {evento.efecto_idolatria ?? 0}
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
                        <Button
                            text="Entendido"
                            onClick={onCerrar}
                        />
                    </div>
                </Evento>
            </section>
        </div>
    );
}
