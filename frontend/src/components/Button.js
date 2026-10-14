
export default function Button(props) {
    return (
        <button
            type={props.type}
            onClick={props.onClick}
            disabled={props.disabled}  //para deshabilitar
        >
            {props.text}
        </button>
    );
}
