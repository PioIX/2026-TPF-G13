export default function ChatItem({ chat }) {
  return (
    <div className="chat-item">
      <img
        className="chat-item-foto"
        src={chat.foto || chat.imagen_contacto || "/foto-default.jpg"}
        alt="Foto del chat"
      />

      <div className="chat-item-info">
        <h3>{chat.nombre_contacto || chat.nombre}</h3>
        <p>{chat.nombre === "Chat individual" ? "Chat individual" : "Grupo"}</p>
      </div>
    </div>
  );
}


