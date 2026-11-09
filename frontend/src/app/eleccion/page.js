
"use client";
import { API_BASE } from "@/config";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";
import Button from "@/components/Button";
import Input from "@/components/Input";

export default function EleccionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const { socket, isConnected } = useSocket(
        { withCredentials: true },
        `${API_BASE}`
    );

    const [ligas, setLigas] = useState([]);
    const [clubes, setClubes] = useState([]);
    const [selecciones, setSelecciones] = useState([]);
    const [jugadores, setJugadores] = useState([]);

    const [ligaSeleccionada, setLigaSeleccionada] = useState("");
    const [idClub, setIdClub] = useState("");
    const [idSeleccion, setIdSeleccion] = useState("");
    const [nombreLeyenda, setNombreLeyenda] = useState("");

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    useEffect(() => {
        Promise.all([
            fetch(`${API_BASE}/ligas`, {
                credentials: "include"
            }).then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar las ligas");
                }
                return respuesta.json();
            }),

            fetch(`${API_BASE}/clubes`, {
                credentials: "include"
            }).then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar los clubes");
                }
                return respuesta.json();
            }),

            fetch(`${API_BASE}/selecciones`, {
                credentials: "include"
            }).then((respuesta) => {
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar las selecciones");
                }
                return respuesta.json();
            })
        ])
            .then(([datosLigas, datosClubes, datosSelecciones]) => {
                setLigas(datosLigas);
                setClubes(datosClubes);
                setSelecciones(datosSelecciones);
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

        fetch(`${API_BASE}/partidas/${idPartida}/eleccion`, {
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(
                            datos.error || "No se pudo consultar la elección"
                        );
                    });
                }

                return respuesta.json();
            })
            .then((datos) => {
                setJugadores(datos.jugadores);

                // Buscar la elección del usuario de esta sesión.
                const miEleccion = datos.jugadores.find(
                    (jugador) =>
                        Number(jugador.id_usuario) === Number(datos.idUsuario)
                );

                if (miEleccion) {
                    if (miEleccion.id_club != null) {
                        setIdClub(String(miEleccion.id_club));

                        const clubElegido = clubes.find(
                            (club) =>
                                Number(club.id_club) ===
                                Number(miEleccion.id_club)
                        );

                        if (clubElegido) {
                            setLigaSeleccionada(clubElegido.liga);
                        }
                    }

                    if (miEleccion.nombre_leyenda) {
                        setNombreLeyenda(miEleccion.nombre_leyenda);
                    }

                    if (miEleccion.id_seleccion != null) {
                        setIdSeleccion(String(miEleccion.id_seleccion));
                    }
                }

                if (datos.ambosConfirmaron) {
                    setMensaje(
                        "Ambos jugadores confirmaron su elección."
                    );
                }
            })
            .catch((error) => {
                console.error("Error al consultar la elección:", error);
                setError(error.message);
            });
    }, [idPartida, clubes]);


    useEffect(() => {
        if (!socket || !idPartida || !isConnected) return;

        function actualizarElecciones(estado) {
            if (Number(estado.idPartida) !== Number(idPartida)) return;

            setJugadores(estado.jugadores);

            if (estado.ambosConfirmaron) {
                setMensaje("¡Ambos jugadores confirmaron! Entrando a la partida...");
            }
        }

        function iniciarPartida(datos) {
            if (Number(datos.idPartida) !== Number(idPartida)) return;

            router.replace(`/partida?id_partida=${idPartida}`);
        }

        socket.emit("joinRoom", {
            idPartida: Number(idPartida)
        });

        socket.on("eleccionesActualizadas", actualizarElecciones);
        socket.on("eleccionCompleta", iniciarPartida);

        return () => {
            socket.off("eleccionesActualizadas", actualizarElecciones);
            socket.off("eleccionCompleta", iniciarPartida);
        };
    }, [socket, isConnected, idPartida, router]);



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

        if (!idSeleccion) {
            setError("Elegí la nacionalidad de tu leyenda");
            return;
        }

        setGuardando(true);

        fetch(`${API_BASE}/partidas/${idPartida}/eleccion`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                id_club: Number(idClub),
                id_seleccion: Number(idSeleccion),
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

                return fetch(`${API_BASE}/partidas/${idPartida}/eleccion`,
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

                if (datos.ambosConfirmaron) {
                    setMensaje("¡Ambos jugadores confirmaron! Ya pueden comenzar.");
                }
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
        return <p className="game-state">Cargando ligas y clubes...</p>;
    }

    return (
        <main className="game-page game-page--eleccion">
            <h1>El Trayecto</h1>
            <h2>Elegí tu club y creá tu leyenda</h2>

            {error && <p>{error}</p>}

            <form className="game-form" onSubmit={confirmarEleccion}>
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

                <label htmlFor="nacionalidad">Nacionalidad</label>
                <select
                    id="nacionalidad"
                    value={idSeleccion}
                    onChange={(event) => setIdSeleccion(event.target.value)}
                >
                    <option value="">Seleccioná tu nacionalidad</option>
                    {selecciones.map((seleccion) => (
                        <option key={seleccion.id_seleccion} value={seleccion.id_seleccion}>
                            {seleccion.nombre}
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
