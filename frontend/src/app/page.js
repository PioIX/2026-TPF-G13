
"use client";

import { useRouter } from "next/navigation";
import "./globals.css";

export default function HomePage() {
    const router = useRouter();
    return (
        <main className="portada">
            <div className="portada-overlay" />

            <section className="portada-contenido">
                <p className="portada-etiqueta">
                    EL COMIENZO DE UNA CARRERA
                </p>

                <h1 className="portada-titulo">
                    <span className="portada-titulo-prefijo">EL</span>
                    <span className="portada-titulo-nombre">TRAYECTO</span>
                </h1>

                <div className="portada-separador">
                    <span />
                    <span className="separador-balon">✦</span>
                    <span />
                </div>

                <p className="portada-subtitulo">
                    Dos futbolistas.
                    <br />
                    <strong>Una leyenda.</strong>
                </p>

                <button
                    className="boton-empezar"
                    onClick={() => router.push("/acceso")}
                >
                    EMPEZAR
                    <span className="flecha-empezar">→</span>
                </button>

                <p className="portada-pie">
                    TU HISTORIA. TU CARRERA. TU LEGADO.
                </p>
            </section>
        </main>
    );
}
