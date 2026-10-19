
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function EleccionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const [ligas, setLigas] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [jugadores, setJugadores] = useState([]);

    const [ligaSeleccionada, setLigaSeleccionada] = useState("");
    const [idClub, setIdClub] = useState("");
    const [nombreLeyenda, setNombreLeyenda] = useState("");

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        Promise.all([
            fetch("http://localhost:4000/ligas", {
                credentials: "include"
            }).then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar las ligas");
                }
                return respuesta.json();
            }),

            fetch("http://localhost:4000/clubes", {
                credentials: "include"
            }).then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar los clubes");
                }
                return respuesta.json();
            })
        ])
            .then(([datosLigas, datosClubes]) => {
                setLigas(datosLigas);
                setClubes(datosClubes);
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                setCargando(false);
            });
    }, []);

    useEffect(() => {
        if (!idPartida) {
            setError("No se encontró el identificador de la partida");
            return;
        }

        fetch(`http://localhost:4000/partidas/${idPartida}/eleccion`, {
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error || "No se pudo consultar la elección");
                    });
                }
                return respuesta.json();
            })
            .then((datos) => {
                setJugadores(datos.jugadores);

                const miEleccion = datos.jugadores.find(
                    (jugador) => jugador.id_club !== null &&
                        jugador.id_club !== undefined
                );

                // La elección personal se completará al identificar
                // al usuario de la sesión.
                if (datos.ambosConfirmaron) {
                    setMensaje("Ambos jugadores confirmaron su elección.");
                }
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }, [idPartida]);

    const clubesDeLaLiga = clubes.filter(
        (club) => club.liga === ligaSeleccionada
    );

    function cambiarLiga(event) {
        setLigaSeleccionada(event.target.value);
        setIdClub("");
    }

    function confirmarEleccion(event) {
        event.preventDefault();

        setError("");
        setMensaje("");

        if (!idPartida) {
            setError("No se encontró la partida");
            return;
        }

        if (!idClub) {
            setError("Elegí un club antes de continuar");
            return;
        }

        if (!nombreLeyenda.trim()) {
            setError("Escribí el nombre de tu leyenda");
            return;
        }

        setGuardando(true);

        fetch(`http://localhost:4000/partidas/${idPartida}/eleccion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                id_club: Number(idClub),
                nombre_leyenda: nombreLeyenda.trim()
            })
        })
            .then((respuesta) => {
                return respuesta.json().then((datos) => {
                    if (!respuesta.ok) {
                        throw new Error(datos.error || "No se pudo guardar la elección");
                    }
                    return datos;
                });
            })
            .then((datos) => {
                setMensaje(
                    datos.ambosConfirmaron
                        ? "¡Ambos jugadores confirmaron! Ya pueden comenzar."
                        : "Elección confirmada. Esperando al rival..."
                );

                return fetch(
                    `http://localhost:4000/partidas/${idPartida}/eleccion`,
                    { credentials: "include" }
                );
            })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudo actualizar el estado de la elección");
                }
                return respuesta.json();
            })
            .then((datos) => {
                setJugadores(datos.jugadores);
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                setGuardando(false);
            });
    }

    if (cargando) {
        return <p>Cargando ligas y clubes...</p>;
    }

    return (
        <main>
            <h1>El Trayecto</h1>
            <h2>Elegí tu club y creá tu leyenda</h2>

            {error && <p>{error}</p>}

            <form onSubmit={confirmarEleccion}>
                <label htmlFor="liga">Liga</label>
                <select
                    id="liga"
                    value={ligaSeleccionada}
                    onChange={cambiarLiga}
                >
                    <option value="">Seleccioná una liga</option>
                    {ligas.map((liga) => (
                        <option key={liga.liga} value={liga.liga}>
                            {liga.liga}
                        </option>
                    ))}
                </select>

                <label htmlFor="club">Club</label>
                <select
                    id="club"
                    value={idClub}
                    onChange={(event) => setIdClub(event.target.value)}
                    disabled={!ligaSeleccionada}
                >
                    <option value="">Seleccioná un club</option>
                    {clubesDeLaLiga.map((club) => (
                        <option key={club.id_club} value={club.id_club}>
                            {club.nombre} — Copas internacionales: {club.copa_internacional ?? 0}
                        </option>
                    ))}
                </select>

                <label htmlFor="leyenda">Nombre de tu leyenda</label>
                <Input
                    type="text"
                    ph="Ej. El próximo Balón de Oro"
                    value={nombreLeyenda}
                    onChange={(event) => setNombreLeyenda(event.target.value)}
                />

                <Button
                    type="submit"
                    text={guardando ? "Guardando..." : "Confirmar elección"}
                    disabled={guardando}
                />
            </form>

            {mensaje && <p>{mensaje}</p>}

            <h2>Estado de los jugadores</h2>

            {jugadores.map((jugador) => (
                <p key={jugador.id_usuario}>
                    {jugador.nombre_usuario}:{" "}
                    {Number(jugador.eleccion_confirmada) === 1
                        ? "Elección confirmada"
                        : "Pendiente"}
                </p>
            ))}
        </main>
    );
}
