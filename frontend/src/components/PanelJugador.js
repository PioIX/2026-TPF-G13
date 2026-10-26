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

            <p>Usuario: {jugador.nombre_usuario}</p>
            <p>Club: {jugador.nombre_club ?? "Sin club"}</p>
            <p>Liga: {jugador.liga ?? "Sin liga"}</p>
            <p>GRL: {jugador.grl ?? "--"}</p>

            <p>Posición: {jugador.posicion_actual}</p>

            <p>Fama: {jugador.fama ?? 0}</p>
            <p>Plata: {jugador.plata ?? 0}</p>
            <p>Idolatría: {jugador.idolatria ?? 0}</p>

            <p>Goles: {jugador.goles}</p>
            <p>Asistencias: {jugador.asistencias}</p>
            <p>Puntos de campeón: {jugador.puntos_campeon}</p>
            <p>Título: {jugador.nombre_titulo ?? "Ninguno"}</p>

            {Number(jugador.turnos_pendientes_perdidos) > 0 && (
                <p>
                    Turnos pendientes de perder:{" "}
                    {jugador.turnos_pendientes_perdidos}
                </p>
            )}
        </section>
    );
}
