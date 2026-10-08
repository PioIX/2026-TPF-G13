"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");

    async function iniciarSesion(event) {
        event.preventDefault();  //No hagas el comportamiento automático del formulario; yo me encargo.

        setError("");

        try {
            const respuesta = await fetch("http://localhost:4000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    email: email,
                    contrasena: contrasena
                })
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(datos.error);
                return;
            }

            console.log("Usuario logueado:", datos.usuario);

            router.push("/inicio");

        } catch (error) {
            console.error(error);
            setError("No se pudo conectar con el servidor");
        }
    }

    return (
        <main>
            <h1>Iniciar sesión</h1>

            <form onSubmit={iniciarSesion}>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                />

                    Iniciar sesión
                <button type="submit">
                </button>

            </form>

            {error && <p>{error}</p>}
        </main>
    );
}