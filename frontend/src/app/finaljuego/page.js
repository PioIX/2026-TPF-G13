"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import "./finaljuego.css";

import { API_URL } from "@/config";

const API_BASE = API_URL;

// Ritmo del suspenso: cada paso espera lo indicado antes de mostrarse.
// Se usan tiempos distintos para que la secuencia no se sienta mecánica.
const TIEMPOS = {
    intro: 1400,
    estadistica: 900,
    pausaAntesDelVeredicto: 1600,
    veredicto: 1200,
    rival: 1500,
    detalle: 700
};

// Estadísticas que se revelan una por una, con su etiqueta y formato.
// La plata usa la moneda de la carrera (se pasa en tiempo de render).
const SIMBOLOS_MONEDA = { USD: "$", EUR: "€", GBP: "£", CHF: "CHF " };

const ESTADISTICAS = [
    { clave: "plata", etiqueta: "Plata", esPlata: true },
    { clave: "fama", etiqueta: "Fama" },
    { clave: "idolatria", etiqueta: "Idolatría" },
    { clave: "grl_maxima", etiqueta: "GRL máxima" }
];

// Estadísticas completas que se muestran al final, para los dos.
const DETALLE = [
    { clave: "goles", etiqueta: "Goles" },
    { clave: "asistencias", etiqueta: "Asistencias" },
    { clave: "partidos_jugados", etiqueta: "Partidos jugados" },
    { clave: "grl", etiqueta: "GRL final" },
    { clave: "grl_maxima", etiqueta: "GRL máxima" },
    { clave: "fama", etiqueta: "Fama" },
    { clave: "plata", etiqueta: "Plata", esPlata: true },
    { clave: "idolatria", etiqueta: "Idolatría" },
    { clave: "puntaje", etiqueta: "Puntaje" }
];

function formatearNumero(valor) {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return "0";
    return numero.toLocaleString("es-AR");
}

function formatearPlata(valor, moneda) {
    return `${SIMBOLOS_MONEDA[moneda] || "$"}${formatearNumero(valor)}`;
}

export default function FinalJuegoPage() {
    // useSearchParams necesita un límite de Suspense para el prerender.
    return (
        <Suspense fallback={<p className="game-state">Cerrando la carrera...</p>}>
            <ContenidoFinal />
        </Suspense>
    );
}

function ContenidoFinal() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const idPartida = searchParams.get("id_partida");

    const [resultado, setResultado] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    // Paso de la secuencia de revelado. Cada paso suma un elemento.
    const [paso, setPaso] = useState(0);

    const temporizadoresRef = useRef([]);

    useEffect(() => {
        if (!idPartida) {
            setError("No se encontró el identificador de la partida.");
            setCargando(false);
            return;
        }

        let cancelado = false;

        fetch(`${API_BASE}/partidas/${idPartida}/final`, {
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error || "No se pudo cargar el resultado");
                    });
                }
                return respuesta.json();
            })
            .then((datos) => {
                if (cancelado) return;
                setResultado(datos);
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
    }, [idPartida]);

    // Arranca la secuencia de revelado cuando llegan los datos.
    useEffect(() => {
        if (!resultado) return;

        const pasos = [
            TIEMPOS.intro,
            ...ESTADISTICAS.map(() => TIEMPOS.estadistica),
            TIEMPOS.pausaAntesDelVeredicto,
            TIEMPOS.veredicto,
            TIEMPOS.rival,
            ...DETALLE.map(() => TIEMPOS.detalle)
        ];

        let acumulado = 0;

        pasos.forEach((espera, indice) => {
            acumulado += espera;
            const id = setTimeout(() => setPaso(indice + 1), acumulado);
            temporizadoresRef.current.push(id);
        });

        return () => {
            temporizadoresRef.current.forEach(clearTimeout);
            temporizadoresRef.current = [];
        };
    }, [resultado]);

    if (cargando) {
        return <p className="game-state">Cerrando la carrera...</p>;
    }

    if (error) {
        return (
            <main className="final-page">
                <section className="final-panel final-panel--error">
                    <p className="final-error">{error}</p>
                    <Button
                        type="button"
                        text="Volver al inicio"
                        onClick={() => router.push("/inicio")}
                    />
                </section>
            </main>
        );
    }

    const jugadores = resultado?.jugadores ?? [];
    const yo = jugadores.find(
        (jugador) => Number(jugador.id_usuario) === Number(resultado.idUsuario)
    );
    const rival = jugadores.find(
        (jugador) => Number(jugador.id_usuario) !== Number(resultado.idUsuario)
    );

    if (!yo) {
        return (
            <main className="final-page">
                <section className="final-panel final-panel--error">
                    <p className="final-error">
                        No encontramos tus estadísticas en esta partida.
                    </p>
                    <Button
                        type="button"
                        text="Volver al inicio"
                        onClick={() => router.push("/inicio")}
                    />
                </section>
            </main>
        );
    }

    // Índices de los pasos dentro de la secuencia.
    const pasoIntro = 1;
    const primerPasoEstadistica = 2;
    const ultimoPasoEstadistica = primerPasoEstadistica + ESTADISTICAS.length - 1;
    const pasoVeredicto = ultimoPasoEstadistica + 1;
    const pasoRival = pasoVeredicto + 1;
    const primerPasoDetalle = pasoRival + 1;

    const verIntro = paso >= pasoIntro;
    const verVeredicto = paso >= pasoVeredicto;
    const verRival = paso >= pasoRival;

    const gane = Boolean(yo.gano);

    return (
        <main className="final-page">
            <section className="final-panel">
                <p className="final-etiqueta">FIN DE LA CARRERA</p>

                <h1 className="final-titulo">El Trayecto</h1>

                <p className="final-leyenda">
                    {yo.nombre_leyenda || yo.nombre_usuario}
                    {yo.nombre_club ? ` · ${yo.nombre_club}` : ""}
                </p>

                <div className="final-separador">
                    <span />
                    <span className="final-estrella">✦</span>
                    <span />
                </div>

                {/* 1. Introducción: la carrera terminó. */}
                <p className={`final-intro${verIntro ? " final-visible" : ""}`}>
                    Veinte temporadas. Una sola leyenda.
                </p>

                {/* 2. Estadísticas propias, una por una. */}
                <ul className="final-stats">
                    {ESTADISTICAS.map((estadistica, indice) => {
                        const visible = paso >= primerPasoEstadistica + indice;
                        const valor = estadistica.esPlata
                            ? formatearPlata(yo[estadistica.clave], yo.moneda)
                            : estadistica.formato
                                ? estadistica.formato(yo[estadistica.clave])
                                : formatearNumero(yo[estadistica.clave]);

                        return (
                            <li
                                key={estadistica.clave}
                                className={`final-stat${visible ? " final-visible" : ""}`}
                            >
                                <span className="final-stat-etiqueta">
                                    {estadistica.etiqueta}
                                </span>
                                <strong className="final-stat-valor">{valor}</strong>
                            </li>
                        );
                    })}
                </ul>

                {/* 3. Veredicto: recién acá se sabe quién ganó. */}
                <div
                    className={`final-veredicto${verVeredicto ? " final-visible" : ""}${gane ? " final-veredicto--gana" : " final-veredicto--pierde"
                        }`}
                >
                    <h2>{gane ? "¡Ganaste!" : "Perdiste"}</h2>
                    <p>
                        {gane
                            ? "Tu carrera quedó en la historia como la mejor de la partida."
                            : `Esta vez la leyenda fue ${rival?.nombre_leyenda || rival?.nombre_usuario || "tu rival"}.`}
                    </p>
                </div>

                {/* 4. Comparación con el rival. */}
                {rival && (
                    <div className={`final-rival${verRival ? " final-visible" : ""}`}>
                        <p className="final-rival-titulo">Tu rival</p>
                        <p className="final-rival-nombre">
                            {rival.nombre_leyenda || rival.nombre_usuario}
                            {rival.nombre_club ? ` · ${rival.nombre_club}` : ""}
                        </p>
                        <p className="final-rival-puntaje">
                            {formatearNumero(rival.puntaje)} pts
                            <span> · </span>
                            {formatearNumero(yo.puntaje)} pts tuyos
                        </p>
                    </div>
                )}

                {/* 5. Todas las estadísticas finales, de a una. */}
                <div className="final-detalle">
                    <h2 className="final-detalle-titulo">Estadísticas finales</h2>

                    <div className="final-detalle-columnas">
                        {[yo, rival].filter(Boolean).map((jugador) => (
                            <div
                                key={jugador.id_participante}
                                className={`final-detalle-columna${Number(jugador.id_usuario) === Number(resultado.idUsuario)
                                        ? " final-detalle-columna--yo"
                                        : ""
                                    }`}
                            >
                                <h3>
                                    {Number(jugador.id_usuario) === Number(resultado.idUsuario)
                                        ? "Vos"
                                        : jugador.nombre_usuario}
                                </h3>

                                <dl>
                                    {DETALLE.map((dato, indice) => {
                                        const visible = paso >= primerPasoDetalle + indice;
                                        const valor = dato.esPlata
                                            ? formatearPlata(jugador[dato.clave], jugador.moneda)
                                            : dato.formato
                                                ? dato.formato(jugador[dato.clave])
                                                : formatearNumero(jugador[dato.clave]);

                                        return (
                                            <div
                                                key={dato.clave}
                                                className={`final-detalle-fila${visible ? " final-visible" : ""
                                                    }`}
                                            >
                                                <dt>{dato.etiqueta}</dt>
                                                <dd>{valor}</dd>
                                            </div>
                                        );
                                    })}
                                </dl>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 6. Salidas: menú o ranking. */}
                <div className="final-acciones">
                    <Button
                        type="button"
                        text="Volver al menú"
                        onClick={() => router.push("/inicio")}
                    />
                    <Button
                        type="button"
                        text="Ver ranking"
                        onClick={() => router.push("/ranking")}
                    />
                </div>
            </section>
        </main>
    );
}
