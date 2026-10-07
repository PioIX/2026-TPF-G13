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

//PEDIDOS 
// OBTENER TODOS LOS CLUBES
app.get("/clubes", async (req, res) => {
  try {
    const clubes = await mysql.realizarQuery("SELECT * FROM Club");

    res.status(200).json(clubes);
  } catch (error) {
    console.error("Error al obtener los clubes:", error);
    res.status(500).json({
      error: "Error al obtener los clubes"
    });
  }
});

//
// REGISTRO DE USUARIO
app.post("/registro", async (req, res) => {
  try {
    const { nombre_usuario, email, contrasena } = req.body;

    // Verificamos que estén todos los datos
    if (!nombre_usuario || !email || !contrasena) {
      return res.status(400).json({
        error: "Faltan datos"
      });
    }

    // Verificamos si ya existe un usuario con ese email
    const usuarioExistente = await mysql.realizarQuery(
      `SELECT * FROM Usuario WHERE email = '${email}'`
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        error: "El email ya está registrado"
      });
    }

    // Insertamos el nuevo usuario
    await mysql.realizarQuery(
      `INSERT INTO Usuario (nombre_usuario, email, contrasena)
       VALUES ('${nombre_usuario}', '${email}', '${contrasena}')`
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente"
    });

  } catch (error) {
    console.error("Error al registrar usuario:", error);

    res.status(500).json({
      error: "Error al registrar usuario"
    });
  }
});

//
// LOGIN DE USUARIO
app.post("/login", async (req, res) => {
  try {
    const { email, contrasena } = req.body;

    // Verificamos que estén todos los datos
    if (!email || !contrasena) {
      return res.status(400).json({
        error: "Faltan datos"
      });
    }

    // Buscamos el usuario por email
    const usuarios = await mysql.realizarQuery(
      `SELECT * FROM Usuario WHERE email = '${email}'`
    );

    // Si no existe
    if (usuarios.length === 0) {
      return res.status(401).json({
        error: "Email o contraseña incorrectos"
      });
    }

    const usuario = usuarios[0];

    // Comparamos la contraseña
    if (usuario.contrasena !== contrasena) {
      return res.status(401).json({
        error: "Email o contraseña incorrectos"
      });
    }

    // Guardamos el usuario en la sesión
    req.session.usuario = {
      id_usuario: usuario.id_usuario,
      nombre_usuario: usuario.nombre_usuario,
      email: usuario.email,
      rol: usuario.rol
    };

    res.status(200).json({
      mensaje: "Login correcto",
      usuario: req.session.usuario
    });

  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    res.status(500).json({
      error: "Error al iniciar sesión"
    });
  }
});

app.get("/usuario", (req, res) => {

  // Verificamos si hay un usuario guardado en la sesión
  if (!req.session.usuario) {
    return res.status(401).json({
      error: "No hay una sesión iniciada"
    });
  }

  // Devolvemos los datos del usuario
  res.status(200).json(req.session.usuario);
});

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

  // DESCONECTARSE
  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });

});




