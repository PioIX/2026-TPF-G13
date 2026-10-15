
"use client";

import { useRouter } from "next/navigation";
import "./acceso.css";

export default function AccesoPage() {
    const router = useRouter();

    return (
        <main className="acceso">
            <section className="acceso-panel">
                <p className="acceso-etiqueta">TU CARRERA COMIENZA ACÁ</p>

                <h1>EL TRAYECTO</h1>

                <p className="acceso-descripcion">
                    Cada temporada cuenta.
                    Cada decisión deja huella.
                    ¿Estás listo para hacer historia?
                </p>

                <div className="acceso-botones">
                    <button
                        className="acceso-boton principal"
                        onClick={() => router.push("/login")}
                    >
                        INICIAR SESIÓN
                    </button>

                    <button
                        className="acceso-boton secundario"
                        onClick={() => router.push("/registro")}
                    >
                        REGISTRARSE
                    </button>
                </div>

                <button
                    className="acceso-volver"
                    onClick={() => router.push("/")}
                >
                    ← Volver al inicio
                </button>
            </section>
        </main>
    );
}
