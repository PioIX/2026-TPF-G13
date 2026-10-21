export default function Evento(props) {
    const evento = props.evento;

    if (!evento) {
        return null;
    }

    return (
        <section className="evento">
            <h2>{evento.nombre}</h2>

            <p>{evento.descripcion}</p>

            <p>
                Categoría: {evento.categoria}
            </p>

            {props.children}
        </section>
    );
}
