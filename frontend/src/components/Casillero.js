export default function Casillero(props) {
    const jugadores = [
        {
            id: 1,
            nombre: "J1",
            estaAqui: props.posicionJugador1 === props.numero
        },
        {
            id: 2,
            nombre: "J2",
            estaAqui: props.posicionJugador2 === props.numero
        }
    ];

    return (
        <div className={`casillero ${
            jugadores.some(jugador => jugador.estaAqui)
                ? "activo"
                : ""
        }`}>
            <span className="numero-casillero">
                {props.numero}
            </span>

            <span className="temporada-casillero">
                Temporada {props.temporada}
            </span>

            <div className="fichas-casillero">
                {jugadores
                    .filter(jugador => jugador.estaAqui)
                    .map(jugador => (
                        <span
                            key={jugador.id}
                            className={`ficha-jugador ficha-jugador-${jugador.id}`}
                        >
                            {jugador.nombre}
                        </span>
                    ))}
            </div>
        </div>
    );
}
