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

    // Verificar que el usuario pertenezca a la partida.
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

    // Obtener los participantes y sus elecciones.
    const jugadores = await mysql.realizarQuery(
      `SELECT
                pp.id_participante,
                pp.id_usuario,
                pp.nombre_leyenda,
                pp.id_club,
                pp.nombre_leyenda,
                u.nombre_usuario,
                c.nombre AS nombre_club,
                c.liga,
                CASE
                    WHEN pp.id_club IS NOT NULL
                     AND pp.nombre_leyenda IS NOT NULL
                     AND TRIM(pp.nombre_leyenda) <> ''
                    THEN 1
                    ELSE 0
                END AS eleccion_confirmada
             FROM ParticipantePartida pp
             INNER JOIN Usuario u
                ON pp.id_usuario = u.id_usuario
             LEFT JOIN Club c
                ON pp.id_club = c.id_club
             WHERE pp.id_partida = ${idPartida}`
    );

    const ambosConfirmaron =
      jugadores.length === 2 &&
      jugadores.every(
        (jugador) =>
          Number(jugador.eleccion_confirmada) === 1
      );

    return res.status(200).json({
      idPartida,
      idUsuario,
      jugadores,
      ambosConfirmaron
    });

  } catch (error) {
    console.error("Error al obtener la elección:", error);

    return res.status(500).json({
      error: "Error al obtener la elección de los jugadores"
    });
  }
});



app.post("/partidas/:idPartida/eleccion", async (req, res) => {
  try {
    // 1. Verificar sesión.
    if (!req.session.usuario) {
      return res.status(401).json({
        error: "Tenés que iniciar sesión"
      });
    }

    const idPartida = Number(req.params.idPartida);
    const idUsuario = Number(req.session.usuario.id_usuario);
    const idClub = Number(req.body.id_club);
    const nombreLeyenda =
      typeof req.body.nombre_leyenda === "string"
        ? req.body.nombre_leyenda.trim()
        : "";

    // 2. Validar los datos recibidos.
    if (
      !Number.isInteger(idPartida) || idPartida <= 0 ||
      !Number.isInteger(idUsuario) || idUsuario <= 0 ||
      !Number.isInteger(idClub) || idClub <= 0
    ) {
      return res.status(400).json({
        error: "Los identificadores enviados no son válidos"
      });
    }

    if (!nombreLeyenda || nombreLeyenda.length > 100) {
      return res.status(400).json({
        error: "El nombre de la leyenda debe tener entre 1 y 100 caracteres"
      });
    }

    // 3. Comprobar que la partida exista y tenga dos participantes.
    const participantes = await mysql.realizarQuery(
      `SELECT id_usuario
             FROM ParticipantePartida
             WHERE id_partida = ${idPartida}`
    );

    if (!participantes || participantes.length !== 2) {
      return res.status(409).json({
        error: "La partida debe tener exactamente dos jugadores"
      });
    }

    // 4. Comprobar que el usuario pertenezca a esa partida.
    const miParticipacion = participantes.find(
      (jugador) =>
        Number(jugador.id_usuario) === idUsuario
    );

    if (!miParticipacion) {
      return res.status(403).json({
        error: "No participás de esta partida"
      });
    }

    // 5. Comprobar que el club exista.
    const clubes = await mysql.realizarQuery(
      `SELECT id_club
             FROM Club
             WHERE id_club = ${idClub}`
    );

    if (!clubes || clubes.length === 0) {
      return res.status(400).json({
        error: "El club seleccionado no existe"
      });
    }

    // 6. Escapar el texto antes de incorporarlo a la consulta SQL.
    const nombreEscapado = nombreLeyenda
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");

    // 7. Guardar la elección del usuario actual.
    await mysql.realizarQuery(
      `UPDATE ParticipantePartida
             SET id_club = ${idClub},
                 nombre_leyenda = '${nombreEscapado}'
             WHERE id_partida = ${idPartida}
               AND id_usuario = ${idUsuario}`
    );

    // 8. Consultar las elecciones actualizadas.
    const jugadores = await mysql.realizarQuery(
      `SELECT
                pp.id_participante,
                pp.id_usuario,
                pp.nombre_leyenda,
                pp.id_club,
                u.nombre_usuario,
                c.nombre AS nombre_club,
                c.liga,
                CASE
                    WHEN pp.id_club IS NOT NULL
                     AND pp.nombre_leyenda IS NOT NULL
                     AND TRIM(pp.nombre_leyenda) <> ''
                    THEN 1
                    ELSE 0
                END AS eleccion_confirmada
             FROM ParticipantePartida pp
             INNER JOIN Usuario u
                ON pp.id_usuario = u.id_usuario
             LEFT JOIN Club c
                ON pp.id_club = c.id_club
             WHERE pp.id_partida = ${idPartida}`
    );

    const ambosConfirmaron =
      jugadores.length === 2 &&
      jugadores.every(
        (jugador) =>
          Number(jugador.eleccion_confirmada) === 1
      );


    // 9. Notificar a los dos jugadores con el estado actualizado.
    const estadoEleccion = {
      idPartida,
      jugadores,
      ambosConfirmaron
    };

    io.to(`partida_${idPartida}`).emit(
      "eleccionesActualizadas",
      estadoEleccion
    );

    // Avisar que la elección terminó para los dos participantes.
    if (ambosConfirmaron) {
      io.to(`partida_${idPartida}`).emit(
        "eleccionCompleta",
        { idPartida }
      );
    }

    return res.status(200).json({
      mensaje: "Elección guardada correctamente",
      idPartida,
      idUsuario,
      jugadores,
      ambosConfirmaron
    });


  } catch (error) {
    console.error("Error al guardar la elección:", error);

    return res.status(500).json({
      error: "No se pudo guardar la elección"
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
              pp.fama,
              pp.plata,
              pp.idolatria,
              pp.turnos_pendientes_perdidos,
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
        WHERE pp.id_partida = ${idPartida}`);

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
      // 1. Validar la sesión del usuario.
      const usuario = socket.request.session?.usuario;

      if (!usuario) {
        socket.emit("errorPartida", {
          mensaje: "Tenés que iniciar sesión."
        });
        return;
      }

      const idUsuario = Number(usuario.id_usuario);
      const idPartida = Number(data?.idPartida);

      if (
        !Number.isInteger(idPartida) ||
        idPartida <= 0
      ) {
        socket.emit("errorPartida", {
          mensaje: "El ID de la partida no es válido."
        });
        return;
      }

      // 2. Verificar que el usuario pertenezca a esta partida.
      const participaciones = await mysql.realizarQuery(
        `SELECT id_participante
         FROM ParticipantePartida
         WHERE id_partida = ${idPartida}
           AND id_usuario = ${idUsuario}`
      );

      if (!participaciones || participaciones.length === 0) {
        socket.emit("errorPartida", {
          mensaje: "No participás de esta partida."
        });
        return;
      }

      const room = `partida_${idPartida}`;

      // 3. Solo después de validar, permitir entrar a la sala.
      await socket.join(room);

      console.log("Usuario entró a la sala:", room);

      // 4. Obtener el estado actual de los jugadores.
      const jugadores = await mysql.realizarQuery(
        `SELECT
           pp.id_participante,
           pp.id_usuario,
           pp.listo,
           pp.posicion_actual,
           pp.turno,
           u.nombre_usuario
         FROM ParticipantePartida pp
         INNER JOIN Usuario u
           ON pp.id_usuario = u.id_usuario
         WHERE pp.id_partida = ${idPartida}`
      );

      // Informar el estado de los jugadores en la sala.
      io.to(room).emit("jugadoresActualizados", jugadores);

      // 5. Recuperar también el estado persistido de la elección.
      const elecciones = await mysql.realizarQuery(
        `SELECT
           pp.id_participante,
           pp.id_usuario,
           pp.id_club,
           pp.nombre_leyenda,
           u.nombre_usuario,
           c.nombre AS nombre_club,
           c.liga,
           CASE
             WHEN pp.id_club IS NOT NULL
              AND pp.nombre_leyenda IS NOT NULL
              AND TRIM(pp.nombre_leyenda) <> ''
             THEN 1
             ELSE 0
           END AS eleccion_confirmada
         FROM ParticipantePartida pp
         INNER JOIN Usuario u
           ON pp.id_usuario = u.id_usuario
         LEFT JOIN Club c
           ON pp.id_club = c.id_club
         WHERE pp.id_partida = ${idPartida}`
      );

      const ambosConfirmaron =
        elecciones.length === 2 &&
        elecciones.every(
          (j) => Number(j.eleccion_confirmada) === 1
        );

      // Enviar el estado actual al socket que acaba de conectarse.
      socket.emit("eleccionesActualizadas", {
        idPartida,
        jugadores: elecciones,
        ambosConfirmaron
      });

      // Si ya confirmaron los dos, avisar también al que se reconecta.
      if (ambosConfirmaron) {
        socket.emit("eleccionCompleta", { idPartida });
      }

    } catch (error) {
      console.error("Error al entrar a la sala de Socket.IO:", error);

      socket.emit("errorPartida", {
        mensaje: "No se pudo ingresar a la sala de la partida."
      });
    }
  });

  socket.on("jugarTurno", async (data) => {
    try {
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

      const resultadoTurno = await mysql.realizarTransaccion(
        async (query) => {
          // Bloqueamos la partida para evitar que dos solicitudes
          // procesen simultáneamente el mismo turno.
          const partidas = await query(
            `SELECT id_partida, estado
                     FROM Partida
                     WHERE id_partida = ?
                     FOR UPDATE`,
            [idPartida]
          );

          if (
            partidas.length === 0 ||
            partidas[0].estado !== "jugando"
          ) {
            return {
              error: "La partida no está disponible para jugar."
            };
          }

          // Bloqueamos los participantes durante la transacción.
          const jugadores = await query(
            `SELECT
                        id_participante,
                        id_usuario,
                        posicion_actual,
                        id_seleccion,
                        turno,
                        listo,
                        turnos_pendientes_perdidos
                     FROM ParticipantePartida
                     WHERE id_partida = ?
                     FOR UPDATE`,
            [idPartida]
          );

          if (jugadores.length !== 2) {
            return {
              error: "La partida debe tener dos jugadores."
            };
          }

          const jugador = jugadores.find(
            (j) => Number(j.id_usuario) === idUsuario
          );

          if (!jugador) {
            return {
              error: "No participás de esta partida."
            };
          }

          if (!jugadores.every((j) => Boolean(j.listo))) {
            return {
              error: "Los dos jugadores deben estar listos."
            };
          }

          if (!Boolean(jugador.turno)) {
            return {
              error: "Todavía no es tu turno."
            };
          }

          const rival = jugadores.find(
            (j) => Number(j.id_usuario) !== idUsuario
          );

          // Función interna para alternar el turno.
          const cambiarTurno = async () => {
            await query(
              `UPDATE ParticipantePartida
                         SET turno = 0
                         WHERE id_partida = ?`,
              [idPartida]
            );

            await query(
              `UPDATE ParticipantePartida
                         SET turno = 1
                         WHERE id_partida = ?
                           AND id_usuario = ?`,
              [idPartida, Number(rival.id_usuario)]
            );
          };

          // Si el jugador tenía un turno pendiente por perder,
          // lo consume sin tirar el dado ni generar otro evento.
          if (Number(jugador.turnos_pendientes_perdidos) > 0) {
            await query(
              `UPDATE ParticipantePartida
                         SET turnos_pendientes_perdidos =
                             turnos_pendientes_perdidos - 1
                         WHERE id_partida = ?
                           AND id_usuario = ?`,
              [idPartida, idUsuario]
            );

            await cambiarTurno();

            const jugadoresActualizados = await obtenerJugadores(
              query,
              idPartida
            );

            return {
              resultadoDado: null,
              idUsuarioQueJugo: idUsuario,
              jugadores: jugadoresActualizados,
              evento: null,
              turnoPerdido: true,
              mensajeTurno:
                "Perdés este turno por un evento anterior."
            };
          }

          // El dado se tira, pero cada tirada representa un avance
          // de una casilla, no un avance equivalente al número.
          const resultadoDado = Math.floor(Math.random() * 6) + 1;

          // Usamos la posición del tablero como temporada (una posición por turno).
          // Peso es el peso relativo dentro de los eventos elegibles, no un porcentaje fijo.
          // Los eventos de Selección se habilitan desde la temporada 5.
          const eventos = await query(
            `SELECT
                        id_evento,
                        nombre,
                        descripcion,
                        categoria,
                        efecto_fama,
                        efecto_plata,
                        efecto_idolatria,
                        peso,
                        bloquea_avance,
                        turnos_perdidos
                     FROM Evento
                     WHERE peso > 0
                       AND NOT (
                         (LOWER(categoria) IN ('selección', 'seleccion') OR id_evento IN (25, 26, 27, 28, 29, 30))
                         AND ? < 5
                       )`,
            [posicionActual]
          );

          if (eventos.length === 0) {
            return {
              error: "No hay eventos elegibles con peso mayor a cero para esta etapa."
            };
          }

          const evento = sortearEventoPonderado(eventos);
          const bloqueaAvance = Boolean(
            Number(evento.bloquea_avance)
          );

          const nuevaPosicion = bloqueaAvance
            ? posicionActual
            : Math.min(posicionActual + 1, 20);

          const turnosPerdidos = Math.max(
            0,
            Number(evento.turnos_perdidos) || 0
          );

          // Actualizamos posición, estadísticas y turnos pendientes.
          await query(
            `UPDATE ParticipantePartida
                     SET
                        posicion_actual = ?,
                        fama = fama + ?,
                        plata = plata + ?,
                        idolatria = idolatria + ?,
                        turnos_pendientes_perdidos =
                            turnos_pendientes_perdidos + ?
                     WHERE id_partida = ?
                       AND id_usuario = ?`,
            [
              nuevaPosicion,
              Number(evento.efecto_fama) || 0,
              Number(evento.efecto_plata) || 0,
              Number(evento.efecto_idolatria) || 0,
              turnosPerdidos,
              idPartida,
              idUsuario
            ]
          );

          // Registramos el evento en el historial.
          await query(
            `INSERT INTO HistorialEvento
                        (id_participante, id_evento, posicion)
                     VALUES (?, ?, ?)`,
            [
              jugador.id_participante,
              evento.id_evento,
              nuevaPosicion
            ]
          );

          await cambiarTurno();

          const jugadoresActualizados = await obtenerJugadores(
            query,
            idPartida
          );

          return {
            resultadoDado,
            idUsuarioQueJugo: idUsuario,
            idParticipanteQueJugo: jugador.id_participante,
            jugadores: jugadoresActualizados,
            evento: {
              id_evento: evento.id_evento,
              nombre: evento.nombre,
              descripcion: evento.descripcion,
              categoria: evento.categoria,
              efecto_fama: Number(evento.efecto_fama) || 0,
              efecto_plata: Number(evento.efecto_plata) || 0,
              efecto_idolatria:
                Number(evento.efecto_idolatria) || 0,
              bloquea_avance: bloqueaAvance,
              turnos_perdidos: turnosPerdidos,
              posicion_resultante: nuevaPosicion
            },
            turnoPerdido: false
          };
        }
      );

      if (resultadoTurno.error) {
        socket.emit("errorPartida", {
          mensaje: resultadoTurno.error
        });
        return;
      }

      // Compartimos el nuevo estado con los dos jugadores.
      io.to(`partida_${idPartida}`).emit(
        "estadoPartidaActualizado",
        resultadoTurno
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


async function obtenerJugadores(query, idPartida) {
    return await query(
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
            pp.nombre_leyenda,
            pp.fama,
            pp.plata,
            pp.idolatria,
            pp.turnos_pendientes_perdidos,
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
         WHERE pp.id_partida = ?`,
        [idPartida]
    );
}

/** Sortea un evento usando peso como ponderación relativa entre los elegibles. */
function sortearEventoPonderado(eventos) {
  const elegibles = eventos
    .map((evento) => ({ ...evento, peso: Number(evento.peso) }))
    .filter((evento) => Number.isFinite(evento.peso) && evento.peso > 0);
  const pesoTotal = elegibles.reduce((total, evento) => total + evento.peso, 0);

  if (pesoTotal <= 0) throw new Error("No hay eventos con peso válido para sortear.");

  let sorteo = Math.random() * pesoTotal;
  for (const evento of elegibles) {
    sorteo -= evento.peso;
    if (sorteo < 0) return evento;
  }

  return elegibles[elegibles.length - 1];
}
