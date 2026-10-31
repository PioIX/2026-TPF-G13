
"use client";

import Button from "@/components/Button";
import "./PopupEvento.css";

export default function PopupRendimiento({ rendimiento, onCerrar }) {
    if (!rendimiento) return null;

    return (
        <div className="popup-evento-overlay">
            <section
                className="popup-evento"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-rendimiento-titulo"
            >
                <h2 id="popup-rendimiento-titulo">
                    Rendimiento del turno
                </h2>

                <p>
                    Goles: {rendimiento.goles}
                </p>

                <p>
                    Asistencias: {rendimiento.asistencias}
                </p>

                <p>
                    Partidos: {rendimiento.partidos}
                </p>

                <h3>
                    Nota: {rendimiento.nota}/10
                </h3>

                <div className="popup-evento-acciones">
                    <Button
                        text="Cerrar"
                        onClick={onCerrar}
                    />
                </div>
            </section>
        </div>
    );
}
