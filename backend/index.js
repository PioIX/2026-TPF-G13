const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 4000;
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
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

app.post("/salas/entrar", async (req, res) => {
  try {
    // Verificamos que haya una sesión iniciada
    if (!req.session.usuario) {
      return res.status(401).json({
        error: "Tenés que iniciar sesión"
      });
    }

    const { nombre_sala } = req.body;

    // Verificamos que hayan enviado el nombre
    if (!nombre_sala) {
      return res.status(400).json({
        error: "Falta el nombre de la sala"
      });
    }

    const idUsuario = req.session.usuario.id_usuario;

    // Buscamos si ya existe una partida con ese nombre
    const partidas = await mysql.realizarQuery(
      `SELECT * FROM Partida WHERE nombre_sala = '${nombre_sala}'`
    );

    // Si no existe, creamos la partida
    if (partidas.length === 0) {

      const idPartida = await mysql.realizarQueryInsert(
        `INSERT INTO Partida (nombre_sala, estado)
                 VALUES ('${nombre_sala}', 'esperando')`
      );

      // Agregamos al usuario como participante
      await mysql.realizarQuery(
        `INSERT INTO ParticipantePartida (id_partida, id_usuario, turno)
                 VALUES (${idPartida}, ${idUsuario}, TRUE)`
      );

      return res.status(201).json({
        mensaje: "Sala creada correctamente",
        id_partida: idPartida,
        nombre_sala: nombre_sala
      });
    }

    // Si la sala ya existe
    const partida = partidas[0];

    // Buscamos los jugadores que ya están en la partida
    const participantes = await mysql.realizarQuery(
      `SELECT * FROM ParticipantePartida
             WHERE id_partida = ${partida.id_partida}`
    );

    // Verificamos si el usuario ya está dentro
    const usuarioYaEsta = participantes.some(
      participante => participante.id_usuario === idUsuario
    );

    if (usuarioYaEsta) {
      return res.status(200).json({
        mensaje: "Ya estás dentro de esta sala",
        id_partida: partida.id_partida,
        nombre_sala: partida.nombre_sala
      });
    }

    // Si ya hay dos jugadores, no puede entrar
    if (participantes.length >= 2) {
      return res.status(400).json({
        error: "La sala está llena"
      });
    }

    // Agregamos al segundo jugador
    await mysql.realizarQuery(
      `INSERT INTO ParticipantePartida (id_partida, id_usuario)
             VALUES (${partida.id_partida}, ${idUsuario})`
    );

    // Cambiamos el estado porque ya hay dos jugadores
    await mysql.realizarQuery(
      `UPDATE Partida
             SET estado = 'jugando'
             WHERE id_partida = ${partida.id_partida}`
    );

    res.status(200).json({
      mensaje: "Te uniste a la sala correctamente",
      id_partida: partida.id_partida,
      nombre_sala: partida.nombre_sala
    });

  } catch (error) {
    console.error("Error al entrar a la sala:", error);

    res.status(500).json({
      error: "Error al entrar a la sala"
    });
  }
});


// CERRAR SESIÓN
app.post("/logout", (req, res) => {

  req.session.destroy((error) => {

    if (error) {
      console.error("Error al cerrar sesión:", error);

      return res.status(500).json({
        error: "No se pudo cerrar la sesión"
      });
    }

    res.status(200).json({
      mensaje: "Sesión cerrada correctamente"
    });
  });
});

//el lobby usa este endpoint par consultar quienes estan dentro de la partida
app.get("/partidas/:idPartida/jugadores", async (req, res) => {

  try {

    if (!req.session.usuario) {
      return res.status(401).json({
        error: "Tenés que iniciar sesión"
      });
    }

    const { idPartida } = req.params;

    const jugadores = await mysql.realizarQuery(
      `SELECT 
                ParticipantePartida.id_participante,
                ParticipantePartida.id_usuario,
                ParticipantePartida.listo,
                Usuario.nombre_usuario
             FROM ParticipantePartida
             INNER JOIN Usuario
                ON ParticipantePartida.id_usuario = Usuario.id_usuario
             WHERE ParticipantePartida.id_partida = ${idPartida}`
    );

    res.status(200).json(jugadores);

  } catch (error) {

    console.error("Error al obtener los jugadores:", error);

    res.status(500).json({
      error: "Error al obtener los jugadores"
    });

  }

});

//CONEXION SOCKET

io.on("connection", (socket) => {

  socket.on("joinRoom", async (data) => {
    try {
      const idPartida = Number(data.idPartida);

      if (!Number.isInteger(idPartida)) {
        return;
      }

      const room = `partida_${idPartida}`;

      // Metemos al socket en la sala de Socket.IO
      socket.join(room);

      console.log("Usuario entró a la sala:", room);

      // Buscamos los jugadores actuales de esa partida
      const jugadores = await mysql.realizarQuery(
        `SELECT 
                    ParticipantePartida.id_participante,
                    ParticipantePartida.id_usuario,
                    ParticipantePartida.listo,
                    Usuario.nombre_usuario
                 FROM ParticipantePartida
                 INNER JOIN Usuario
                    ON ParticipantePartida.id_usuario = Usuario.id_usuario
                 WHERE ParticipantePartida.id_partida = ${idPartida}`
      );

      // Avisamos a todos los jugadores de la sala
      io.to(room).emit("jugadoresActualizados", jugadores);

    } catch (error) {
      console.error("Error al entrar a la sala de Socket.IO:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});




