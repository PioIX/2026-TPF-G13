export default function Input(props) {
    return (
        <>
            <label>{props.text}</label>
            <input
                type={props.type}
                placeholder={props.ph}
                onChange={props.onChange}
                value={props.value}
            ></input>
        </>
    )
}