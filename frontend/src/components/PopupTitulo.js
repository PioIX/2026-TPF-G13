
"use client";

import Image from "next/image";
import Button from "@/components/Button";
import "./PopupEvento.css";
import "./PopupTitulo.css";

const ETIQUETAS_TIPO = {
    colectivo: "Título con el club",
    internacional: "Título internacional",
    individual: "Premio individual"
};

function Trofeo({ titulo }) {
    return (
        <div className="popup-titulo-trofeo" aria-hidden="true">
            {titulo.imagen ? (
                <Image
                    src={titulo.imagen}
                    alt={titulo.nombre}
                    width={140}
                    height={140}
                />
            ) : (
                <span>🏆</span>
            )}
        </div>
    );
}

function DetalleTrofeo({ titulo }) {
    const extras = [];

    if (titulo.pais) extras.push(titulo.pais);
    if (titulo.continente) extras.push(titulo.continente);

    return (
        <>
            <h3 className="popup-titulo-nombre">{titulo.nombre}</h3>

            {extras.length > 0 && (
                <p className="popup-titulo-detalle">{extras.join(" · ")}</p>
            )}

            <p className="popup-titulo-prestigio">
                Prestigio {"★".repeat(Number(titulo.prestigio) || 1)}
            </p>

            <p className="popup-titulo-puntos">
                +{titulo.puntos_campeon} puntos de campeón
            </p>
        </>
    );
}

/**
 * Muestra los títulos obtenidos al cerrar una temporada.
 * `titulos` es la lista que viene en rendimiento.titulos:
 * [{ tipo, nombre, pais, continente, prestigio, puntos_campeon, imagen }]
 */
export default function PopupTitulo({ titulos, onCerrar }) {
    if (!titulos || titulos.length === 0) return null;

    return (
        <div className="popup-evento-overlay">
            <section
                className="popup-evento"
                role="dialog"
                aria-modal="true"
                aria-labelledby="popup-titulo-encabezado"
            >
                <h2 id="popup-titulo-encabezado">
                    {titulos.length > 1
                        ? "¡Temporada histórica!"
                        : "¡Título obtenido!"}
                </h2>

                <div className="popup-titulo-contenido">
                    {titulos.map((titulo, indice) => (
                        <div key={indice} className="popup-titulo-contenido">
                            <p className="popup-titulo-intro">
                                {ETIQUETAS_TIPO[titulo.tipo] ?? "Título"}
                            </p>

                            <Trofeo titulo={titulo} />
                            <DetalleTrofeo titulo={titulo} />
                        </div>
                    ))}

                    <div className="popup-evento-acciones">
                        <Button
                            text="Seguir la carrera"
                            onClick={onCerrar}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
