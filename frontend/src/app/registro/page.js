"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function RegistroPage() {

    const router = useRouter();

    const [nombreUsuario, setNombreUsuario] = useState("");
    const [email, setEmail] = useState("");
    const [contrasena, setContrasena] = useState("");
    const [error, setError] = useState("");


    function registrarse(event) {
        event.preventDefault(); // Evita que el formulario recargue la página automáticamente

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

                router.push("/login");

            })
            .catch((error) => {

                console.error(error);
                setError("No se pudo conectar con el servidor");

            });
    }


    return (
        <main>

            <h1>Crear cuenta</h1>

            <form onSubmit={registrarse}>

                <Input
                    type="text"
                    ph="Nombre de usuario"
                    value={nombreUsuario}
                    onChange={(event) => setNombreUsuario(event.target.value)}
                />

                <Input
                    type="email"
                    ph="Email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                />

                <Input
                    type="password"
                    ph="Contraseña"
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                />

                <Button
                    type="submit"
                    text="Registrarse"
                />

            </form>

            {error && <p>{error}</p>}

        </main>
    );
}