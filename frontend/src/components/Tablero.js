
import Casillero from "./Casillero";
import "./Tablero.css";

export default function Tablero(props) {
    const casilleros = [];

    for (let numero = 1; numero <= 20; numero++) {
        casilleros.push({
            numero: numero,
            temporada: numero
        });
    }

    // Primera fila: 1 a 10.
    const filaSuperior = casilleros.slice(0, 10);

    // Segunda fila: 20 a 11, para formar el zigzag.
    const filaInferior = casilleros.slice(10).reverse();

    function mostrarCasillero(casillero) {
        return (
            <Casillero
                key={casillero.numero}
                numero={casillero.numero}
                temporada={casillero.temporada}
                activo={props.posicionActual === casillero.numero}
            />
        );
    }

    return (
        <div className="tablero">
            <div className="fila-tablero">
                {filaSuperior.map(mostrarCasillero)}
            </div>

            <div className="fila-tablero">
                {filaInferior.map(mostrarCasillero)}
            </div>
        </div>
    );
}
