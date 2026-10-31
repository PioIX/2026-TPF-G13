
"use client";

import Button from "@/components/Button";
import "./PopupEvento.css";

export default function PopupCambioClub({ cambioClub, clubActual, onElegir }) {
    if (!cambioClub || !cambioClub.opciones) return null;

    const opciones = cambioClub.opciones;

    return (
        <div className="popup-evento-overlay">
            <section
                className="popup-evento"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-cambio-club-titulo"
            >
                <h2 id="popup-cambio-club-titulo">
                    Te quedaste sin club
                </h2>

                <p>
                    Tu contrato terminó y debés firmar con un nuevo equipo.
                    Estas son las ofertas que tenés sobre la mesa
                    (nivel jerárquico {cambioClub.jerarquiaObjetivo}):
                </p>

                <ul className="popup-cambio-club-opciones">
                    {opciones.map((club) => (
                        <li key={club.id_club}>
                            <Button
                                text={`${club.nombre} (${club.liga})`}
                                onClick={() => onElegir(club.id_club)}
                            />
                        </li>
                    ))}
                </ul>

                <p className="popup-cambio-club-actual">
                    Club actual: {clubActual ?? "Sin club"}
                </p>
            </section>
        </div>
    );
}
