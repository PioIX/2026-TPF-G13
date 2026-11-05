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

// ============================================================================
// SISTEMA DE EVENTOS — lógica futbolística centralizada.
// Todas las validaciones de elegibilidad, dependencias históricas y
// probabilidades de los eventos se resuelven en modulos/eventos.js.
// ============================================================================
const eventosModulo = require("./modulos/eventos");
const {
normalizarTexto,
CODIGOS_LESION_NUEVA,
CODIGOS_CONVOCATORIA,
CODIGOS_CAMBIO_CLUB,
ESTADOS_CONVOCADO,
generarEvento,
} = eventosModulo;

// Detección robusta del esquema: si las columnas de la auditoría no están
// todavía (migración pendiente), el juego sigue funcionando en modo
// compatible (sin las validaciones nuevas) en vez de romper los turnos.
let esquemaEventos = {
codigoEvento: false, // Evento.codigo_evento
finCarrera: false, // Evento.fin_carrera
contexto: false, // ParticipantePartida.id_nacionalidad / convocatorias / estado_seleccion
clubesHistorico: false, // tabla ClubesHistorico
};

async function detectarEsquemaEventos() {
try {
  const filas = await mysql.realizarQuery(
    `SELECT TABLE_NAME, COLUMN_NAME
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND (
             (TABLE_NAME = 'Evento' AND COLUMN_NAME IN ('codigo_evento','fin_carrera'))
          OR (TABLE_NAME = 'ParticipantePartida' AND COLUMN_NAME IN ('id_nacionalidad','convocatorias','estado_seleccion'))
        )`
  );
  const pares = new Set(filas.map((f) => `${f.TABLE_NAME}.${f.COLUMN_NAME}`));
  const tablas = await mysql.realizarQuery(
    `SELECT TABLE_NAME FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND TABLE_NAME IN ('ClubesHistorico','EstadoCarreraEvento')`
  );
  const nombres = new Set(tablas.map((t) => t.TABLE_NAME || t.table_name));
  esquemaEventos = {
    codigoEvento: pares.has("Evento.codigo_evento"),
    finCarrera: pares.has("Evento.fin_carrera"),
    contexto: pares.has("ParticipantePartida.id_nacionalidad") &&
              pares.has("ParticipantePartida.convocatorias") &&
              pares.has("ParticipantePartida.estado_seleccion"),
    clubesHistorico: nombres.has("ClubesHistorico"),
    estadoCarreraEvento: nombres.has("EstadoCarreraEvento"),
  };
  console.log("[eventos] esquema detectado:", esquemaEventos);
} catch (error) {
  console.error("[eventos] no se pudo detectar el esquema:", error.message);
}
}
detectarEsquemaEventos();

//
// MIDDLEWARE DE ADMINISTRADOR
// Verifica que la sesión tenga un usuario con rol admin.
// Se usa en todas las rutas de gestión del panel de administración.
function requireAdmin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({
      error: "Tenés que iniciar sesión"
    });
  }

  if (req.session.usuario.rol !== "admin") {
    return res.status(403).json({
      error: "Solo el administrador puede realizar esta acción"
    });
  }

  next();
}

// PEDIDOS  
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






// OBTENER TODAS LAS SELECCIONES (para elegir nacionalidad)
app.get("/selecciones", async (req, res) => {
  try {
    const selecciones = await mysql.realizarQuery(
      `SELECT id_seleccion, nombre
       FROM Seleccion
       ORDER BY nombre ASC`
    );

    res.status(200).json(selecciones);
  } catch (error) {
    console.error("Error al obtener las selecciones:", error);

    res.status(500).json({
      error: "Error al obtener las selecciones"
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
                pp.id_seleccion,
                sel.nombre AS nombre_seleccion,
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
             LEFT JOIN Seleccion sel
                ON pp.id_seleccion = sel.id_seleccion
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
    // Nacionalidad: la selección del jugador (opcional pero recomendada;
    // sin selección no puede jugar torneos de selecciones).
    const idSeleccion = req.body.id_seleccion == null
      ? null
      : Number(req.body.id_seleccion);

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

    // Si vino nacionalidad, tiene que existir en Seleccion.
    if (idSeleccion !== null) {
      if (!Number.isInteger(idSeleccion) || idSeleccion <= 0) {
        return res.status(400).json({
          error: "La nacionalidad enviada no es válida"
        });
      }

      const selecciones = await mysql.realizarQuery(
        `SELECT id_seleccion FROM Seleccion WHERE id_seleccion = ${idSeleccion}`
      );

      if (!selecciones || selecciones.length === 0) {
        return res.status(400).json({
          error: "La selección elegida no existe"
        });
      }
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
    // La nacionalidad del jugador se guarda por separado de la convocatoria
    // (id_nacionalidad) si el esquema de la auditoría ya está aplicado.
    const tieneContexto = esquemaEventos.contexto;
    await mysql.realizarQuery(
      `UPDATE ParticipantePartida
             SET id_club = ${idClub},
                 grl = 57,
                 edad = 18,
                 id_seleccion = ${tieneContexto ? idSeleccion === null ? "NULL" : idSeleccion : idSeleccion === null ? "NULL" : idSeleccion},
                 ${tieneContexto ? `id_nacionalidad = ${idSeleccion === null ? "NULL" : idSeleccion},` : ""}
                 ${tieneContexto ? `estado_seleccion = 'nunca', convocatorias = 0, temporadas_fuera_seleccion = 0,` : ""}
                 lesionado = 0,
                 lesion_hasta_temporada = NULL,
                 nombre_leyenda = '${nombreEscapado}'
             WHERE id_partida = ${idPartida}
               AND id_usuario = ${idUsuario}`
    );

    // Historial de clubes: la carrera arranca en este club (base de la
    // dependencia histórica de "Vuelta a casa").
    if (esquemaEventos.clubesHistorico) {
      const participante = await mysql.realizarQuery(
        `SELECT id_participante FROM ParticipantePartida
          WHERE id_partida = ${idPartida} AND id_usuario = ${idUsuario}`
      );
      if (participante && participante.length > 0) {
        await mysql.realizarQuery(
          `DELETE FROM ClubesHistorico WHERE id_participante = ?`,
          [participante[0].id_participante]
        );
        await mysql.realizarQuery(
          `INSERT INTO ClubesHistorico (id_participante, id_club, temporada_inicio)
           VALUES (?, ?, 1)`,
          [participante[0].id_participante, idClub]
        );
      }
    }

    // 8. Consultar las elecciones actualizadas.
    const jugadores = await mysql.realizarQuery(
      `SELECT
                pp.id_participante,
                pp.id_usuario,
                pp.nombre_leyenda,
                pp.id_club,
                pp.id_seleccion,
                sel.nombre AS nombre_seleccion,
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
             LEFT JOIN Seleccion sel
                ON pp.id_seleccion = sel.id_seleccion
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

// El jugador elige su nuevo club tras un evento de cambio de club.
app.post("/partidas/:idPartida/cambioClub", async (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.status(401).json({ error: "Tenés que iniciar sesión" });
    }

    const idPartida = Number(req.params.idPartida);
    const idUsuario = Number(req.session.usuario.id_usuario);
    const idClub = Number(req.body.id_club);

    if (
      !Number.isInteger(idPartida) || idPartida <= 0 ||
      !Number.isInteger(idUsuario) || idUsuario <= 0 ||
      !Number.isInteger(idClub) || idClub <= 0
    ) {
      return res.status(400).json({ error: "Datos inválidos" });
    }

    const participantes = await mysql.realizarQuery(
      `SELECT id_participante, id_club
              FROM ParticipantePartida
              WHERE id_partida = ?
                AND id_usuario = ?`,
      [idPartida, idUsuario]
    );

    if (!participantes || participantes.length === 0) {
      return res.status(403).json({ error: "No participás de esta partida" });
    }

    // El club destino debe existir y ser distinto del actual.
    const clubActualPrevio = Number(participantes[0].id_club) || 0;
    const clubes = await mysql.realizarQuery(
      `SELECT id_club, jerarquia FROM Club
              WHERE id_club = ?
                AND id_club <> ?`,
      [idClub, clubActualPrevio]
    );

    if (!clubes || clubes.length === 0) {
      return res.status(400).json({ error: "El club seleccionado no es válido" });
    }

    await mysql.realizarQuery(
      `UPDATE ParticipantePartida
              SET id_club = ?,
                  -- Cambiarse de club enfada a la hinchada: baja la idolatría.
                  idolatria = GREATEST(0, idolatria - 30)
              WHERE id_partida = ?
                AND id_usuario = ?`,
      [idClub, idPartida, idUsuario]
    );

    // Historial de clubes: cierra la etapa anterior y abre la nueva.
    // Es lo que habilita "Vuelta a casa" con datos reales de la carrera.
    if (esquemaEventos.clubesHistorico) {
      const temporadaActual = Number(participantes[0].posicion_actual) || 1;
      await mysql.realizarQuery(
        `UPDATE ClubesHistorico
            SET temporada_fin = ?
          WHERE id_participante = ?
            AND id_club = ?
            AND temporada_fin IS NULL`,
        [Math.max(1, temporadaActual - 1), participantes[0].id_participante,
         clubActualPrevio]
      );
      await mysql.realizarQuery(
        `INSERT INTO ClubesHistorico (id_participante, id_club, temporada_inicio)
         VALUES (?, ?, ?)`,
        [participantes[0].id_participante, idClub, temporadaActual]
      );
    }

    const jugadores = await mysql.realizarQuery(
      `SELECT
                pp.id_participante,
                pp.id_usuario,
                pp.id_club,
                pp.nombre_leyenda,
                pp.posicion_actual,
                c.nombre AS nombre_club,
                c.liga,
                c.jerarquia AS jerarquia_club
              FROM ParticipantePartida pp
              LEFT JOIN Club c
                ON pp.id_club = c.id_club
              WHERE pp.id_partida = ?`,
      [idPartida]
    );

    io.to(`partida_${idPartida}`).emit("jugadoresActualizados", jugadores);

    return res.status(200).json({
      mensaje: "Firmaste con tu nuevo club",
      jugadores
    });

  } catch (error) {
    console.error("Error al cambiar de club:", error);
    return res.status(500).json({ error: "No se pudo completar el cambio de club" });
  }
});

//
// REGISTRO DE USUARIO
app.post("/registro", async (req, res) => {
  try {
    const { nombre_usuario, email, contrasena } = req.body;
    const nombre = typeof nombre_usuario === "string" ? nombre_usuario.trim() : "";
    const correo = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Verificamos que estén todos los datos
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({
        error: "Faltan datos"
      });
    }

    // Verificamos si ya existe un usuario con ese email
    const usuarioExistente = await mysql.realizarQuery(
      "SELECT id_usuario FROM Usuario WHERE email = ?",
      [correo]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        error: "El email ya está registrado"
      });
    }

    // Insertamos el nuevo usuario. El rol no se toma del request: siempre será jugador.
    await mysql.realizarQuery(
      "INSERT INTO Usuario (nombre_usuario, email, contrasena, rol) VALUES (?, ?, 'jugador')",
      [nombre, correo, contrasena]
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
// CREACIÓN DE USUARIO ADMINISTRADOR
// Solo permite crear el admin mientras no exista ninguno,
// para que no quede un registro público de administradores.
app.post("/admin", async (req, res) => {
  try {
    const { nombre_usuario, email, contrasena } = req.body;
    const nombre = typeof nombre_usuario === "string" ? nombre_usuario.trim() : "";
    const correo = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Verificamos que estén todos los datos
    if (!nombre || !correo || !contrasena) {
      return res.status(400).json({
        error: "Faltan datos"
      });
    }

    // Solo puede existir un administrador.
    const administradores = await mysql.realizarQuery(
      "SELECT id_usuario FROM Usuario WHERE rol = ?",
      ["admin"]
    );

    if (administradores.length > 0) {
      return res.status(409).json({
        error: "Ya existe un administrador"
      });
    }

    // Verificamos si ya existe un usuario con ese email
    const usuarioExistente = await mysql.realizarQuery(
      "SELECT id_usuario FROM Usuario WHERE email = ?",
      [correo]
    );

    if (usuarioExistente.length > 0) {
      return res.status(400).json({
        error: "El email ya está registrado"
      });
    }

    // Insertamos el administrador
    await mysql.realizarQuery(
      "INSERT INTO Usuario (nombre_usuario, email, contrasena, rol) VALUES (?, ?, ?, 'admin')",
      [nombre, correo, contrasena]
    );

    res.status(201).json({
      mensaje: "Administrador creado correctamente"
    });

  } catch (error) {
    console.error("Error al crear administrador:", error);

    res.status(500).json({
      error: "Error al crear administrador"
    });
  }
});

//
// LOGIN DE USUARIO
app.post("/login", async (req, res) => {
  try {
    const { email, contrasena } = req.body;
    const correo = typeof email === "string" ? email.trim().toLowerCase() : "";

    // Verificamos que estén todos los datos
    if (!correo || !contrasena) {
      return res.status(400).json({
        error: "Faltan datos"
      });
    }

    // Buscamos el usuario por email
    const usuarios = await mysql.realizarQuery(
      "SELECT * FROM Usuario WHERE email = ?",
      [correo]
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
      `SELECT * FROM Partida WHERE nombre_sala = ?`,
      [nombre_sala]
    );

    // Si no existe, creamos la partida
    if (partidas.length === 0) {

      const idPartida = await mysql.realizarQueryInsert(
        `INSERT INTO Partida (nombre_sala, estado)
                 VALUES (?, 'esperando')`,
        [nombre_sala]
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
      participante => Number(participante.id_usuario) === Number(idUsuario)
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
              c.jerarquia AS jerarquia_club,
              pp.grl,
              pp.edad,
              pp.lesionado,
              pp.lesion_hasta_temporada,
              pp.id_seleccion,
              sel.nombre AS nombre_seleccion,
              pp.id_titulo,
              pp.puntos_campeon,
              pp.goles,
              pp.asistencias,
              pp.partidos_jugados,
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
        LEFT JOIN Seleccion sel
          ON pp.id_seleccion = sel.id_seleccion
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
                        pp.id_participante,
                        pp.id_usuario,
                        pp.posicion_actual,
                        pp.id_seleccion,
                        pp.id_nacionalidad,
                        pp.convocatorias,
                        pp.estado_seleccion,
                        pp.temporadas_fuera_seleccion,
                        pp.lesionado,
                        pp.lesion_hasta_temporada,
                        pp.grl,
                        pp.edad,
                        pp.id_club,
                        pp.turno,
                        pp.listo,
                        pp.turnos_pendientes_perdidos
                     FROM ParticipantePartida pp
                     WHERE pp.id_partida = ?
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

          // Posición actual representa la temporada que está por jugar.
          const posicionActual = Math.max(
            1,
            Number(jugador.posicion_actual) || 1
          );
          const lesionado = Boolean(Number(jugador.lesionado)) &&
            (jugador.lesion_hasta_temporada == null ||
             Number(jugador.lesion_hasta_temporada) >= posicionActual);
          const jugadorContexto = {
            ...jugador,
            posicion_actual: posicionActual,
            lesionado
          };


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

          // ------------------------------------------------------------------
          // SISTEMA DE EVENTOS (auditoría integral).
          //
          // 1. Se obtienen los candidatos (peso > 0, rango de temporadas).
          // 2. Se descartan los imposibles por CONDICIONES ACTUALES
          //    (lesión, convocatoria, jerarquía del club, goles, GRL...).
          // 3. Se validan las DEPENDENCIAS HISTÓRICAS
          //    (EstadoCarreraEvento + ClubesHistorico).
          // 4. Se comprueba compatibilidad con el estado del jugador.
          // 5. Se aplican los pesos contextuales sobre los ELEGIBLES.
          // 6. Se sortea. Ningún evento imposible entra al sorteo.
          // ------------------------------------------------------------------
          const eventos = await query(
            `SELECT e.id_evento, e.nombre, e.descripcion, e.categoria,
                    e.efecto_fama, e.efecto_plata, e.efecto_idolatria,
                    e.peso, e.bloquea_avance, e.turnos_perdidos,
                    e.requiere_lesion, e.requiere_seleccion,
                    e.bloquea_si_lesionado, e.cooldown_temporadas,
                    e.temporada_minima, e.temporada_maxima,
                    ${esquemaEventos.codigoEvento ? "e.codigo_evento" : "NULL AS codigo_evento"},
                    ${esquemaEventos.finCarrera ? "e.fin_carrera" : "0 AS fin_carrera"}
               FROM Evento e
              WHERE e.peso > 0
                AND ? >= e.temporada_minima
                AND (e.temporada_maxima IS NULL OR ? <= e.temporada_maxima)`,
            [posicionActual, posicionActual]
          );

          // El clásico existe si la liga del club tiene más de un club de
          // alto nivel (jerarquía >= 4): es la señal disponible de que hay
          // un rival de fútbol grande en la misma liga.
          let ligaConClasico = false;
          // Jerarquía del club del jugador: la necesitan los títulos de
          // temporada y los eventos de cambio de club. Es nula sin contrato.
          let jerarquiaClub = null;
          if (jugador.id_club) {
            const ligaActual = await query(
              `SELECT liga, jerarquia FROM Club WHERE id_club = ?`,
              [jugador.id_club]
            );
            jerarquiaClub = ligaActual[0]?.jerarquia != null
              ? Number(ligaActual[0].jerarquia)
              : null;
            if (ligaActual[0]?.liga) {
              const rivales = await query(
                `SELECT COUNT(*) AS n FROM Club
                  WHERE liga = ? AND jerarquia >= 4 AND id_club <> ?`,
                [ligaActual[0].liga, jugador.id_club]
              );
              ligaConClasico = Number(rivales[0]?.n) >= 1;
            }
          }

          const { evento, contexto } = await generarEvento({
            query,
            jugador,
            posicionActual,
            eventos,
            ligaConClasico,
          });

          // Respaldo: si el nuevo sistema no puede elegir nada (por ejemplo
          // porque la migración no está aplicada), caemos al modo compatible
          // con los filtros básicos de la BD, para no cortar la partida.
          let eventoElegido = evento;
          if (!eventoElegido) {
            const basicos = eventos.filter((ev) => {
              if (Number(ev.requiere_lesion) && !lesionado) return false;
              if (Number(ev.bloquea_si_lesionado) && lesionado) return false;
              if (Number(ev.requiere_seleccion) &&
                  !(jugador.id_seleccion != null && Number(jugador.id_seleccion) > 0)) {
                return false;
              }
              return Number(ev.peso) > 0;
            });
            if (basicos.length === 0) {
              return {
                error: "No hay eventos elegibles para esta etapa de la carrera."
              };
            }
            eventoElegido = sortearEventoPonderado(basicos);
          }

          const codigoEvento = eventoElegido.codigo_evento || null;
          const esEventoFinCarrera =
            esquemaEventos.finCarrera &&
            Number(eventoElegido.fin_carrera) === 1;

          // "Muerta": fin de la PARTIDA COMPLETA para ambos jugadores.
          // Se marca la partida como finalizada DENTRO de la misma
          // transacción del turno; el socket avisa a la sala al salir.
          if (esEventoFinCarrera) {
            await query(
              `UPDATE Partida
                  SET estado = 'finalizada',
                      fecha_fin = COALESCE(fecha_fin, NOW())
                WHERE id_partida = ?`,
              [idPartida]
            );
          }

          const bloqueaAvance = esEventoFinCarrera
            ? true // fin de carrera: no avanza más por el tablero
            : Boolean(
                Number(eventoElegido.bloquea_avance)
              );

          const nuevaPosicion = bloqueaAvance
            ? posicionActual
            : Math.min(posicionActual + 1, 20);

          const turnosPerdidos = Math.max(
            0,
            Number(eventoElegido.turnos_perdidos) || 0
          );

          const lesionHasta = Math.max(
            posicionActual,
            Number(jugador.lesion_hasta_temporada) || posicionActual
          );
          const nombreEventoNormalizado = normalizarTexto(eventoElegido.nombre);
          const categoriaEvento = normalizarTexto(eventoElegido.categoria);

          // ------------------------------------------------------------------
          // Lesiones (eventos 1-6, ahora coherentes entre sí):
          // - Solo las lesiones "nuevas" causan lesión.
          // - "Recuperación exitosa" limpia el estado (exigía lesión previa,
          //   validado en generarEvento).
          // - "Retiro forzado" (antes "Muerta") termina la carrera: el jugador
          //   queda fuera PERMANENTEMENTE (no vuelve a disputar partidos).
          // ------------------------------------------------------------------
          const esRecuperacion = codigoEvento === "lesion_recuperacion" ||
            (!codigoEvento &&
              nombreEventoNormalizado.includes("recuperacion exitosa"));
          const esLesionNueva = codigoEvento
            ? CODIGOS_LESION_NUEVA.includes(codigoEvento)
            : (categoriaEvento === "lesion" && !esRecuperacion &&
               !nombreEventoNormalizado.includes("muerta"));
          const eventoCausaLesion = esLesionNueva;
          const lesionNuevoEstado = esEventoFinCarrera
            ? true
            : esRecuperacion
              ? false
              : (lesionado || eventoCausaLesion);
          const lesionNuevaHasta = esEventoFinCarrera
            ? 99 // fuera de carrera: nunca vuelve a estar habilitado
            : esRecuperacion
              ? null
              : eventoCausaLesion
                ? Math.max(lesionHasta, posicionActual + 1)
                : lesionado
                  ? jugador.lesion_hasta_temporada
                  : null;

          // ------------------------------------------------------------------
          // Selección nacional (eventos 25-30).
          // Estados: nunca / convocado / suplente / titular / fuera.
          // - Los eventos de convocatoria (Heredás la N°10, Titular, Regreso)
          //   activan la convocatoria y suman una convocatoria al historial
          //   (solo si antes no estaba convocado: no se duplican).
          // - "Quedás fuera de la lista" pasa el estado a 'fuera'.
          // - Gol/Figura internacional NO cambian el estado: ya participó.
          // ------------------------------------------------------------------
          const esEventoSeleccionNegativo = codigoEvento
            ? codigoEvento === "seleccion_fuera_lista"
            : /quedas fuera de la lista/.test(nombreEventoNormalizado);
          const esEventoConvocatoria = codigoEvento
            ? CODIGOS_CONVOCATORIA.includes(codigoEvento)
            : (categoriaEvento === "seleccion" && !esEventoSeleccionNegativo &&
               !/gol internacional|figura internacional/.test(nombreEventoNormalizado));

          const estadoSeleccionAnterior = contexto
            ? contexto.estadoSeleccion
            : "nunca";
          let nuevoEstadoSeleccion = estadoSeleccionAnterior;
          if (esEventoSeleccionNegativo) {
            nuevoEstadoSeleccion = "fuera";
          } else if (esEventoConvocatoria) {
            // Heredás la N°10 / Titular en la Selección => titular.
            nuevoEstadoSeleccion =
              codigoEvento === "seleccion_regreso" ? "convocado" : "titular";
          }

          const estabaConvocado =
            ESTADOS_CONVOCADO.includes(estadoSeleccionAnterior);
          const convocatoriaNueva = esEventoConvocatoria && !estabaConvocado;

          // La convocatoria apunta a la NACIONALIDAD del jugador (no a la
          // liga del club): sin nacionalidad no hay Selección posible.
          let nuevaIdSeleccion = jugador.id_seleccion;
          if (esEventoSeleccionNegativo) {
            // Deja de ser convocado; la nacionalidad se conserva aparte.
            nuevaIdSeleccion = esquemaEventos.contexto
              ? (contexto?.idNacionalidad ?? jugador.id_seleccion)
              : null;
          } else if (esEventoConvocatoria) {
            nuevaIdSeleccion = esquemaEventos.contexto
              ? (contexto?.idNacionalidad ?? 1)
              : 1; // modo compatible: convocatoria genérica
          }

          // Cada turno representa una temporada completa de liga.
          // Un campeonato realista ronda los 30-38 partidos.
          const PARTIDOS_POR_TEMPORADA = 34;

          // Lesión preexistente o nueva: se pierde una parte importante
          // de la temporada. La recuperación implica volver a mitad de año.
          // FIN DE CARRERA: el jugador NO disputa más partidos; la temporada
          // queda en cero (no genera goles, asistencias ni rendimiento).
          const lesionGrave = eventoCausaLesion || lesionado;
          const partidosJugadosTemporada = esEventoFinCarrera
            ? 0
            : esRecuperacion
            ? PARTIDOS_POR_TEMPORADA - Math.floor(Math.random() * 10) - 10
            : lesionGrave
              ? Math.max(1, Math.floor(Math.random() * 10) + 3)
              : PARTIDOS_POR_TEMPORADA - Math.floor(Math.random() * 8);

          // El GRL y la etapa de la carrera definen cuánto aporta
          // el jugador por partido (goles y asistencias esperadas).
          const grlJugador = Math.min(99, Math.max(1, Number(jugador.grl) || 1));

          // Curva de edad futbolera: arranca en 18, pico entre 25 y 28,
          // y desciende suavemente hacia el retiro (38).
          const edad = Math.max(18, Number(jugador.edad) || 18);
          const edadPico = 26;
          const factorEdad = edad <= edadPico
            // Juvenil: sube desde 0.60 a 1.00 entre los 18 y los 26.
            ? 0.60 + (edad - 18) * (0.40 / (edadPico - 18))
            // Veterano: baja desde 1.00 a 0.55 entre los 26 y los 38.
            : Math.max(0.55, 1.0 - (edad - edadPico) * 0.037);

          // Excepcional: GRL alto + veterano conserva parte del pico
          // (los grandes siguen rindiendo hasta los 33-34).
          const factorEdadFinal = grlJugador >= 80 && edad > edadPico
            ? Math.min(1, factorEdad + 0.15)
            : factorEdad;

          const golesEsperadosPorPartido = Math.min(
            1.4,
            (0.10 + grlJugador * 0.008) * factorEdadFinal
          );
          const asistenciasEsperadasPorPartido = Math.min(
            0.6,
            (0.06 + grlJugador * 0.004) * (0.8 + 0.2 * factorEdadFinal)
          );

          // Distribución de Poisson (aproximación de Knuth): modela
          // de forma realista cuántos goles/asistencias surgen de
          // los partidos disputados en la temporada.
          const samplePoisson = (media) => {
            const l = Math.exp(-media);
            let k = 0;
            let p = 1;
            do {
              k++;
              p *= Math.random();
            } while (p > l);
            return k - 1;
          };

          const golesNuevos = Math.min(
            partidosJugadosTemporada * 3,
            samplePoisson(Math.max(0.01, partidosJugadosTemporada * golesEsperadosPorPartido))
          );
          const asistenciasNuevas = Math.min(
            partidosJugadosTemporada * 2,
            samplePoisson(Math.max(0.01, partidosJugadosTemporada * asistenciasEsperadasPorPartido))
          );

          // Evolución de la media (GRL), estilo "El Ídolo" de Potrero:
          // - Joven (hasta 25): crece fuerte, 2 a 3.5 por temporada.
          // - Pico (26-29): crece moderado, 0.5 a 1.5.
          // - Veterano (30+): declive físico, 1 a 2 por temporada.
          // Goles y asistencias suman por encima de eso: mejor temporada,
          // más media (+ media + goles + asistencias, todo suma).
          // Los eventos ajustan según su fama, y la lesión castiga 1 a 3
          // según su gravedad.
          const mediaBase =
            edad < 26
              ? 2 + Math.random() * 1.5
              : edad <= 29
                ? 0.5 + Math.random() * 1
                : -(1 + Math.random());
          const mediaPorRendimiento =
            golesNuevos * 0.08 + asistenciasNuevas * 0.04;
          let cambioGRL = mediaBase + mediaPorRendimiento;

          if (eventoCausaLesion) {
            // Gravedad por fama negativa del evento de lesión.
            const famaLesion = Number(eventoElegido.efecto_fama) || 0;
            const gravedad = famaLesion <= -20 ? 3 : famaLesion <= -10 ? 2 : 1;
            cambioGRL -= gravedad;
          } else if (esRecuperacion) {
            cambioGRL += 1;
          } else if (categoriaEvento === "positivo" || categoriaEvento === "seleccion") {
            const famaEvento = Number(eventoElegido.efecto_fama) || 0;
            cambioGRL += famaEvento >= 25 ? 1 : famaEvento >= 15 ? 0.5 : 0;
          } else if (categoriaEvento === "negativo" || categoriaEvento === "aleatorio") {
            const famaEvento = Number(eventoElegido.efecto_fama) || 0;
            cambioGRL -= famaEvento <= -15 ? 0.5 : 0;
          }

          cambioGRL = Math.round(cambioGRL * 10) / 10;

          // Nota de temporada: se basa en el rendimiento real
          // (goles y asistencias cada 90 minutos) más un factor de forma.
          const notaRendimiento = Math.min(
            10,
            Math.max(
              3.5,
              Number(
                (
                  5.5 +
                  (golesNuevos / partidosJugadosTemporada) * 8 +
                  (asistenciasNuevas / partidosJugadosTemporada) * 5 +
                  (Math.random() - 0.5)
                ).toFixed(1)
              )
            )
          );

          // Actualizamos posición, estadísticas y turnos pendientes.

          await query(
            `UPDATE ParticipantePartida
     SET
        posicion_actual = ?,
        fama = GREATEST(0, fama + ?),
        plata = GREATEST(0, plata + ?),
        idolatria = GREATEST(0, idolatria + ?),
        goles = COALESCE(goles, 0) + ?,
        asistencias = COALESCE(asistencias, 0) + ?,
        partidos_jugados = COALESCE(partidos_jugados, 0) + ?,
        turnos_pendientes_perdidos =
            turnos_pendientes_perdidos + ?,
        lesionado = ?,
        lesion_hasta_temporada = ?,
        edad = ?,
        id_seleccion = ?,
        grl = LEAST(99, GREATEST(1, grl + ?))
     WHERE id_partida = ?
       AND id_usuario = ?`,
            [
              nuevaPosicion,
              Number(eventoElegido.efecto_fama) || 0,
              Number(eventoElegido.efecto_plata) || 0,
              Number(eventoElegido.efecto_idolatria) || 0,
              golesNuevos,
              asistenciasNuevas,
              partidosJugadosTemporada,
              turnosPerdidos,
              Number(lesionNuevoEstado),
              lesionNuevaHasta,
              18 + nuevaPosicion - 1,
              nuevaIdSeleccion,
              cambioGRL,
              idPartida,
              idUsuario
            ]
          );

          // ------------------------------------------------------------------
          // TÍTULOS DE LA TEMPORADA.
          //
          // Coherencia futbolística (auditoría):
          // - Si el jugador está lesionado grave o FUERA DE CARRERA, no
          //   disputó la temporada: no gana títulos (ni colectivos ni
          //   individuales) y no convierte goles.
          // - El continente del CLUB sale de Club.continente (la
          //   confederación del club decide qué copa puede disputar;
          //   un club sudamericano no gana la Champions).
          // - Para los torneos de SELECCIONES: solo si el jugador estuvo
          //   realmente convocado y jugó (estado titular/suplente/convocado,
          //   sin lesión); un Mundial exige haber sido convocado.
          // ------------------------------------------------------------------
          const pudoDisputarTemporada =
            !esEventoFinCarrera && partidosJugadosTemporada > 0;

          let nombreSeleccion = null;
          let continenteSeleccion = null;
          let paisClubJugador = null;
          let continenteClubJugador = null;
          if (jugador.id_club) {
            const datosClub = await query(
              `SELECT liga, continente FROM Club WHERE id_club = ?`,
              [jugador.id_club]
            );
            paisClubJugador = datosClub[0]?.liga || null;
            continenteClubJugador = datosClub[0]?.continente || null;
          }
          if (nuevaIdSeleccion != null && Number(nuevaIdSeleccion) > 0) {
            const datosSeleccion = await query(
              `SELECT nombre FROM Seleccion WHERE id_seleccion = ?`,
              [nuevaIdSeleccion]
            );
            nombreSeleccion = datosSeleccion[0]?.nombre || null;

            if (nombreSeleccion) {
              // El país de la selección se mapea a la liga del Club
              // (misma convención de nombres) para sacar el continente
              // desde la propia tabla de torneos: usamos el país tal cual
              // y normalizamos contra los continentes conocidos.
              const mapaContinentes = {
                "argentina": "América del Sur",
                "brasil": "América del Sur",
                "inglaterra": "Europa",
                "españa": "Europa",
                "italia": "Europa",
                "alemania": "Europa",
                "francia": "Europa",
                "países bajos": "Europa",
                "portugal": "Europa",
                "turquía": "Europa",
                "escocia": "Europa",
                "bélgica": "Europa",
                "suiza": "Europa",
                "austria": "Europa",
                "méxico": "América del Norte",
                "estados unidos": "América del Norte",
                "arabia saudita": "Asia",
                "japón": "Asia"
              };
              continenteSeleccion =
                mapaContinentes[normalizarTexto(nombreSeleccion)] || null;
            }
          }

          // Participación real en torneos de selecciones: convocado y sin
          // lesión que lo dejara fuera (condición actual de la temporada).
          const jugoConLaSeleccion =
            pudoDisputarTemporada &&
            nuevaIdSeleccion != null &&
            Number(nuevaIdSeleccion) > 0 &&
            ESTADOS_CONVOCADO.includes(nuevoEstadoSeleccion === "fuera"
              ? estadoSeleccionAnterior
              : nuevoEstadoSeleccion) &&
            // Si el evento de ESTA temporada lo dejó fuera de la lista, no
            // jugó con la Selección.
            !esEventoSeleccionNegativo;

          const titulosGanados = await procesarTitulosTemporada({
            idParticipante: jugador.id_participante,
            idClub: jugador.id_club,
            jerarquiaClub: jerarquiaClub,
            notaRendimiento,
            golesNuevos,
            asistenciasNuevas,
            partidosJugadosTemporada,
            temporada: nuevaPosicion,
            idSeleccion: jugoConLaSeleccion ? nuevaIdSeleccion : null,
            nombreSeleccion: jugoConLaSeleccion ? nombreSeleccion : null,
            continenteSeleccion: jugoConLaSeleccion
              ? continenteSeleccion
              : null,
            edad: 18 + nuevaPosicion - 1,
            paisClub: paisClubJugador,
            continenteClub: continenteClubJugador,
            pudoDisputarTemporada,
            query
          });

          // El último título de cada tipo queda en ParticipantePartida
          // para mostrarlo en el panel del jugador.
          for (const tituloGanado of titulosGanados) {
            if (tituloGanado.tipo === "colectivo") {
              await query(
                `UPDATE ParticipantePartida
                    SET id_titulo = ?
                  WHERE id_participante = ?`,
                [tituloGanado.id_titulo, jugador.id_participante]
              );
            } else if (tituloGanado.tipo === "internacional") {
              await query(
                `UPDATE ParticipantePartida
                    SET id_titulo_internacional = ?
                  WHERE id_participante = ?`,
                [tituloGanado.id_titulo_internacional,
                  jugador.id_participante]
              );
            } else if (tituloGanado.tipo === "individual") {
              await query(
                `UPDATE ParticipantePartida
                    SET id_titulo_individual = ?
                  WHERE id_participante = ?`,
                [tituloGanado.id_titulo_individual,
                  jugador.id_participante]
              );
            }
          }

          // ------------------------------------------------------------------
          // REGISTRO CONSISTENTE DEL EVENTO (dentro de la misma transacción
          // del turno: si algo falla, nada se aplica parcialmente).
          //
          // - EstadoCarreraEvento: SIEMPRE se registra el evento ocurrido
          //   (es el historial que alimenta cooldown y dependencias).
          // - EventoPartida: registro de los eventos que efectivamente
          //   sucedieron durante la partida (con semilla reproducible).
          // ------------------------------------------------------------------
          await query(
            `INSERT INTO EstadoCarreraEvento
                        (id_participante, id_evento, temporada)
                     VALUES (?, ?, ?)`,
            [jugador.id_participante, eventoElegido.id_evento, posicionActual]
          );

          try {
            // Semilla reproducible: la misma tirada de dado + contexto
            // genera siempre el mismo evento (auditoría de partidas).
            const semilla = Math.floor(Math.random() * 2147483647);
            await query(
              `INSERT INTO EventoPartida
                          (id_partida, id_usuario, id_evento, id_casillero,
                           semilla, fecha)
                       VALUES (?, ?, ?, ?, ?, NOW())`,
              [idPartida, idUsuario, eventoElegido.id_evento,
               Math.min(20, Math.max(1, nuevaPosicion)), semilla]
            );
          } catch (error) {
            // Si la tabla no tiene la fila del casillero correspondiente,
            // no interrumpimos el turno por el registro histórico.
            const esErrorCasilleroInexistente =
              /fk_eventopartida_casillero|foreign key/i.test(error.message);
            if (!esErrorCasilleroInexistente) {
              throw error;
            }
            // Fallback: usamos cualquier casillero existente. Si la tabla
            // Casillero está vacía (MIN devuelve NULL y el INSERT fallaría
            // con "id_casillero cannot be null"), simplemente se omite el
            // registro: la partida sigue igual.
            const casilleros = await query(
              `SELECT MIN(id_casillero) AS id_casillero FROM Casillero`
            );
            const idCasilleroRespaldo = casilleros[0]?.id_casillero;
            if (idCasilleroRespaldo != null) {
              try {
                await query(
                  `INSERT INTO EventoPartida
                              (id_partida, id_usuario, id_evento, id_casillero,
                               semilla, fecha)
                           VALUES (?, ?, ?, ?, ?, NOW())`,
                  [idPartida, idUsuario, eventoElegido.id_evento,
                   idCasilleroRespaldo,
                   Math.floor(Math.random() * 2147483647)]
                );
              } catch (errorInterno) {
                if (!/EventoPartida|doesn't exist|does not exist/i.test(errorInterno.message)) {
                  throw errorInterno;
                }
              }
            }
          }

          // Historial de clubes: al recalar en un club nuevo, cerramos la
          // etapa anterior y abrimos la nueva (base de "Vuelta a casa").
          // El propio evento de cambio de club se encarga del cambio real.
          // El UPDATE de ParticipantePartida de arriba mantiene id_club = ?
          // sin tocar; el cambio de club es un paso EXPLICITO del jugador.

          // Estado de Selección y convocatorias (si el esquema lo soporta).
          if (esquemaEventos.contexto) {
            await query(
              `UPDATE ParticipantePartida
                  SET convocatorias = convocatorias + ?,
                      estado_seleccion = ?,
                      temporadas_fuera_seleccion = CASE
                        WHEN ? = 'fuera' THEN temporadas_fuera_seleccion + 1
                        WHEN ? IN ('convocado','suplente','titular') THEN 0
                        ELSE temporadas_fuera_seleccion
                      END
                WHERE id_participante = ?`,
              [convocatoriaNueva ? 1 : 0,
               nuevoEstadoSeleccion,
               nuevoEstadoSeleccion,
               nuevoEstadoSeleccion,
               jugador.id_participante]
            );
          }

          await cambiarTurno();

          // Eventos de cambio de club: generamos 3 opciones con la
          // misma jerarquía (o la indicada por el evento) para que
          // el jugador elija su nuevo equipo.
          let opcionesCambioClub = null;
          let jerarquiaObjetivo = null;
          const nombreEventoCambio = normalizarTexto(eventoElegido.nombre);
          const codigoEventoCambio = codigoEvento;
          const esCambioDeClub = codigoEvento
            ? CODIGOS_CAMBIO_CLUB.includes(codigoEvento)
            : normalizarTexto(eventoElegido.categoria) === "cambio de club";

          // FIN DE CARRERA: no hay cambio de club ni opciones (el jugador
          // ya no puede firmar con nadie).
          if (esCambioDeClub && !esEventoFinCarrera) {
            // Regla futbolera: el destino depende del tipo de evento.
            // - Rescisión / préstamo / vuelta a casa: te quedás en tu nivel.
            // - Oferta de Primera / transferencia internacional: te suben un nivel.
            // - Venta inesperada: bajás un nivel (te vende un club más chico).
            const jerarquiaActual = Number(jerarquiaClub) || 1;
            let jerarquiaDestino = jerarquiaActual;
            let destinoInternacional = false;

            if (codigoEvento === "club_oferta_primera" ||
                codigoEvento === "club_transferencia_intl" ||
                /oferta de primera|transferencia internacional/.test(nombreEventoCambio)) {
              jerarquiaDestino = Math.min(5, jerarquiaActual + 1);
              destinoInternacional = codigoEvento === "club_transferencia_intl" ||
                /transferencia internacional/.test(nombreEventoCambio);
            } else if (codigoEvento === "club_venta" ||
                       /venta inesperada/.test(nombreEventoCambio)) {
              jerarquiaDestino = Math.max(1, jerarquiaActual - 1);
            }

            jerarquiaObjetivo = jerarquiaDestino;

            // TODOS los clubes candidatos, excluyendo el actual.
            // - Transferencia internacional: SOLO clubes de otro país
            //   (si el club actual no tiene continente cargado, se excluyen
            //   los de la misma liga).
            // - Vuelta a casa: SOLO los clubes en los que ya jugó
            //   (validación contra el historial real de la carrera).
            let candidatos = [];

            if (codigoEvento === "club_vuelta_casa" && esquemaEventos.clubesHistorico) {
              candidatos = await query(
                `SELECT c.id_club, c.nombre, c.liga, c.jerarquia
                   FROM ClubesHistorico ch
                   JOIN Club c ON c.id_club = ch.id_club
                  WHERE ch.id_participante = ?
                    AND ch.temporada_fin IS NOT NULL
                    AND c.id_club <> ?`,
                [jugador.id_participante, jugador.id_club || 0]
              );
              // Fallback: si el historial está vacío (partidas viejas),
              // permitimos clubes de la misma liga y jerarquía igual o
              // menor (un "regreso" coherente con la carrera).
              if (!candidatos || candidatos.length === 0) {
                candidatos = await query(
                  `SELECT id_club, nombre, liga, jerarquia
                     FROM Club
                    WHERE jerarquia <= ?
                      AND id_club <> ?`,
                  [jerarquiaDestino, jugador.id_club || 0]
                );
              }
            } else {
              const filtroPais = destinoInternacional
                ? `AND liga <> (SELECT liga FROM Club WHERE id_club = ?)`
                : ``;
              const paramsPais = destinoInternacional
                ? [jugador.id_club]
                : [];
              candidatos = await query(
                `SELECT id_club, nombre, liga, jerarquia
                   FROM Club
                  WHERE jerarquia = ?
                    AND id_club <> ?
                    ${filtroPais}`,
                [jerarquiaDestino, jugador.id_club || 0, ...paramsPais]
              );
            }

            const barajados = (candidatos || []).sort(() => Math.random() - 0.5);
            opcionesCambioClub = barajados.slice(0, 3);

            // Si no hay 3 clubes distintos en esa jerarquía, completamos
            // con clubes de la jerarquía vecina más cercana.
            if (opcionesCambioClub.length < 3) {
              const yaPropuestos = opcionesCambioClub.map(
                (c) => Number(c.id_club)
              );
              const extras = await query(
                `SELECT id_club, nombre, liga, jerarquia
                   FROM Club
                  WHERE jerarquia <> ?
                    AND id_club <> ?
                    ${destinoInternacional ? "AND liga <> (SELECT liga FROM Club WHERE id_club = ?)" : ""}
                  ORDER BY ABS(jerarquia - ?) ASC, RAND() ASC
                  LIMIT ?`,
                destinoInternacional
                  ? [jerarquiaDestino, jugador.id_club || 0, jugador.id_club,
                     jerarquiaDestino, 3 - opcionesCambioClub.length]
                  : [jerarquiaDestino, jugador.id_club || 0,
                     jerarquiaDestino, 3 - opcionesCambioClub.length]
              );
              opcionesCambioClub = [
                ...opcionesCambioClub,
                ...(extras || []).filter(
                  (c) => !yaPropuestos.includes(Number(c.id_club))
                ),
              ].slice(0, 3);
            }

            // Sin destinos posibles, el evento no puede cumplirse:
            // no se ofrece un cambio de club imposible.
            if (!opcionesCambioClub || opcionesCambioClub.length === 0) {
              opcionesCambioClub = null;
              jerarquiaObjetivo = null;
            }
          }

          const jugadoresActualizados = await obtenerJugadores(
            query,
            idPartida
          );

          return {
            resultadoDado,
            idUsuarioQueJugo: idUsuario,
            idParticipanteQueJugo: jugador.id_participante,

            rendimiento: {
              goles: golesNuevos,
              asistencias: asistenciasNuevas,
              partidos: partidosJugadosTemporada,
              nota: notaRendimiento,
              titulos: titulosGanados
            },

            jugadores: jugadoresActualizados,

            evento: {
              id_evento: eventoElegido.id_evento,
              nombre: eventoElegido.nombre,
              descripcion: eventoElegido.descripcion,
              categoria: eventoElegido.categoria,
              efecto_fama: Number(eventoElegido.efecto_fama) || 0,
              efecto_plata: Number(eventoElegido.efecto_plata) || 0,
              efecto_idolatria: Number(eventoElegido.efecto_idolatria) || 0,
              bloquea_avance: bloqueaAvance,
              turnos_perdidos: turnosPerdidos,
              posicion_resultante: nuevaPosicion,
              // "Muerta": la partida entera termina para los dos jugadores.
              fin_partida: esEventoFinCarrera,
              cambioClub: opcionesCambioClub
                ? {
                    jerarquiaObjetivo,
                    opciones: opcionesCambioClub
                  }
                : null
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

      // El evento es privado: solo lo ve el jugador que tiró el dado.
      // Al resto de la sala les llega el estado con el evento oculto.
      // broadcast excluye al socket actual, así que recibe una sola vez.
      const { evento, ...estadoPublico } = resultadoTurno;

      socket.broadcast.to(`partida_${idPartida}`).emit(
        "estadoPartidaActualizado",
        estadoPublico
      );

      socket.emit("estadoPartidaActualizado", resultadoTurno);

      // "Muerta" (fin de carrera): la partida terminó para ambos. Se avisa
      // a TODA la sala con el evento visible (incluido el rival).
      if (evento?.fin_partida) {
        io.to(`partida_${idPartida}`).emit("partidaFinalizada", {
          idPartida,
          motivo: evento.nombre,
          descripcion: evento.descripcion,
          idUsuarioQueMurio: idUsuario
        });
      }

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
            c.jerarquia AS jerarquia_club,
            pp.grl,
            pp.edad,
            pp.lesionado,
            pp.lesion_hasta_temporada,
            pp.id_seleccion,
            sel.nombre AS nombre_seleccion,
            pp.puntos_campeon,
            (SELECT COUNT(*) FROM TituloGanado tg
              WHERE tg.id_participante = pp.id_participante) AS cantidad_titulos,
            pp.id_titulo,
            pp.puntos_campeon,
            pp.goles,
            pp.asistencias,
            pp.partidos_jugados,
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
            t.nombre AS nombre_titulo,
            t.imagen AS imagen_titulo,
            t.prestigio AS prestigio_titulo,
            ti.nombre AS nombre_titulo_individual,
            ti.imagen AS imagen_titulo_individual,
            ti.prestigio AS prestigio_titulo_individual,
            tint.nombre AS nombre_titulo_internacional,
            tint.imagen AS imagen_titulo_internacional,
            tint.prestigio AS prestigio_titulo_internacional
         FROM ParticipantePartida pp
         INNER JOIN Usuario u
            ON pp.id_usuario = u.id_usuario
         LEFT JOIN Club c
            ON pp.id_club = c.id_club
         LEFT JOIN Titulo t
            ON pp.id_titulo = t.id_titulo
         LEFT JOIN TituloIndividual ti
            ON pp.id_titulo_individual = ti.id_titulo_individual
         LEFT JOIN TituloInternacional tint
            ON pp.id_titulo_internacional = tint.id_titulo_internacional
         LEFT JOIN Seleccion sel
            ON pp.id_seleccion = sel.id_seleccion
         WHERE pp.id_partida = ?`,
    [idPartida]
  );
}

/**
 * TÍTULOS POR TEMPORADA
 *
 * Al final de cada temporada el jugador puede ganar hasta 3 títulos:
 *   1. Colectivo (con su club): la jerarquía del club (1 = mejor)
 *      define la probabilidad y qué trofeos compite.
 *   2. Internacional (club o selección): también pondera jerarquía.
 *   3. Individual (Balón de Oro, Goleador, etc.): depende del
 *      rendimiento (nota, goles, asistencias) y del prestigio.
 *
 * Cada sorteo usa un puntaje "mérito" por título (base por prestigio,
 * multiplicado por rendimiento y jerarquía) contra un umbral aleatorio:
 * los mejores clubes y mejores temporadas ganan más seguido y premios
 * más importantes.
 */

async function obtenerTituloGanado(query, idTituloGanado) {
  if (!Number.isInteger(idTituloGanado) || idTituloGanado <= 0) return null;

  const filas = await query(
    `SELECT tg.id_titulo_ganado,
            tg.temporada,
            CASE
              WHEN tg.id_titulo IS NOT NULL THEN 'colectivo'
              WHEN tg.id_titulo_individual IS NOT NULL THEN 'individual'
              ELSE 'internacional'
            END AS tipo,
            COALESCE(tc.nombre, ti.nombre, tint.nombre) AS nombre,
            COALESCE(tc.puntos_campeon, ti.puntos_campeon, tint.puntos_campeon) AS puntos_campeon,
            COALESCE(tc.prestigio, ti.prestigio, tint.prestigio) AS prestigio,
            COALESCE(tc.imagen, ti.imagen, tint.imagen) AS imagen,
            tc.pais,
            tint.continente
       FROM TituloGanado tg
       LEFT JOIN Titulo tc ON tc.id_titulo = tg.id_titulo
       LEFT JOIN TituloIndividual ti ON ti.id_titulo_individual = tg.id_titulo_individual
       LEFT JOIN TituloInternacional tint ON tint.id_titulo_internacional = tg.id_titulo_internacional
      WHERE tg.id_titulo_ganado = ?`,
    [idTituloGanado]
  );

  return filas[0] || null;
}

/**
 * Sortea un título: cada candidato tiene un "mérito" y compite contra un
 * umbral aleatorio. Devuelve el id del título ganado o null si no se gana.
 * candidatos: [{ id, merito }]
 */
function sortearTitulo(candidatos) {
  if (!candidatos || candidatos.length === 0) return null;

  const totalMerito = candidatos.reduce(
    (suma, candidato) => suma + candidato.merito,
    0
  );

  // Punto de corte: más mérito acumulado = más chances.
  const umbral = Math.random() * 100;
  let acumulado = 0;

  for (const candidato of candidatos) {
    acumulado += (candidato.merito / totalMerito) * 100;
    if (umbral <= acumulado) {
      return candidato.id;
    }
  }

  return null;
}

/**
 * Decide los títulos de la temporada y los registra en TituloGanado.
 * Devuelve [{ tipo, ...titulo }] (vacío si no ganó nada).
 */
async function procesarTitulosTemporada({
  idParticipante,
  idClub,
  jerarquiaClub,
  notaRendimiento,
  golesNuevos,
  asistenciasNuevas,
  partidosJugadosTemporada,
  temporada,
  idSeleccion,
  nombreSeleccion,
  continenteSeleccion,
  edad,
  paisClub,
  continenteClub,        // confederación del CLUB (auditoría)
  pudoDisputarTemporada, // false si terminó la carrera / temporada perdida
  query
}) {
  const titulosGanados = [];

  // Sin temporada disputada no hay título posible: ni colectivo (el equipo
  // jugó sin vos), ni internacional (no participaste), ni individual.
  if (!pudoDisputarTemporada || partidosJugadosTemporada <= 0) {
    return titulosGanados;
  }

  const registrarTitulo = async (columna, idTitulo, tipo) => {
    const resultado = await query(
      `INSERT INTO TituloGanado
                  (id_participante, ${columna}, temporada)
               VALUES (?, ?, ?)`,
      [idParticipante, idTitulo, temporada]
    );

    const titulo = await obtenerTituloGanado(query, resultado.insertId);
    if (titulo) {
      titulosGanados.push({ tipo, ...titulo });

      // Sistema de puntaje: el título suma DIRECTAMENTE sus
      // puntos_campeon a ParticipantePartida. Las stats extra
      // (fama, plata, idolatría, goles, asistencias) se liquidan
      // al FINAL de la partida como suplemento.
      await query(
        `UPDATE ParticipantePartida
            SET puntos_campeon = COALESCE(puntos_campeon, 0) + ?
          WHERE id_participante = ?`,
        [Number(titulo.puntos_campeon) || 0, idParticipante]
      );

      await query(
        `UPDATE TituloGanado SET puntos_obtenidos = ? WHERE id_titulo_ganado = ?`,
        [Number(titulo.puntos_campeon) || 0, resultado.insertId]
      );
    }
  };

  // ============================================================
  // 1. TÍTULO COLECTIVO (con el club)
  // ============================================================
  // La jerarquía (1 = más chico, 5 = gigante) define tanto la
  // probabilidad como la calidad del trofeo que compite.
  if (idClub) {
    const jerarquia = Math.min(5, Math.max(1, Number(jerarquiaClub) || 3));

    // Probabilidad base de campeonar según jerarquía: los gigantes
    // pelean casi siempre, los chicos rara vez. Un solo tiro, no uno
    // por trofeo: si falla, la temporada queda sin título colectivo.
    const probabilidadCampeon = 0.07 + (jerarquia - 1) * 0.12; // 7% .. 55%

    if (Math.random() >= probabilidadCampeon) {
      // No salió campeón esta temporada.
    } else {
    // El rendimiento de la temporada del jugador empuja al equipo.
    const meritoRendimiento =
      0.6 + notaRendimiento / 10 + (golesNuevos + asistenciasNuevas * 0.5) /
        Math.max(1, partidosJugadosTemporada);

    const candidatosColectivos = await query(
      `SELECT id_titulo, nombre, prestigio
         FROM Titulo
        WHERE pais = (SELECT liga FROM Club WHERE id_club = ?)
        ORDER BY prestigio DESC`,
      [idClub]
    );

    // Los clubes grandes compiten por todo; los chicos solo por
    // trofeos de prestigio bajo (copas nacionales, supercopas).
    const elegibles = candidatosColectivos.filter(
      (titulo) => Number(titulo.prestigio) <= jerarquia
    );

    const ganadorColectivo = sortearTitulo(
      elegibles.map((titulo) => ({
        id: titulo.id_titulo,
        merito:
         Number(titulo.prestigio) * meritoRendimiento
      }))
    );

    if (ganadorColectivo) {
      await registrarTitulo("id_titulo", ganadorColectivo, "colectivo");
    }
    }
  }

  // ============================================================
  // 2. TÍTULO INTERNACIONAL
  // ============================================================
  // Solo clubes con cierta jerarquía (y validaciones por tipo de
  // torneo) compiten. Los torneos de selecciones exigen estar
  // convocado (id_seleccion != NULL) y el Mundial tiene chances mínimas.
  if (idClub) {
    const jerarquia = Math.min(5, Math.max(1, Number(jerarquiaClub) || 3));

    const candidatosInternacionales = await query(
      `SELECT id_titulo_internacional, nombre, prestigio, continente,
              tipo_seleccion, jerarquia_minima, continente_club
        FROM TituloInternacional
        WHERE jerarquia_minima IS NULL OR jerarquia_minima <= ?
        ORDER BY prestigio DESC`,
      [jerarquia]
    );

    // Filtro duro de validaciones (auditoría - competencias internacionales):
    // - De CLUBES: la confederación del CLUB decide la elegibilidad, no el
    //   país del jugador. Un club sudamericano compite por Libertadores /
    //   Sudamericana; un club europeo por Champions / Europa League. La
    //   Mundial de Clubes la disputa cualquier club con jerarquía mínima.
    // - De SELECCIONES: hay que haber sido realmente CONVOCADO y JUGADO
    //   (desde el caller llega idSeleccion = null si no participó).
    const elegiblesInternacionales = candidatosInternacionales.filter(
      (titulo) => {
        if (Number(titulo.tipo_seleccion) === 0) {
          // Torneo de clubes: exige que el club pertenezca a la
          // confederación del torneo (continente_club).
          const continenteTorneo = normalizarTexto(titulo.continente_club);
          if (!continenteTorneo) return true; // Mundial de clubes: cualquiera
          if (!continenteClub) return false;
          return normalizarTexto(continenteClub) === continenteTorneo;
        }

        const convocado =
          idSeleccion !== null && idSeleccion !== undefined && Number(idSeleccion) > 0;
        if (!convocado) return false;

        // Mundial / Finalissima / Copa Árabe / Olímpico: cualquier selección.
        const continente = normalizarTexto(titulo.continente);
        if (continente === "mundial") return true;

        // Torneo continental: el país del jugador tiene que ser de ese
        // continente (Copa América -> Sudamérica, Eurocopa -> Europa, etc.).
        return normalizarTexto(continenteSeleccion) === continente;
      }
    );

    if (elegiblesInternacionales.length > 0) {
      // Igual que en los colectivos: un solo tiro por temporada.
      const probabilidadInternacional = 0.04 + (jerarquia - 1) * 0.07; // 4% .. 32%

      if (Math.random() < probabilidadInternacional) {
    const meritoInternacional =
      0.5 + notaRendimiento / 12 +
      (golesNuevos / Math.max(1, partidosJugadosTemporada)) * 2;

    const factorJerarquiaInt = 0.80 + (jerarquia - 1) * 0.175; // 0.80 .. 1.50

    const ganadorInternacional = sortearTitulo(
      elegiblesInternacionales.map((titulo) => ({
        id: titulo.id_titulo_internacional,
        merito: Number(titulo.prestigio) * meritoInternacional * factorJerarquiaInt
      }))
    );

    if (ganadorInternacional) {
      await registrarTitulo(
        "id_titulo_internacional",
        ganadorInternacional,
        "internacional"
      );
    }
      }
    }
  }

  // ============================================================
  // 3. TÍTULO INDIVIDUAL
  // ============================================================
  // Depende del rendimiento individual de la temporada, no del club.
  // La EDAD controla cada premio:
  //   - Golden Boy (Mejor Jugador Joven): solo hasta los 22.
  //   - Balón de Oro y Bota de Oro: después de los 30 la probabilidad
  //     cae fuerte (puede pasar, pero es raro).
  //   - Goleador de la Liga: premio por liga LOCAL (pais del club).
  const edadJugador = Math.max(18, Number(edad) || 18);
  const golPorPartido = golesNuevos / Math.max(1, partidosJugadosTemporada);
  const asistenciaPorPartido =
    asistenciasNuevas / Math.max(1, partidosJugadosTemporada);

  // Un solo tiro: la mayoría de las temporadas no ganás nada.
  const probabilidadIndividual = Math.min(
    0.30,
    Math.max(
      0.02,
      (notaRendimiento - 5.5) / 15 + (golPorPartido + asistenciaPorPartido) * 0.25
    )
  );

  if (Math.random() < probabilidadIndividual) {
  const candidatosIndividuales = await query(
    `SELECT id_titulo_individual, nombre, prestigio, pais
       FROM TituloIndividual`
  );

  const meritoIndividualBase =
    notaRendimiento / 10 * 2 +
    golPorPartido * 3 +
    asistenciaPorPartido * 1.5;

  const nombreNormalizado = (t) => normalizarTexto(t.nombre);

  // Filtro + mérito con edad:
  // - "Mejor Jugador Joven" (Golden Boy): exclusivo hasta 22 años.
  // - Balón de Oro / Bota de Oro: penalización fuerte con la edad
  //   (un 35 años puede ganar, pero necesita una temporada brutal).
  const elegiblesIndividuales = candidatosIndividuales
    .filter((titulo) => {
      // Premio por liga/pais: solo si coincide con el pais del club.
      if (titulo.pais != null && normalizarTexto(titulo.pais) !== normalizarTexto(paisClub)) {
        return false;
      }

      const nombre = nombreNormalizado(titulo);

      if (/joven/.test(nombre) && edadJugador > 22) return false;

      if (/bal.?n de oro|bota de oro/.test(nombre) && edadJugador > 30) {
        // Cada año sobre 30 reduce las chances: es posible pero raro.
        return Math.random() < Math.max(0.15, 0.6 - (edadJugador - 30) * 0.12);
      }

      return true;
    })
    .map((titulo) => {
      const nombre = nombreNormalizado(titulo);
      let merito = Number(titulo.prestigio) * meritoIndividualBase;

      if (/bal.?n de oro|bota de oro/.test(nombre) && edadJugador > 28) {
        merito *= Math.max(0.2, 1 - (edadJugador - 28) * 0.08);
      }

      return { id: titulo.id_titulo_individual, merito };
    });

  const ganadorIndividual = sortearTitulo(elegiblesIndividuales);

  if (ganadorIndividual) {
    await registrarTitulo(
      "id_titulo_individual",
      ganadorIndividual,
      "individual"
    );
  }
  }

  return titulosGanados;
}






//
// ============================================================================
// PUNTAJE FINAL DE LA PARTIDA
//
// Liquidación al terminar: suma los puntos_campeon acumulados por títulos
// más un SUPLEMENTO calculado con las stats recolectadas durante la
// carrera (fama, plata, idolatría, goles, asistencias, GRL).
// Devuelve el desglose por jugador y actualiza el ganador de la partida.
// ============================================================================
//
app.get("/partidas/:idPartida/puntajeFinal", async (req, res) => {
  try {
    if (!req.session.usuario) {
      return res.status(401).json({ error: "Tenés que iniciar sesión" });
    }

    const idPartida = Number(req.params.idPartida);
    if (!Number.isInteger(idPartida) || idPartida <= 0) {
      return res.status(400).json({ error: "Identificador de partida inválido" });
    }

    const participantes = await mysql.realizarQuery(
      `SELECT
            pp.id_participante,
            pp.id_usuario,
            pp.nombre_leyenda,
            pp.puntos_campeon,
            pp.goles,
            pp.asistencias,
            pp.partidos_jugados,
            pp.fama,
            pp.plata,
            pp.idolatria,
            pp.grl,
            pp.posicion_actual,
            u.nombre_usuario
         FROM ParticipantePartida pp
         INNER JOIN Usuario u ON u.id_usuario = pp.id_usuario
         WHERE pp.id_partida = ?`,
      [idPartida]
    );

    if (!participantes || participantes.length === 0) {
      return res.status(404).json({ error: "La partida no existe" });
    }

    // Suplemento por stats: proporciones pensadas para que ningún
    // valor domine solo (fama y rendimiento pesan más que la plata).
    const pesos = {
      goles: 4,
      asistencias: 3,
      fama: 1.5,
      plata: 0.05,
      idolatria: 1,
      grl: 2
    };

    const puntajes = participantes.map((p) => {
      const suplemento =
        Number(p.goles ?? 0) * pesos.goles +
        Number(p.asistencias ?? 0) * pesos.asistencias +
        Number(p.fama ?? 0) * pesos.fama +
        Number(p.plata ?? 0) * pesos.plata +
        Number(p.idolatria ?? 0) * pesos.idolatria +
        Number(p.grl ?? 0) * pesos.grl;

      const puntosPorTitulos = Number(p.puntos_campeon ?? 0);

      return {
        id_participante: p.id_participante,
        id_usuario: p.id_usuario,
        nombre_usuario: p.nombre_usuario,
        nombre_leyenda: p.nombre_leyenda,
        puntos_por_titulos: puntosPorTitulos,
        suplemento_stats: Math.round(suplemento),
        puntaje_final: puntosPorTitulos + Math.round(suplemento),
        desglose: {
          goles: Number(p.goles ?? 0),
          asistencias: Number(p.asistencias ?? 0),
          fama: Number(p.fama ?? 0),
          plata: Number(p.plata ?? 0),
          idolatria: Number(p.idolatria ?? 0),
          grl: Number(p.grl ?? 0)
        }
      };
    });

    puntajes.sort((a, b) => b.puntaje_final - a.puntaje_final);

    const ganador = puntajes[0] || null;

    // Persistimos al ganador si la partida todavía no lo tiene.
    if (ganador) {
      await mysql.realizarQuery(
        `UPDATE Partida
            SET id_ganador = ?,
                estado = 'finalizada',
                fecha_fin = COALESCE(fecha_fin, NOW())
          WHERE id_partida = ?
            AND id_ganador IS NULL`,
        [ganador.id_usuario, idPartida]
      );
    }

    return res.status(200).json({
      idPartida,
      puntajes,
      ganador
    });

  } catch (error) {
    console.error("Error al calcular el puntaje final:", error);
    return res.status(500).json({ error: "Error al calcular el puntaje final" });
  }
});

//
// ============================================================================
// RUTAS DEL PANEL DE ADMINISTRACIÓN
// Todas requieren sesión iniciada con rol "admin" (middleware requireAdmin).
// ============================================================================
//

//
// GESTIÓN DE USUARIOS
//

// LISTAR USUARIOS (sin mostrar contraseñas)
app.get("/admin/usuarios", requireAdmin, async (req, res) => {
  try {
    const usuarios = await mysql.realizarQuery(
      `SELECT id_usuario, nombre_usuario, email, rol, fecha_registro
       FROM Usuario
       ORDER BY id_usuario ASC`
    );

    res.status(200).json(usuarios);
  } catch (error) {
    console.error("Error al listar usuarios:", error);

    res.status(500).json({
      error: "Error al obtener los usuarios"
    });
  }
});

// CONSULTAR UN USUARIO
app.get("/admin/usuarios/:idUsuario", requireAdmin, async (req, res) => {
  try {
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({
        error: "Identificador de usuario inválido"
      });
    }

    const usuarios = await mysql.realizarQuery(
      `SELECT id_usuario, nombre_usuario, email, rol, fecha_registro
       FROM Usuario
       WHERE id_usuario = ?`,
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: "El usuario no existe"
      });
    }

    res.status(200).json(usuarios[0]);
  } catch (error) {
    console.error("Error al consultar usuario:", error);

    res.status(500).json({
      error: "Error al obtener el usuario"
    });
  }
});

// MODIFICAR UN USUARIO (nombre, email y/o rol)
app.put("/admin/usuarios/:idUsuario", requireAdmin, async (req, res) => {
  try {
    const idUsuario = Number(req.params.idUsuario);
    const { nombre_usuario, email, rol } = req.body;

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({
        error: "Identificador de usuario inválido"
      });
    }

    const usuarios = await mysql.realizarQuery(
      "SELECT id_usuario, rol FROM Usuario WHERE id_usuario = ?",
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: "El usuario no existe"
      });
    }

    // No permitimos que el admin quite su propio rol admin
    // ni se elimine a sí mismo si es el único administrador.
    if (usuarios[0].rol === "admin" && usuarios[0].id_usuario === req.session.usuario.id_usuario) {
      if (rol && rol !== "admin") {
        return res.status(400).json({
          error: "No podés quitarte tu propio rol de administrador"
        });
      }
    }

    if (rol && rol !== "jugador" && rol !== "admin") {
      return res.status(400).json({
        error: "El rol solo puede ser jugador o admin"
      });
    }

    const campos = [];
    const valores = [];

    if (nombre_usuario !== undefined) {
      const nombre = String(nombre_usuario).trim();
      if (!nombre || nombre.length > 50) {
        return res.status(400).json({
          error: "El nombre de usuario debe tener entre 1 y 50 caracteres"
        });
      }
      campos.push("nombre_usuario = ?");
      valores.push(nombre);
    }

    if (email !== undefined) {
      const correo = String(email).trim().toLowerCase();
      if (!correo || correo.length > 100) {
        return res.status(400).json({
          error: "El email debe tener entre 1 y 100 caracteres"
        });
      }

      // Verificamos que el nuevo email no lo use otro usuario.
      const emailEnUso = await mysql.realizarQuery(
        "SELECT id_usuario FROM Usuario WHERE email = ? AND id_usuario <> ?",
        [correo, idUsuario]
      );

      if (emailEnUso.length > 0) {
        return res.status(400).json({
          error: "Ese email ya está registrado por otro usuario"
        });
      }

      campos.push("email = ?");
      valores.push(correo);
    }

    if (rol !== undefined) {
      campos.push("rol = ?");
      valores.push(rol);
    }

    if (campos.length === 0) {
      return res.status(400).json({
        error: "No hay datos para modificar"
      });
    }

    valores.push(idUsuario);

    await mysql.realizarQuery(
      `UPDATE Usuario SET ${campos.join(", ")} WHERE id_usuario = ?`,
      valores
    );

    res.status(200).json({
      mensaje: "Usuario modificado correctamente"
    });
  } catch (error) {
    console.error("Error al modificar usuario:", error);

    res.status(500).json({
      error: "Error al modificar el usuario"
    });
  }
});

// ELIMINAR UN USUARIO
app.delete("/admin/usuarios/:idUsuario", requireAdmin, async (req, res) => {
  try {
    const idUsuario = Number(req.params.idUsuario);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
      return res.status(400).json({
        error: "Identificador de usuario inválido"
      });
    }

    if (idUsuario === Number(req.session.usuario.id_usuario)) {
      return res.status(400).json({
        error: "No podés eliminar tu propia cuenta"
      });
    }

    const usuarios = await mysql.realizarQuery(
      "SELECT id_usuario FROM Usuario WHERE id_usuario = ?",
      [idUsuario]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        error: "El usuario no existe"
      });
    }

    await mysql.realizarQuery(
      "DELETE FROM Usuario WHERE id_usuario = ?",
      [idUsuario]
    );

    res.status(200).json({
      mensaje: "Usuario eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);

    // Si el usuario participó de partidas, la clave foránea impide el borrado.
    if (error && error.errno === 1451) {
      return res.status(409).json({
        error: "El usuario participa de partidas registradas y no puede eliminarse"
      });
    }

    res.status(500).json({
      error: "Error al eliminar el usuario"
    });
  }
});

//
// GESTIÓN DE EVENTOS
//

// LISTAR EVENTOS
app.get("/admin/eventos", requireAdmin, async (req, res) => {
  try {
    const eventos = await mysql.realizarQuery(
      `SELECT id_evento, nombre, descripcion, categoria,
              efecto_fama, efecto_plata, efecto_idolatria,
              bloquea_avance, peso, turnos_perdidos,
              temporada_minima, temporada_maxima,
              requiere_lesion, requiere_seleccion,
              bloquea_si_lesionado, cooldown_temporadas
       FROM Evento
       ORDER BY id_evento ASC`
    );

    res.status(200).json(eventos);
  } catch (error) {
    console.error("Error al listar eventos:", error);

    res.status(500).json({
      error: "Error al obtener los eventos"
    });
  }
});

// CONSULTAR UN EVENTO
app.get("/admin/eventos/:idEvento", requireAdmin, async (req, res) => {
  try {
    const idEvento = Number(req.params.idEvento);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      return res.status(400).json({
        error: "Identificador de evento inválido"
      });
    }

    const eventos = await mysql.realizarQuery(
      "SELECT * FROM Evento WHERE id_evento = ?",
      [idEvento]
    );

    if (eventos.length === 0) {
      return res.status(404).json({
        error: "El evento no existe"
      });
    }

    res.status(200).json(eventos[0]);
  } catch (error) {
    console.error("Error al consultar evento:", error);

    res.status(500).json({
      error: "Error al obtener el evento"
    });
  }
});

// CREAR UN EVENTO
app.post("/admin/eventos", requireAdmin, async (req, res) => {
  try {
    const {
      nombre, descripcion, categoria,
      efecto_fama, efecto_plata, efecto_idolatria,
      bloquea_avance, peso, turnos_perdidos
    } = req.body;

    if (!nombre || !descripcion || !categoria) {
      return res.status(400).json({
        error: "Faltan datos obligatorios del evento (nombre, descripcion, categoria)"
      });
    }

    const nombreEvento = String(nombre).trim();
    const descripcionEvento = String(descripcion).trim();
    const categoriaEvento = String(categoria).trim();

    if (nombreEvento.length > 100) {
      return res.status(400).json({
        error: "El nombre no puede superar los 100 caracteres"
      });
    }

    // Verificamos que no exista otro evento con el mismo nombre.
    const eventoExistente = await mysql.realizarQuery(
      "SELECT id_evento FROM Evento WHERE nombre = ?",
      [nombreEvento]
    );

    if (eventoExistente.length > 0) {
      return res.status(400).json({
        error: "Ya existe un evento con ese nombre"
      });
    }

    const idEvento = await mysql.realizarQueryInsert(
      `INSERT INTO Evento
        (nombre, descripcion, categoria,
         efecto_fama, efecto_plata, efecto_idolatria,
         bloquea_avance, peso, turnos_perdidos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombreEvento,
        descripcionEvento,
        categoriaEvento,
        Number(efecto_fama) || 0,
        Number(efecto_plata) || 0,
        Number(efecto_idolatria) || 0,
        bloquea_avance ? 1 : 0,
        Number(peso) > 0 ? Number(peso) : 10,
        Math.max(0, Number(turnos_perdidos) || 0)
      ]
    );

    res.status(201).json({
      mensaje: "Evento creado correctamente",
      id_evento: idEvento
    });
  } catch (error) {
    console.error("Error al crear evento:", error);

    res.status(500).json({
      error: "Error al crear el evento"
    });
  }
});

// MODIFICAR UN EVENTO
app.put("/admin/eventos/:idEvento", requireAdmin, async (req, res) => {
  try {
    const idEvento = Number(req.params.idEvento);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      return res.status(400).json({
        error: "Identificador de evento inválido"
      });
    }

    const eventos = await mysql.realizarQuery(
      "SELECT id_evento FROM Evento WHERE id_evento = ?",
      [idEvento]
    );

    if (eventos.length === 0) {
      return res.status(404).json({
        error: "El evento no existe"
      });
    }

    // Armamos dinámicamente solo los campos que llegaron en el pedido.
    const camposPermitidos = {
      nombre: "nombre",
      descripcion: "descripcion",
      categoria: "categoria",
      efecto_fama: "efecto_fama",
      efecto_plata: "efecto_plata",
      efecto_idolatria: "efecto_idolatria",
      bloquea_avance: "bloquea_avance",
      peso: "peso",
      turnos_perdidos: "turnos_perdidos"
    };

    const asignaciones = [];
    const valores = [];

    for (const [clave, columna] of Object.entries(camposPermitidos)) {
      if (req.body[clave] === undefined) continue;

      if (clave === "nombre") {
        const nombreEvento = String(req.body.nombre).trim();
        if (!nombreEvento || nombreEvento.length > 100) {
          return res.status(400).json({
            error: "El nombre debe tener entre 1 y 100 caracteres"
          });
        }

        const repetido = await mysql.realizarQuery(
          "SELECT id_evento FROM Evento WHERE nombre = ? AND id_evento <> ?",
          [nombreEvento, idEvento]
        );

        if (repetido.length > 0) {
          return res.status(400).json({
            error: "Ya existe otro evento con ese nombre"
          });
        }

        asignaciones.push(`${columna} = ?`);
        valores.push(nombreEvento);
        continue;
      }

      if (clave === "descripcion" || clave === "categoria") {
        const texto = String(req.body[clave]).trim();
        if (!texto) {
          return res.status(400).json({
            error: `El campo ${clave} no puede quedar vacío`
          });
        }

        asignaciones.push(`${columna} = ?`);
        valores.push(texto);
        continue;
      }

      // Campos numéricos / booleanos.
      if (clave === "bloquea_avance") {
        asignaciones.push(`${columna} = ?`);
        valores.push(req.body[clave] ? 1 : 0);
      } else {
        asignaciones.push(`${columna} = ?`);
        valores.push(Number(req.body[clave]) || 0);
      }
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({
        error: "No hay datos para modificar"
      });
    }

    valores.push(idEvento);

    await mysql.realizarQuery(
      `UPDATE Evento SET ${asignaciones.join(", ")} WHERE id_evento = ?`,
      valores
    );

    res.status(200).json({
      mensaje: "Evento modificado correctamente"
    });
  } catch (error) {
    console.error("Error al modificar evento:", error);

    res.status(500).json({
      error: "Error al modificar el evento"
    });
  }
});

// ELIMINAR UN EVENTO
app.delete("/admin/eventos/:idEvento", requireAdmin, async (req, res) => {
  try {
    const idEvento = Number(req.params.idEvento);

    if (!Number.isInteger(idEvento) || idEvento <= 0) {
      return res.status(400).json({
        error: "Identificador de evento inválido"
      });
    }

    const eventos = await mysql.realizarQuery(
      "SELECT id_evento FROM Evento WHERE id_evento = ?",
      [idEvento]
    );

    if (eventos.length === 0) {
      return res.status(404).json({
        error: "El evento no existe"
      });
    }

    // No se puede eliminar si ya ocurrió en alguna partida (clave foránea).
    await mysql.realizarQuery(
      "DELETE FROM Evento WHERE id_evento = ?",
      [idEvento]
    );

    res.status(200).json({
      mensaje: "Evento eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar evento:", error);

    if (error && error.errno === 1451) {
      return res.status(409).json({
        error: "El evento ya ocurrió en partidas registradas y no puede eliminarse"
      });
    }

    res.status(500).json({
      error: "Error al eliminar el evento"
    });
  }
});

//
// GESTIÓN DE TÍTULOS (locales/nacionales, individuales e internacionales)
// Solo permite consultar, modificar y eliminar (no crear) desde el panel.
//

// Helpers compartidos por las tres tablas de títulos.
// Cada tabla tiene su propio id y columnas particulares.
const TABLAS_TITULOS = {
  nacionales: {
    tabla: "Titulo",
    id: "id_titulo",
    camposTexto: ["nombre", "pais", "imagen"],
    camposNumero: ["puntos_campeon", "prestigio"]
  },
  individuales: {
    tabla: "TituloIndividual",
    id: "id_titulo_individual",
    camposTexto: ["nombre", "imagen"],
    camposNumero: ["puntos_campeon", "prestigio"]
  },
  internacionales: {
    tabla: "TituloInternacional",
    id: "id_titulo_internacional",
    camposTexto: ["nombre", "continente", "imagen"],
    camposNumero: ["puntos_campeon", "prestigio"]
  }
};

// Valida y normaliza los campos recibidos según la tabla.
// Devuelve { asignaciones, valores, error }.
function armarCamposTitulo(config, cuerpo) {
  const asignaciones = [];
  const valores = [];

  for (const campo of config.camposTexto) {
    if (cuerpo[campo] === undefined) continue;

    const texto = String(cuerpo[campo]).trim();

    // nombre y continente son obligatorios; pais e imagen pueden quedar vacíos.
    const obligatorio = campo === "nombre" || campo === "continente";
    if (obligatorio && !texto) {
      return { error: `El campo ${campo} no puede quedar vacío` };
    }

    asignaciones.push(`${campo} = ?`);
    valores.push(texto === "" ? null : texto);
  }

  for (const campo of config.camposNumero) {
    if (cuerpo[campo] === undefined) continue;

    const numero = Number(cuerpo[campo]);
    if (!Number.isFinite(numero)) {
      return { error: `El campo ${campo} debe ser un número` };
    }

    asignaciones.push(`${campo} = ?`);
    valores.push(campo === "puntos_campeon" ? Math.trunc(numero) : numero);
  }

  return { asignaciones, valores };
}

// LISTAR TÍTULOS
app.get("/admin/titulos/:tipo", requireAdmin, async (req, res) => {
  try {
    const config = TABLAS_TITULOS[req.params.tipo];

    if (!config) {
      return res.status(400).json({
        error: "Tipo de título inválido"
      });
    }

    const titulos = await mysql.realizarQuery(
      `SELECT * FROM ${config.tabla} ORDER BY ${config.id} ASC`
    );

    res.status(200).json(titulos);
  } catch (error) {
    console.error("Error al listar títulos:", error);

    res.status(500).json({
      error: "Error al obtener los títulos"
    });
  }
});

// CONSULTAR UN TÍTULO
app.get("/admin/titulos/:tipo/:id", requireAdmin, async (req, res) => {
  try {
    const config = TABLAS_TITULOS[req.params.tipo];
    const id = Number(req.params.id);

    if (!config) {
      return res.status(400).json({ error: "Tipo de título inválido" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador de título inválido" });
    }

    const titulos = await mysql.realizarQuery(
      `SELECT * FROM ${config.tabla} WHERE ${config.id} = ?`,
      [id]
    );

    if (titulos.length === 0) {
      return res.status(404).json({ error: "El título no existe" });
    }

    res.status(200).json(titulos[0]);
  } catch (error) {
    console.error("Error al consultar título:", error);

    res.status(500).json({
      error: "Error al obtener el título"
    });
  }
});

// MODIFICAR UN TÍTULO
app.put("/admin/titulos/:tipo/:id", requireAdmin, async (req, res) => {
  try {
    const config = TABLAS_TITULOS[req.params.tipo];
    const id = Number(req.params.id);

    if (!config) {
      return res.status(400).json({ error: "Tipo de título inválido" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador de título inválido" });
    }

    const existentes = await mysql.realizarQuery(
      `SELECT ${config.id} FROM ${config.tabla} WHERE ${config.id} = ?`,
      [id]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: "El título no existe" });
    }

    const campos = armarCamposTitulo(config, req.body);

    if (campos.error) {
      return res.status(400).json({ error: campos.error });
    }

    if (campos.asignaciones.length === 0) {
      return res.status(400).json({ error: "No hay datos para modificar" });
    }

    // El nombre no puede repetirse dentro de la misma tabla.
    if (req.body.nombre !== undefined) {
      const repetido = await mysql.realizarQuery(
        `SELECT ${config.id} FROM ${config.tabla} WHERE nombre = ? AND ${config.id} <> ?`,
        [String(req.body.nombre).trim(), id]
      );

      if (repetido.length > 0) {
        return res.status(400).json({
          error: "Ya existe otro título con ese nombre"
        });
      }
    }

    const valores = [...campos.valores, id];

    await mysql.realizarQuery(
      `UPDATE ${config.tabla} SET ${campos.asignaciones.join(", ")} WHERE ${config.id} = ?`,
      valores
    );

    res.status(200).json({
      mensaje: "Título modificado correctamente"
    });
  } catch (error) {
    console.error("Error al modificar título:", error);

    res.status(500).json({
      error: "Error al modificar el título"
    });
  }
});

// ELIMINAR UN TÍTULO
app.delete("/admin/titulos/:tipo/:id", requireAdmin, async (req, res) => {
  try {
    const config = TABLAS_TITULOS[req.params.tipo];
    const id = Number(req.params.id);

    if (!config) {
      return res.status(400).json({ error: "Tipo de título inválido" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador de título inválido" });
    }

    const existentes = await mysql.realizarQuery(
      `SELECT ${config.id} FROM ${config.tabla} WHERE ${config.id} = ?`,
      [id]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: "El título no existe" });
    }

    await mysql.realizarQuery(
      `DELETE FROM ${config.tabla} WHERE ${config.id} = ?`,
      [id]
    );

    res.status(200).json({
      mensaje: "Título eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar título:", error);

    // El título ya fue otorgado en alguna partida (clave foránea).
    if (error && error.errno === 1451) {
      return res.status(409).json({
        error: "El título ya fue ganado en partidas registradas y no puede eliminarse"
      });
    }

    res.status(500).json({
      error: "Error al eliminar el título"
    });
  }
});

//
// GESTIÓN DE CLUBES Y LIGAS (solo modificar y eliminar)
//

// LISTAR CLUBES
app.get("/admin/clubes", requireAdmin, async (req, res) => {
  try {
    const clubes = await mysql.realizarQuery(
      `SELECT id_club, nombre, liga, jerarquia, copa_internacional, descripcion
       FROM Club
       ORDER BY liga ASC, nombre ASC`
    );

    res.status(200).json(clubes);
  } catch (error) {
    console.error("Error al listar clubes:", error);

    res.status(500).json({
      error: "Error al obtener los clubes"
    });
  }
});

// MODIFICAR UN CLUB
app.put("/admin/clubes/:idClub", requireAdmin, async (req, res) => {
  try {
    const idClub = Number(req.params.idClub);

    if (!Number.isInteger(idClub) || idClub <= 0) {
      return res.status(400).json({ error: "Identificador de club inválido" });
    }

    const existentes = await mysql.realizarQuery(
      "SELECT id_club FROM Club WHERE id_club = ?",
      [idClub]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: "El club no existe" });
    }

    const { nombre, liga, jerarquia, copa_internacional, descripcion } = req.body;
    const asignaciones = [];
    const valores = [];

    if (nombre !== undefined) {
      const texto = String(nombre).trim();

      if (!texto) {
        return res.status(400).json({
          error: "El nombre del club no puede quedar vacío"
        });
      }

      asignaciones.push("nombre = ?");
      valores.push(texto);
    }

    if (liga !== undefined) {
      const texto = String(liga).trim();

      asignaciones.push("liga = ?");
      valores.push(texto === "" ? null : texto);
    }

    if (jerarquia !== undefined) {
      const numero = Number(jerarquia);

      if (!Number.isFinite(numero)) {
        return res.status(400).json({
          error: "La jerarquía debe ser un número"
        });
      }

      asignaciones.push("jerarquia = ?");
      valores.push(Math.trunc(numero));
    }

    if (copa_internacional !== undefined) {
      asignaciones.push("copa_internacional = ?");
      valores.push(copa_internacional ? 1 : 0);
    }

    if (descripcion !== undefined) {
      asignaciones.push("descripcion = ?");
      valores.push(String(descripcion).trim());
    }

    if (asignaciones.length === 0) {
      return res.status(400).json({ error: "No hay datos para modificar" });
    }

    valores.push(idClub);

    await mysql.realizarQuery(
      `UPDATE Club SET ${asignaciones.join(", ")} WHERE id_club = ?`,
      valores
    );

    res.status(200).json({
      mensaje: "Club modificado correctamente"
    });
  } catch (error) {
    console.error("Error al modificar club:", error);

    res.status(500).json({
      error: "Error al modificar el club"
    });
  }
});

// ELIMINAR UN CLUB
app.delete("/admin/clubes/:idClub", requireAdmin, async (req, res) => {
  try {
    const idClub = Number(req.params.idClub);

    if (!Number.isInteger(idClub) || idClub <= 0) {
      return res.status(400).json({ error: "Identificador de club inválido" });
    }

    const existentes = await mysql.realizarQuery(
      "SELECT id_club FROM Club WHERE id_club = ?",
      [idClub]
    );

    if (existentes.length === 0) {
      return res.status(404).json({ error: "El club no existe" });
    }

    await mysql.realizarQuery(
      "DELETE FROM Club WHERE id_club = ?",
      [idClub]
    );

    res.status(200).json({
      mensaje: "Club eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar club:", error);

    if (error && error.errno === 1451) {
      return res.status(409).json({
        error: "El club está asociado a partidas registradas y no puede eliminarse"
      });
    }

    res.status(500).json({
      error: "Error al eliminar el club"
    });
  }
});

// LISTAR LIGAS (son la columna Club.liga agrupada)
app.get("/admin/ligas", requireAdmin, async (req, res) => {
  try {
    const ligas = await mysql.realizarQuery(
      `SELECT liga, COUNT(*) AS cantidad_clubes
       FROM Club
       WHERE liga IS NOT NULL AND liga <> ''
       GROUP BY liga
       ORDER BY liga ASC`
    );

    res.status(200).json(ligas);
  } catch (error) {
    console.error("Error al listar ligas:", error);

    res.status(500).json({
      error: "Error al obtener las ligas"
    });
  }
});

// RENOMBRAR UNA LIGA (actualiza a todos los clubes que la usan)
app.put("/admin/ligas/:nombreLiga", requireAdmin, async (req, res) => {
  try {
    const nombreLiga = decodeURIComponent(req.params.nombreLiga);
    const nuevoNombre = String(req.body.nuevo_nombre ?? "").trim();

    if (!nuevoNombre) {
      return res.status(400).json({
        error: "El nuevo nombre de la liga no puede quedar vacío"
      });
    }

    if (nuevoNombre.length > 100) {
      return res.status(400).json({
        error: "El nombre de la liga no puede superar los 100 caracteres"
      });
    }

    const clubes = await mysql.realizarQuery(
      "SELECT id_club FROM Club WHERE liga = ?",
      [nombreLiga]
    );

    if (clubes.length === 0) {
      return res.status(404).json({ error: "La liga no existe" });
    }

    if (nuevoNombre !== nombreLiga) {
      const colision = await mysql.realizarQuery(
        "SELECT id_club FROM Club WHERE liga = ? LIMIT 1",
        [nuevoNombre]
      );

      if (colision.length > 0) {
        return res.status(409).json({
          error: "Ya existe otra liga con ese nombre"
        });
      }
    }

    await mysql.realizarQuery(
      "UPDATE Club SET liga = ? WHERE liga = ?",
      [nuevoNombre, nombreLiga]
    );

    res.status(200).json({
      mensaje: `Liga renombrada para ${clubes.length} club(es)`,
      cantidad_clubes: clubes.length,
      nombre_ligas: nuevoNombre
    });
  } catch (error) {
    console.error("Error al renombrar liga:", error);

    res.status(500).json({
      error: "Error al modificar la liga"
    });
  }
});

// ELIMINAR UNA LIGA (deja a los clubes sin liga)
app.delete("/admin/ligas/:nombreLiga", requireAdmin, async (req, res) => {
  try {
    const nombreLiga = decodeURIComponent(req.params.nombreLiga);

    const clubes = await mysql.realizarQuery(
      "SELECT id_club FROM Club WHERE liga = ?",
      [nombreLiga]
    );

    if (clubes.length === 0) {
      return res.status(404).json({ error: "La liga no existe" });
    }

    await mysql.realizarQuery(
      "UPDATE Club SET liga = NULL WHERE liga = ?",
      [nombreLiga]
    );

    res.status(200).json({
      mensaje: `Liga eliminada. ${clubes.length} club(es) quedaron sin liga.`,
      cantidad_clubes: clubes.length
    });
  } catch (error) {
    console.error("Error al eliminar liga:", error);

    res.status(500).json({
      error: "Error al eliminar la liga"
    });
  }
});

//
// CONSULTA DE PARTIDAS (solo lectura para el admin)
//

// LISTAR TODAS LAS PARTIDAS
app.get("/admin/partidas", requireAdmin, async (req, res) => {
  try {
    const partidas = await mysql.realizarQuery(
      `SELECT
          p.id_partida,
          p.nombre_sala,
          p.estado,
          p.fecha_inicio,
          p.fecha_fin,
          u.nombre_usuario AS nombre_ganador,
          COUNT(pp.id_participante) AS cantidad_participantes
       FROM Partida p
       LEFT JOIN Usuario u ON u.id_usuario = p.id_ganador
       LEFT JOIN ParticipantePartida pp ON pp.id_partida = p.id_partida
       GROUP BY p.id_partida, p.nombre_sala, p.estado,
                p.fecha_inicio, p.fecha_fin, u.nombre_usuario
       ORDER BY p.fecha_inicio DESC`
    );

    res.status(200).json(partidas);
  } catch (error) {
    console.error("Error al listar partidas:", error);

    res.status(500).json({
      error: "Error al obtener las partidas"
    });
  }
});

// CONSULTAR EL DETALLE DE UNA PARTIDA
app.get("/admin/partidas/:idPartida", requireAdmin, async (req, res) => {
  try {
    const idPartida = Number(req.params.idPartida);

    if (!Number.isInteger(idPartida) || idPartida <= 0) {
      return res.status(400).json({
        error: "Identificador de partida inválido"
      });
    }

    const partidas = await mysql.realizarQuery(
      `SELECT
          p.id_partida,
          p.nombre_sala,
          p.estado,
          p.fecha_inicio,
          p.fecha_fin,
          u.nombre_usuario AS nombre_ganador
       FROM Partida p
       LEFT JOIN Usuario u ON u.id_usuario = p.id_ganador
       WHERE p.id_partida = ?`,
      [idPartida]
    );

    if (partidas.length === 0) {
      return res.status(404).json({
        error: "La partida no existe"
      });
    }

    // Participantes y sus estadísticas finales.
    const participantes = await mysql.realizarQuery(
      `SELECT
          pp.id_participante,
          pp.id_usuario,
          u.nombre_usuario,
          pp.nombre_leyenda,
          pp.posicion_actual,
          pp.goles,
          pp.asistencias,
          pp.fama,
          pp.plata,
          pp.idolatria,
          pp.turno
       FROM ParticipantePartida pp
       INNER JOIN Usuario u ON u.id_usuario = pp.id_usuario
       WHERE pp.id_partida = ?`,
      [idPartida]
    );

    // Eventos que ocurrieron durante la partida, si la tabla existe.
    let eventos = [];
    try {
      eventos = await mysql.realizarQuery(
        `SELECT
            hp.id_evento,
            e.nombre AS nombre_evento,
            hp.posicion
         FROM HistorialEvento hp
         INNER JOIN Evento e ON e.id_evento = hp.id_evento
         WHERE hp.id_participante IN (
             SELECT id_participante FROM ParticipantePartida WHERE id_partida = ?
         )
         ORDER BY hp.posicion ASC`,
        [idPartida]
      );
    } catch (errorHistorial) {
      // Si la tabla de historial no existe en el esquema, seguimos sin eventos.
      eventos = [];
    }

    res.status(200).json({
      partida: partidas[0],
      participantes,
      eventos
    });
  } catch (error) {
    console.error("Error al consultar partida:", error);

    res.status(500).json({
      error: "Error al obtener la partida"
    });
  }
});
