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

 // OBTENER TODOS LOS CLUBES
app.get("/clubes", async (req, res) => {
  try {
    const clubes = await mysql.realizarQuery(
      `SELECT id_club, nombre, liga, jerarquia, copa_internacional, descripcion
       FROM Club
       ORDER BY liga ASC, nombre ASC`
    );

    res.status(200).json(clubes);
  } catch (error) {
    console.error("Error al obtener los clubes:", error);

    res.status(500).json({
      error: "Error al obtener los clubes"
    });
  }
});



 // OBTENER TODAS LAS LIGAS DISPONIBLES
app.get("/ligas", async (req, res) => {
  try {
    const ligas = await mysql.realizarQuery(
      `SELECT DISTINCT liga
       FROM Club
       WHERE liga IS NOT NULL AND liga <> ''
       ORDER BY liga ASC`
    );

    res.status(200).json(ligas);
  } catch (error) {
    console.error("Error al obtener las ligas:", error);

    res.status(500).json({
      error: "Error al obtener las ligas"
    });
  }
});




app.get("/partidas/:idPartida/eleccion", async (req, res) => {
    try {
        if (!req.session.usuario) {
            return res.status(401).json({
                error: "Tenés que iniciar sesión"
            });
        }

        const idPartida = Number(req.params.idPartida);
        const idUsuario = Number(req.session.usuario.id_usuario);

        if (!Number.isInteger(idPartida) || idPartida <= 0) {
            return res.status(400).json({
                error: "Identificador de partida inválido"
            });
        }

        // Verificamos que el usuario pertenezca a la partida.
        const participacion = await mysql.realizarQuery(
            `SELECT id_participante
             FROM ParticipantePartida
             WHERE id_partida = ${idPartida}
               AND id_usuario = ${idUsuario}`
        );

        if (!participacion || participacion.length === 0) {
            return res.status(403).json({
                error: "No participás de esta partida"
            });
        }

        // Obtenemos las elecciones de ambos participantes.
        const jugadores = await mysql.realizarQuery(
            `SELECT
                pp.id_participante,
                pp.id_usuario,
                pp.nombre_leyenda,
                pp.id_club,
                c.nombre AS nombre_club,
                c.liga
             FROM ParticipantePartida pp
             LEFT JOIN Club c
                ON pp.id_club = c.id_club
             WHERE pp.id_partida = ${idPartida}`
        );

        return res.status(200).json(jugadores);

    } catch (error) {
        console.error("Error al obtener la elección:", error);

        return res.status(500).json({
            error: "Error al obtener la elección de los jugadores"
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

app.get("/partidas/:idPartida/estado", (req, res) => {

  if (!req.session.usuario) {
    return res.status(401).json({
      error: "Tenés que iniciar sesión"
    });
  }

  const idPartida = Number(req.params.idPartida);

  // Validamos que el ID sea un entero positivo.
  if (!Number.isInteger(idPartida) || idPartida <= 0) {
    return res.status(400).json({
      error: "El ID de la partida no es válido"
    });
  }

  mysql.realizarQuery(
    `SELECT
            p.id_partida,
            p.estado,
            p.fecha_inicio,
            p.fecha_fin,
            COUNT(pp.id_participante) AS cantidad_participantes,
            MAX(CASE WHEN pp.turno = 1 THEN pp.id_usuario END) AS id_usuario_turno
         FROM Partida p
         LEFT JOIN ParticipantePartida pp
            ON p.id_partida = pp.id_partida
         WHERE p.id_partida = ${idPartida}
         GROUP BY
            p.id_partida,
            p.estado,
            p.fecha_inicio,
            p.fecha_fin`
  )
    .then((resultado) => {

      if (!resultado || resultado.length === 0) {
        return res.status(404).json({
          error: "La partida no existe"
        });
      }

      const partida = resultado[0];
      const cantidad = Number(partida.cantidad_participantes);

      if (cantidad !== 2) {
        return res.status(409).json({
          error: "La partida debe tener exactamente dos participantes",
          id_partida: partida.id_partida,
          estado: partida.estado,
          cantidad_participantes: cantidad
        });
      }

      res.status(200).json({
        id_partida: partida.id_partida,
        estado: partida.estado,
        fecha_inicio: partida.fecha_inicio,
        fecha_fin: partida.fecha_fin,
        cantidad_participantes: cantidad,
        id_usuario_turno: partida.id_usuario_turno
      });

    })
    .catch((error) => {
      console.error("Error al consultar el estado de la partida:", error);

      res.status(500).json({
        error: "Error al consultar el estado de la partida"
      });
    });

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

        const idPartida = Number(req.params.idPartida);

        if (!Number.isInteger(idPartida) || idPartida <= 0) {
            return res.status(400).json({
                error: "Identificador de partida inválido"
            });
        }

        const jugadores = await mysql.realizarQuery(
            `SELECT
                pp.id_participante,
                pp.id_partida,
                pp.id_usuario,
                pp.id_club,
                pp.id_titulo,
                pp.puntos_campeon,
                pp.goles,
                pp.asistencias,
                pp.listo,
                pp.posicion_actual,
                pp.turno,
                u.nombre_usuario,
                c.nombre AS nombre_club,
                c.liga,
                t.nombre AS nombre_titulo
            FROM ParticipantePartida pp
            INNER JOIN Usuario u
                ON pp.id_usuario = u.id_usuario
            LEFT JOIN Club c
                ON pp.id_club = c.id_club
            LEFT JOIN Titulo t
                ON pp.id_titulo = t.id_titulo
            WHERE pp.id_partida = ${idPartida}`
        );

        return res.status(200).json(jugadores);

    } catch (error) {
        console.error("Error al obtener los jugadores:", error);

        return res.status(500).json({
            error: "Error al obtener los jugadores"
        });
    }
});



app.post("/partidas/:idPartida/listo", async (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.status(401).json({
        error: "Tenés que iniciar sesión"
      });
    }

    const idPartida = Number(req.params.idPartida);
    const idUsuario = Number(req.session.usuario.id_usuario);

    if (
      !Number.isInteger(idPartida) ||
      idPartida <= 0 ||
      !Number.isInteger(idUsuario) ||
      idUsuario <= 0
    ) {
      return res.status(400).json({
        error: "Datos inválidos"
      });
    }

    // Comprobamos que el usuario participe en esta partida
    const participantes = await mysql.realizarQuery(
      `SELECT id_participante
             FROM ParticipantePartida
             WHERE id_partida = ${idPartida}
             AND id_usuario = ${idUsuario}`
    );

    if (!participantes || participantes.length === 0) {
      return res.status(403).json({
        error: "No participás de esta partida"
      });
    }

    // Marcamos al jugador como listo
    await mysql.realizarQuery(
      `UPDATE ParticipantePartida
             SET listo = 1
             WHERE id_partida = ${idPartida}
             AND id_usuario = ${idUsuario}`
    );

    // Obtenemos el estado actual de los jugadores
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

    const sala = `partida_${idPartida}`;

    // Actualizamos ambos lobbies en tiempo real
    io.to(sala).emit("jugadoresActualizados", jugadores);

    // Solo comienza si hay exactamente dos jugadores
    // y ambos están listos
    const ambosListos =
      jugadores.length === 2 &&
      jugadores.every((jugador) => Boolean(jugador.listo)); //usamos every para verificar que todos los jugadores estén listos

    if (ambosListos) {
      await mysql.realizarQuery(
        `UPDATE Partida
                 SET estado = 'jugando'
                 WHERE id_partida = ${idPartida}
                 AND estado <> 'jugando'`
      );

      // Avisamos a los dos clientes que deben comenzar
      io.to(sala).emit("partidaIniciada", {
        idPartida: idPartida
      });
    }

    return res.status(200).json({
      mensaje: ambosListos
        ? "¡Los dos están listos! Comienza la partida."
        : "¡Ya estás listo! Esperando al otro jugador.",
      ambosListos: ambosListos
    });

  } catch (error) {
    console.error("Error al marcar jugador como listo:", error);

    return res.status(500).json({
      error: "No se pudo actualizar el estado"
    });
  }
});



//CONEXION SOCKET

io.on("connection", (socket) => {

  socket.on("joinRoom", async (data) => {
    try {
      const idPartida = Number(data.idPartida);

      if (!Number.isInteger(idPartida)) {   //aca verifico que el idPartida sea un numero entero
        return;
      }

      const room = `partida_${idPartida}`;    // Creamos un nombre de sala único para cada partida

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

      // Avisamos a todos los jugadores de la sala con .to
      io.to(room).emit("jugadoresActualizados", jugadores);

    } catch (error) {
      console.error("Error al entrar a la sala de Socket.IO:", error);
    }
  });



  socket.on("jugarTurno", async (data) => {
    try {
      // 1. Identificar al usuario desde su sesión.
      const usuario = socket.request.session.usuario;

      if (!usuario) {
        socket.emit("errorPartida", {
          mensaje: "Tenés que iniciar sesión."
        });
        return;
      }

      const idUsuario = Number(usuario.id_usuario);
      const idPartida = Number(data.idPartida);

      if (!Number.isInteger(idPartida) || idPartida <= 0) {
        socket.emit("errorPartida", {
          mensaje: "El ID de la partida no es válido."
        });
        return;
      }

      // 2. Comprobar que la partida existe y está en juego.
      const partidas = await mysql.realizarQuery(
        `SELECT id_partida, estado
         FROM Partida
         WHERE id_partida = ${idPartida}`
      );

      if (!partidas || partidas.length === 0 ||
        partidas[0].estado !== "jugando") {
        socket.emit("errorPartida", {
          mensaje: "La partida no está disponible para jugar."
        });
        return;
      }

      // 3. Obtener los jugadores de la partida.
      const jugadores = await mysql.realizarQuery(
        `SELECT id_usuario, posicion_actual, turno, listo
         FROM ParticipantePartida
         WHERE id_partida = ${idPartida}`
      );

      if (!jugadores || jugadores.length !== 2) {
        socket.emit("errorPartida", {
          mensaje: "La partida debe tener dos jugadores."
        });
        return;
      }

      // 4. Verificar que el usuario participe.
      const jugador = jugadores.find(
        (j) => Number(j.id_usuario) === idUsuario
      );

      if (!jugador) {
        socket.emit("errorPartida", {
          mensaje: "No participás de esta partida."
        });
        return;
      }

      // 5. Verificar que sea su turno y que ambos estén listos.
      if (!jugadores.every((j) => Boolean(j.listo))) {
        socket.emit("errorPartida", {
          mensaje: "Los dos jugadores deben estar listos."
        });
        return;
      }

      if (!Boolean(jugador.turno)) {
        socket.emit("errorPartida", {
          mensaje: "Todavía no es tu turno."
        });
        return;
      }

      // 6. El servidor tira el dado y avanza una temporada.
      const resultadoDado = Math.floor(Math.random() * 6) + 1;
      const nuevaPosicion = Math.min(
        Number(jugador.posicion_actual) + 1,
        20
      );

      await mysql.realizarQuery(
        `UPDATE ParticipantePartida
         SET posicion_actual = ${nuevaPosicion}
         WHERE id_partida = ${idPartida}
           AND id_usuario = ${idUsuario}`
      );

      // 7. Pasar el turno al rival.
      const idRival = jugadores.find(
        (j) => Number(j.id_usuario) !== idUsuario
      ).id_usuario;

      await mysql.realizarQuery(
        `UPDATE ParticipantePartida
         SET turno = 0
         WHERE id_partida = ${idPartida}`
      );

      await mysql.realizarQuery(
        `UPDATE ParticipantePartida
         SET turno = 1
         WHERE id_partida = ${idPartida}
           AND id_usuario = ${Number(idRival)}`
      );

      // 8. Obtener el estado actualizado.

      const jugadoresActualizados = await mysql.realizarQuery(
        `SELECT pp.id_usuario, pp.posicion_actual, pp.turno, pp.listo, u.nombre_usuario
      FROM ParticipantePartida pp
      INNER JOIN Usuario u
        ON pp.id_usuario = u.id_usuario
      WHERE pp.id_partida = ${idPartida}`
      );


      // 9. Avisar a los dos jugadores.
      io.to(`partida_${idPartida}`).emit(
        "estadoPartidaActualizado",
        {
          resultadoDado,
          idUsuarioQueJugo: idUsuario,
          jugadores: jugadoresActualizados
        }
      );

    } catch (error) {
      console.error("Error al jugar el turno:", error);

      socket.emit("errorPartida", {
        mensaje: "No se pudo procesar el turno."
      });
    }
  });


  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});