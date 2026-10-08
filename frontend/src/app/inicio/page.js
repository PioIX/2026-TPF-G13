"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function InicioPage() {

    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [nombreSala, setNombreSala] = useState("");
    const [mensajeSala, setMensajeSala] = useState("");

    const router = useRouter();

    useEffect(() => {
        function obtenerUsuario() {

            fetch("http://localhost:4000/usuario", {
                method: "GET",
                credentials: "include"
            })
                .then((respuesta) => {

                    if (!respuesta.ok) {
                        return respuesta.json().then((datos) => {
                            throw new Error(datos.error);
                        });
                    }

                    return respuesta.json();
                })
                .then((datos) => {
                    setUsuario(datos);
                })
                .catch((error) => {
                    console.error(error);
                    setError(error.message);
                })
                .finally(() => {
                    setCargando(false);
                });
        }

        obtenerUsuario();
    }, []);


    function cerrarSesion() {

        fetch("http://localhost:4000/logout", {
            method: "POST",
            credentials: "include"
        })
            .then((respuesta) => {

                if (respuesta.ok) {
                    router.push("/login");
                }

            })
            .catch((error) => {
                console.error(error);
            });
    }


    function entrarASala(event) {

        event.preventDefault(); //Evita que el formulario recargue la página automáticamente

        setMensajeSala("");

        fetch("http://localhost:4000/salas/entrar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                nombre_sala: nombreSala
            })
        })
            .then((respuesta) => respuesta.json())
            .then((datos) => {

                if (!datos) {
                    setMensajeSala("No se pudo obtener una respuesta del servidor");
                    return;
                }

                if (datos.error) {
                    setMensajeSala(datos.error);
                    return;
                }

                console.log("Partida:", datos.id_partida);

                router.push(`/lobby?id_partida=${datos.id_partida}`);

            })
            .catch((error) => {
                console.error(error);
                setMensajeSala("No se pudo conectar con el servidor");
            });
    }


    if (cargando) {
        return <p>Cargando...</p>;
    }

    if (error) {
        return <p>{error}</p>;
    }

    return (
        <main>

            <h1>El Trayecto</h1>

            <h2>Bienvenido, {usuario.nombre_usuario}</h2>

            <p>Email: {usuario.email}</p>
            <p>Rol: {usuario.rol}</p>

            <Button
                type="button"
                text="Crear partida"
            />

            <Button
                type="button"
                text="Unirse a partida"
            />

            <Button
                type="button"
                text="Historial"
            />

            <Button
                type="button"
                text="Cerrar sesión"
                onClick={cerrarSesion}
            />

            <form onSubmit={entrarASala}>

                <Input
                    type="text"
                    ph="Nombre de la sala"
                    value={nombreSala}
                    onChange={(event) => setNombreSala(event.target.value)}
                />

                <Button
                    type="submit"
                    text="Entrar a sala"
                />

            </form>

            {mensajeSala && <p>{mensajeSala}</p>}

        </main>
    );
}