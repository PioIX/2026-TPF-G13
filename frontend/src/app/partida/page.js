
"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import Tablero from "@/components/Tablero";
import Button from "@/components/Button";

export default function PartidaPage() {
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    // Posiciones iniciales de ejemplo.
    // Después las cargaremos desde el backend.
    const [miPosicion, setMiPosicion] = useState(1);
    const [posicionRival, setPosicionRival] = useState(1);

    const [resultadoDado, setResultadoDado] = useState(null);
    const [mensaje, setMensaje] = useState(
        "Esperando el inicio de la partida..."
    );

    function lanzarDado() {
        // Movimiento provisional para probar la interfaz.
        // El resultado definitivo lo calculará el backend.
        const resultado = Math.floor(Math.random() * 6) + 1;

        setResultadoDado(resultado);

        setMiPosicion((posicionActual) =>
            Math.min(posicionActual + resultado, 20)
        );

        setMensaje(
            `Sacaste un ${resultado}. ¡Avanzaste por el tablero!`
        );
    }

    if (!idPartida) {
        return <p>No se encontró el identificador de la partida.</p>;
    }

    return (
        <main>
            <h1>El Trayecto</h1>

            <p>Partida: {idPartida}</p>

            <section>
                <h2>Tu futbolista</h2>
                <p>Posición: {miPosicion}</p>
                <p>GRL: --</p>
                <p>Dinero: --</p>
            </section>

            <section>
                <h2>Rival</h2>
                <p>Posición: {posicionRival}</p>
                <p>GRL: --</p>
                <p>Dinero: --</p>
            </section>

            <Tablero posicionActual={miPosicion} />

            <section>
                <h2>Tu turno</h2>

                <p>
                    Resultado del dado:{" "}
                    {resultadoDado ?? "Todavía no lanzado"}
                </p>

                <Button
                    type="button"
                    text="Lanzar dado"
                    onClick={lanzarDado}
                />

                <p>{mensaje}</p>
            </section>
        </main>
    );
}
