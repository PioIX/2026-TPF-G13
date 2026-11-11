
"use client";

import Button from "@/components/Button";
import "./PopupEvento.css";

// La nota depende del aporte ofensivo (goles y asistencias), de cuántos
// partidos se jugaron respecto de una temporada completa y de las lesiones.
// El popup explica cuál de esos factores pesó para que la nota sea la que es.
function obtenerVeredicto(nota) {
    if (nota >= 9) return "Temporada de crack";
    if (nota >= 8) return "Temporada enorme";
    if (nota >= 7) return "Muy buena temporada";
    if (nota >= 6) return "Buena temporada";
    if (nota >= 5) return "Temporada discreta";
    if (nota >= 4) return "Temporada floja";
    return "Temporada para el olvido";
}

// Color del veredicto: verde (buena), gris (regular) o rojo (mala), para
// que un 3 no se muestre con el mismo brillo que un 9.
function obtenerTono(nota) {
    if (nota >= 7) return "popup-rendimiento-veredicto--alta";
    if (nota >= 5) return "popup-rendimiento-veredicto--media";
    return "popup-rendimiento-veredicto--baja";
}

export default function PopupRendimiento({ rendimiento, onCerrar }) {
    if (!rendimiento) return null;

    const partidos = Number(rendimiento.partidos) || 0;
    const temporadaCompleta =
        Number(rendimiento.partidosTemporadaCompleta) || 34;
    const goles = Number(rendimiento.goles) || 0;
    const asistencias = Number(rendimiento.asistencias) || 0;
    const nota = Number(rendimiento.nota) || 0;

    const sinTemporada = Boolean(rendimiento.sinTemporada);
    const factorDisponibilidad = temporadaCompleta > 0
        ? Math.min(1, partidos / temporadaCompleta)
        : 0;

    // Aporte ofensivo (goles + asistencias por partido): contexto de la nota.
    const aportePorPartido = partidos > 0
        ? (goles + asistencias) / partidos
        : 0;

    let motivo;
    if (sinTemporada || partidos === 0) {
        motivo = "No disputó la temporada (lesión o fin de carrera): la nota no puede ser alta.";
    } else if (factorDisponibilidad < 0.5) {
        motivo = "Jugó menos de media temporada por la lesión: eso baja la nota, aunque su aporte por partido haya sido bueno.";
    } else if (factorDisponibilidad < 0.85) {
        motivo = "Perdió varios partidos en la temporada: la nota queda rebajada respecto de lo que hubiera sacado jugando todo.";
    } else if (nota >= 8) {
        motivo = "Jugó casi toda la temporada y superó lo esperado en goles y asistencias.";
    } else if (nota >= 6) {
        motivo = "Temporada completa con un aporte ofensivo acorde a su nivel.";
    } else {
        motivo = "Jugó la temporada completa, pero su aporte ofensivo quedó por debajo de lo esperado.";
    }

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
                    Nota de la temporada: goles y asistencias, ajustados por
                    los partidos que realmente pudo jugar.
                </p>

                <h3
                    className={`popup-rendimiento-veredicto ${obtenerTono(nota)}`}
                >
                    {obtenerVeredicto(nota)} · {nota.toFixed(1)}
                </h3>

                <div className="popup-rendimiento-stats">
                    <div>
                        <span>Goles</span>
                        <strong>{goles}</strong>
                    </div>

                    <div>
                        <span>Asistencias</span>
                        <strong>{asistencias}</strong>
                    </div>

                    <div>
                        <span>Partidos</span>
                        <strong>
                            {partidos}/{temporadaCompleta}
                        </strong>
                    </div>

                    <div>
                        <span>Aporte por partido</span>
                        <strong>{aportePorPartido.toFixed(2)}</strong>
                    </div>
                </div>

                {factorDisponibilidad < 1 && (
                    <p className="popup-evento-advertencia">
                        Disponibilidad: {Math.round(factorDisponibilidad * 100)}%
                        de la temporada.
                    </p>
                )}

                <p className="popup-rendimiento-motivo">
                    {motivo}
                </p>

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
