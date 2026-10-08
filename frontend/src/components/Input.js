export default function Input(props) {
    return (
        <input
            type={props.type}
            placeholder={props.ph}
            onChange={props.onChange}
            value={props.value}
        />
    )
}