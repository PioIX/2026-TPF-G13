export default function PanelJugador(props) {
    const jugador = props.jugador;

    if (!jugador) {
        return (
            <section className="panel-jugador">
                <h2>{props.titulo}</h2>
                <p>Esperando jugador...</p>
            </section>
        );
    }

    return (
        <section className="panel-jugador">
            <h2>{props.titulo}</h2>

            <h3>{jugador.nombre_leyenda || jugador.nombre_usuario}</h3>

            <dl className="panel-jugador-datos">
                {[
                    ["Usuario", jugador.nombre_usuario ?? "--"],
                    ["Club", jugador.nombre_club ?? "Sin club"],
                    ["Liga", jugador.liga ?? "Sin liga"],
                    ["GRL", jugador.grl ?? "--"],
                    ["Posición", jugador.posicion_actual ?? 1],
                    ["Fama", jugador.fama ?? 0],
                    ["Plata", jugador.plata ?? 0],
                    ["Idolatría", jugador.idolatria ?? 0],
                    ["Goles", jugador.goles ?? 0],
                    ["Asistencias", jugador.asistencias ?? 0],
                    ["Puntos de campeón", jugador.puntos_campeon ?? 0],
                    ["Título", jugador.nombre_titulo ?? "Ninguno"]
                ].map(([etiqueta, valor]) => (
                    <div key={etiqueta}>
                        <dt>{etiqueta}</dt>
                        <dd>{valor}</dd>
                    </div>
                ))}
            </dl>

            {Number(jugador.turnos_pendientes_perdidos) > 0 && (
                <p>
                    Turnos pendientes de perder:{" "}
                    {jugador.turnos_pendientes_perdidos}
                </p>
            )}
        </section>
    );
}
