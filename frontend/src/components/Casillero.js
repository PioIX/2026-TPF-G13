export default function Casillero(props) {
    return (
        <div
            className={`casillero ${props.activo ? "activo" : ""}`}
        >
            <span className="numero-casillero">
                {props.numero}
            </span>

            <span className="temporada-casillero">
                T.{props.temporada}
            </span>
        </div>
    );
}
