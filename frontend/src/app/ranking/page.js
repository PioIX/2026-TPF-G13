"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import "./ranking.css";
import { API_BASE } from "@/config";



function formatearNumero(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "0";
    return numero.toLocaleString("es-AR");
}

const SIMBOLOS_MONEDA = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF " };

function formatearPlata(valor, moneda) {
    return `${SIMBOLOS_MONEDA[moneda] || "$"}${formatearNumero(valor)}`;
}

function formatearFecha(valor) {
    if (!valor) return "—";

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;

    return fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

export default function RankingPage() {
    const router = useRouter();

    const [ranking, setRanking] = useState([]);
    const [historico, setHistorico] = useState([]);
    const [pestana, setPestana] = useState("carreras");
    const [resumen, setResumen] = useState(null);
    const [idUsuario, setIdUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelado = false;

        Promise.all([
            fetch(`${API_BASE}/ranking`, { credentials: "include" }).then(
                (respuesta) => {
                    if (!respuesta.ok) {
                        return respuesta.json().then((datos) => {
                            throw new Error(datos.error || "No se pudo cargar el ranking");
                        });
                    }
                    return respuesta.json();
                }
            ),
            fetch(`${API_BASE}/ranking/mi-resumen`, {
                credentials: "include"
            }).then((respuesta) => (respuesta.ok ? respuesta.json() : {})),
            fetch(`${API_BASE}/ranking/historico`, {
                credentials: "include"
            })
                .then((respuesta) =>
                    respuesta.ok ? respuesta.json() : { historico: [] }
                )
        ])
            .then(([datosRanking, datosResumen, datosHistorico]) => {
                if (cancelado) return;

                setRanking(datosRanking.ranking ?? []);
                setIdUsuario(Number(datosRanking.idUsuario));
                setResumen(datosResumen);
                setHistorico(datosHistorico.historico ?? []);
            })
            .catch((error) => {
                if (cancelado) return;
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                if (cancelado) return;
                setCargando(false);
            });

        return () => {
            cancelado = true;
        };
    }, []);

    if (cargando) {
        return <p className="game-state">Cargando ranking...</p>;
    }

    if (error) {
        return (
            <main className="ranking-page">
                <section className="ranking-panel ranking-panel--solo">
                    <p className="ranking-error">{error}</p>
                    <Button
                        type="button"
                        text="Volver al inicio"
                        onClick={() => router.push("/inicio")}
                    />
                </section>
            </main>
        );
    }

    return (
        <main className="ranking-page">
            <section className="ranking-panel">
                <header className="ranking-encabezado">
                    <div>
                        <p className="ranking-etiqueta">HISTORIAL DE LEYENDAS</p>
                        <h1 className="ranking-titulo">Ranking</h1>
                        <p className="ranking-subtitulo">
                            Las mejores carreras terminadas de El Trayecto.
                        </p>
                    </div>

                    <div className="ranking-acciones-encabezado">
                        <Button
                            type="button"
                            text="Volver al inicio"
                            onClick={() => router.push("/inicio")}
                        />
                    </div>
                </header>

                {resumen && (
                    <div className="ranking-resumen">
                        {[
                            ["Carreras", resumen.carreras],
                            ["Victorias", resumen.victorias],
                            ["Mejor puntaje", resumen.mejor_puntaje],
                            ["Mejor GRL", resumen.mejor_grl],
                            ["Goles", resumen.goles_totales],
                            ["Asistencias", resumen.asistencias_totales]
                        ].map(([etiqueta, valor]) => (
                            <div key={etiqueta} className="ranking-resumen-dato">
                                <span>{etiqueta}</span>
                                <strong>{formatearNumero(valor)}</strong>
                            </div>
                        ))}
                    </div>
                )}

                <div className="ranking-pestanas">
                    <button
                        type="button"
                        className={`ranking-pestana ${pestana === "carreras" ? "ranking-pestana--activa" : ""}`}
                        onClick={() => setPestana("carreras")}
                    >
                        Mejores carreras
                    </button>
                    <button
                        type="button"
                        className={`ranking-pestana ${pestana === "historico" ? "ranking-pestana--activa" : ""}`}
                        onClick={() => setPestana("historico")}
                    >
                        Histórico de jugadores
                    </button>
                </div>

                {pestana === "carreras" && (
                <div className="ranking-tabla-contenedor">
                    <table className="ranking-tabla">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Leyenda</th>
                                <th>Jugador</th>
                                <th>Club</th>
                                <th>Puntaje</th>
                                <th>GRL máx.</th>
                                <th>Goles</th>
                                <th>Asist.</th>
                                <th>Fama</th>
                                <th>Plata</th>
                                <th>Idolatría</th>
                                <th>Partida</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranking.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="ranking-tabla-vacia">
                                        Todavía no hay carreras terminadas.
                                    </td>
                                </tr>
                            )}

                            {ranking.map((fila) => {
                                const esMia = Number(fila.id_usuario) === idUsuario;

                                return (
                                    <tr
                                        key={fila.id_participante}
                                        className={esMia ? "ranking-fila--mia" : ""}
                                    >
                                        <td className="ranking-puesto">
                                            {fila.puesto}
                                            {fila.gano && (
                                                <span
                                                    className="ranking-copa"
                                                    title="Ganó la partida"
                                                    aria-label="Ganó la partida"
                                                >
                                                    🏆
                                                </span>
                                            )}
                                        </td>
                                        <td>{fila.nombre_leyenda || "—"}</td>
                                        <td>
                                            {fila.nombre_usuario}
                                            {esMia && (
                                                <span className="ranking-chip">Vos</span>
                                            )}
                                        </td>
                                        <td>{fila.nombre_club || "Sin club"}</td>
                                        <td className="ranking-puntaje">
                                            {formatearNumero(fila.puntaje)}
                                        </td>
                                        <td>{formatearNumero(fila.grl_maxima)}</td>
                                        <td>{formatearNumero(fila.goles)}</td>
                                        <td>{formatearNumero(fila.asistencias)}</td>
                                        <td>{formatearNumero(fila.fama)}</td>
                                        <td>{formatearPlata(fila.plata, fila.moneda)}</td>
                                        <td>{formatearNumero(fila.idolatria)}</td>
                                        <td>
                                            {fila.nombre_sala}
                                            <span className="ranking-fecha">
                                                {formatearFecha(fila.fecha_fin)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                )}

                {pestana === "historico" && (
                <div className="ranking-tabla-contenedor">
                    <table className="ranking-tabla">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Jugador</th>
                                <th>Carreras</th>
                                <th>Victorias</th>
                                <th>Goles</th>
                                <th>Asist.</th>
                                <th>Mejor GRL</th>
                                <th>Mejor puntaje</th>
                                <th>Títulos</th>
                                <th>Títulos club</th>
                                <th>Internac.</th>
                                <th>Individuales</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historico.length === 0 && (
                                <tr>
                                    <td colSpan={12} className="ranking-tabla-vacia">
                                        Todavía no hay jugadores con carreras terminadas.
                                    </td>
                                </tr>
                            )}

                            {historico.map((fila) => {
                                const esMio = Number(fila.id_usuario) === idUsuario;

                                return (
                                    <tr
                                        key={fila.id_usuario}
                                        className={esMio ? "ranking-fila--mia" : ""}
                                    >
                                        <td className="ranking-puesto">{fila.puesto}</td>
                                        <td>
                                            {fila.nombre_usuario}
                                            {esMio && (
                                                <span className="ranking-chip">Vos</span>
                                            )}
                                        </td>
                                        <td>{formatearNumero(fila.carreras)}</td>
                                        <td>{formatearNumero(fila.victorias)}</td>
                                        <td>{formatearNumero(fila.goles)}</td>
                                        <td>{formatearNumero(fila.asistencias)}</td>
                                        <td>{formatearNumero(fila.mejor_grl)}</td>
                                        <td>{formatearNumero(fila.mejor_puntaje)}</td>
                                        <td className="ranking-puntaje">
                                            🏆 {formatearNumero(fila.titulos_totales)}
                                        </td>
                                        <td>{formatearNumero(fila.titulos_colectivos)}</td>
                                        <td>{formatearNumero(fila.titulos_internacionales)}</td>
                                        <td>{formatearNumero(fila.titulos_individuales)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                )}

            </section>
        </main>
    );
}
