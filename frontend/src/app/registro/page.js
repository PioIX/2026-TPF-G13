
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";
import "./registro.css";

export default function RegistroPage() {
    const router = useRouter();

    const [nombreUsuario, setNombreUsuario] = useState("");
    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");

    function registrarse(event) {
        event.preventDefault();

        setError("");

        fetch("http://localhost:4000/registro", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                nombre_usuario: nombreUsuario,
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

                router.push("/acceso");
            })
            .catch((error) => {
                console.error(error);
                setError("No se pudo conectar con el servidor");
            });
    }

    return (
        <main className="registro">
            <section className="registro-panel">

                <p className="registro-etiqueta">
                    EL TRAYECTO · TU CARRERA
                </p>

                <h1>
                    Crear <span>cuenta</span>
                </h1>

                <p className="registro-descripcion">
                    Toda gran carrera empieza con un primer paso.
                    <br />
                    Creá tu cuenta y empezá a escribir tu historia.
                </p>

                <div className="registro-separador">
                    <span />
                    <span className="registro-estrella">✦</span>
                    <span />
                </div>

                <form
                    className="registro-formulario"
                    onSubmit={registrarse}
                >
                    <div className="registro-campo">
                        <label htmlFor="registro-usuario">
                            NOMBRE DE USUARIO
                        </label>

                        <Input
                            type="text"
                            ph="Elegí tu nombre de jugador"
                            value={nombreUsuario}
                            onChange={(event) =>
                                setNombreUsuario(event.target.value)
                            }
                        />
                    </div>

                    <div className="registro-campo">
                        <label htmlFor="registro-email">
                            EMAIL
                        </label>

                        <Input
                            type="email"
                            ph="Ingresá tu email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                        />
                    </div>

                    <div className="registro-campo">
                        <label htmlFor="registro-contrasena">
                            CONTRASEÑA
                        </label>

                        <Input
                            type="password"
                            ph="Creá una contraseña"
                            value={contrasena}
                            onChange={(event) =>
                                setContrasena(event.target.value)
                            }
                        />
                    </div>

                    {error && (
                        <p className="registro-error" role="alert">
                            {error}
                        </p>
                    )}

                    <div className="registro-boton">
                        <Button
                            type="submit"
                            text="CREAR CUENTA"
                        />
                    </div>
                </form>

                <button
                    type="button"
                    className="registro-volver"
                    onClick={() => router.push("/acceso")}
                >
                    ← Volver a acceso
                </button>

                <p className="registro-pie">
                    TU HISTORIA. TU CARRERA. TU LEGADO.
                </p>

            </section>
        </main>
    );
}