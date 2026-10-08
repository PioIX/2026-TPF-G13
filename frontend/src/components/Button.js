export default function Button(props) {
    return (
        <button
            type={props.type}
            onClick={props.onClick}
        >
            {props.text}
        </button>
    )
}