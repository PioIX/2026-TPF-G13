"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";

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
        <main>

            <h1>Iniciar sesión</h1>

            <form onSubmit={iniciarSesion}>

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
                    text="Iniciar sesión"
                />

            </form>

            {error && <p>{error}</p>}

        </main>
    );
}