const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

const sessionMiddleware = session({
  secret: "supersarasa",
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

const server = app.listen(PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${PORT}/`);
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

const mysql = require("./modulos/mysql");

//CONEXION SOCKET

io.on("connection", (socket) => { // Se ejecuta cuando un cliente se conecta

  const req = socket.request;

  // ENTRAR A UNA SALA
  socket.on("joinRoom", (data) => {

    // Si ya estaba en otra sala, sale de esa sala
    if (req.session.room != undefined && req.session.room.length > 0) {
      socket.leave(req.session.room);
    }

    // Guardamos la sala actual
    req.session.room = data.room;

    // Entramos a la nueva sala
    socket.join(req.session.room);

    console.log("Usuario entró a la sala:", req.session.room);

    // Avisamos a los usuarios de la sala
    io.to(req.session.room).emit("chat-messages", {
      user: req.session.usuario,
      room: req.session.room
    });
  });


  // ENVIAR MENSAJE
  socket.on("sendMessage", async (data) => {

    try {
      // Obtenemos el chat actual
      const id_chat = req.session.room;

      // Obtenemos el usuario de la sesión
      const id_usuario = req.session.usuario.id_usuario;

      // Obtenemos el contenido enviado
      const contenido = data.message;

      // Guardamos el mensaje en la base de datos
      await mysql.realizarQuery(
        `INSERT INTO Mensajes (id_chat, id_usuario, contenido)
         VALUES (${id_chat}, ${id_usuario}, '${contenido}')`
      );

      // Mandamos el mensaje a todos los usuarios de esa sala
      io.to(req.session.room).emit("newMessage", {
        id_chat: id_chat,
        id_usuario: id_usuario,
        contenido: contenido
      });

    } catch (error) {

      console.error("Error al enviar mensaje:", error);

    }
  });

  // DESCONECTARSE
  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });

});




