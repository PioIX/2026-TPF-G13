"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegistroPage() {

    const router = useRouter();

    const [nombreUsuario, setNombreUsuario] = useState("");
    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");

    async function registrarse(event) {

        //event.preventDefault();

        setError("");

        try {

            const respuesta = await fetch("http://localhost:4000/registro", {
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
            });

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                setError(datos.error);
                return;
            }

            // Si el registro salió bien, vamos al login
            router.push("/login");

        } catch (error) {

            console.error(error);
            setError("No se pudo conectar con el servidor");

        }
    }

    return (
        <main>

            <h1>Crear cuenta</h1>

            <form onSubmit={registrarse}>

                <input
                    type="text"
                    placeholder="Nombre de usuario"
                    value={nombreUsuario}
                    onChange={(event) => setNombreUsuario(event.target.value)}
                />

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

                <button type="submit">
                    Registrarse
                </button>

            </form>

            {error && <p>{error}</p>}

        </main>
    );
}