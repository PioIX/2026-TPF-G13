"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import "./login.css";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");

    function iniciarSesion(event) {
        event.preventDefault();
        setError("");

        fetch("http://localhost:4000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                email: email,
                contrasena: contrasena
            })
        })
            .then((respuesta) => {
                return respuesta.json();
            })
            .then((datos) => {
                if (datos.error) {
                    setError(datos.error);
                    return;
                }

                console.log("Usuario logueado:", datos.usuario);
                router.push("/inicio");
            })
            .catch((error) => {
                console.error(error);
                setError("No se pudo conectar con el servidor");
            });
    }

    return (
        <main className="login">
            <div className="login-panel">

                <p className="login-etiqueta">
                    EL TRAYECTO · TU CARRERA
                </p>

                <h1>
                    Iniciar <span>sesión</span>
                </h1>

                <p className="login-descripcion">
                    Tu próxima temporada empieza acá.
                    <br />
                    Entrá y continuá tu camino hacia la gloria.
                </p>

                <div className="login-separador">
                    <span />
                    <span className="login-estrella">✦</span>
                    <span />
                </div>

                <form className="login-formulario" onSubmit={iniciarSesion}>

                    <div className="login-campo">
                        <label htmlFor="login-email">
                            EMAIL
                        </label>

                        <Input
                            type="email"
                            ph="Ingresá tu email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                        />
                    </div>

                    <div className="login-campo">
                        <label htmlFor="login-contrasena">
                            CONTRASEÑA
                        </label>

                        <Input
                            type="password"
                            ph="Ingresá tu contraseña"
                            value={contrasena}
                            onChange={(event) => setContrasena(event.target.value)}
                        />
                    </div>

                    {error && (
                        <p className="login-error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="login-boton">
                        <Button
                            type="submit"
                            text="ENTRAR"
                        />
                    </div>

                </form>

                <button
                    type="button"
                    className="login-volver"
                    onClick={() => router.push("/acceso")}
                >
                    ← Volver
                </button>

                <p className="login-pie">
                    TU HISTORIA. TU CARRERA. TU LEGADO.
                </p>

            </div>
        </main>
    );
}
