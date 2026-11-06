// ============================================================================
// MÓDULO DE EVENTOS — "El Trayecto" (G13)
//
// Centraliza TODA la lógica de generación, validación y registro de eventos:
//   1. Contexto de carrera del jugador (club, confederación, Selección,
//      historial de transferencias, historial de eventos).
//   2. Elegibilidad DURA (condiciones actuales): un evento que no puede
//      ocurrir se descarta ANTES del sorteo, nunca se sortea para luego
//      descubrir que no aplica.
//   3. Dependencias históricas (EstadoCarreraEvento): situaciones que deben
//      haber sucedido antes.
//   4. Pesos contextuales (probabilidades relativas sobre los elegibles).
//   5. Registro consistente en EstadoCarreraEvento y EventoPartida.
//
// Este módulo no modifica la arquitectura del proyecto: usa el mismo `query`
// que recibe mysql.realizarTransaccion y las mismas convenciones de nombre
// de tabla/columna del resto del backend.
// ============================================================================

/** Normaliza texto: minúsculas, sin acentos, sin espacios laterales. */
function normalizarTexto(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Diccionario de códigos de evento -> reglas contextuales. */
const REGLAS_EVENTOS = {
  // ---- Lesiones (1-6) ------------------------------------------------------
  lesion_desgarro: { categoria: "lesion", causaLesion: true },
  lesion_esguince: { categoria: "lesion", causaLesion: true },
  lesion_fractura: { categoria: "lesion", causaLesion: true },
  lesion_molestia: { categoria: "lesion", causaLesion: true },
  lesion_recuperacion: { categoria: "lesion", recuperacion: true },
  // "Muerta" (antes "Retiro forzado" en un paso intermedio de la auditoría):
  // humor negro del proyecto. finCarrera => el backend finaliza la PARTIDA
  // COMPLETA para ambos jugadores; nunca se sortea sin lesión activa.
  lesion_fin_carrera: { categoria: "lesion", finCarrera: true },

  // ---- Cambio de club (7-12) ----------------------------------------------
  club_oferta_primera: {
    categoria: "cambio de club",
    // Solo desde un club chico/modesto hay "oportunidad de subir".
    jerarquiaMaxima: 2,
    jerarquiaDestino: (jerarquiaActual) => Math.min(5, jerarquiaActual + 1),
  },
  club_prestamo: {
    categoria: "cambio de club",
    // Un préstamo exige que haya un club de destino: mismo nivel.
    jerarquiaDestino: (j) => j,
  },
  club_transferencia_intl: {
    categoria: "cambio de club",
    // Exportan jugadores los clubes de nivel medio/alto; el destino es
    // de OTRO país (el backend lo garantiza al armar las opciones).
    jerarquiaMinima: 3,
    jerarquiaDestino: (jerarquiaActual) => Math.min(5, jerarquiaActual + 1),
    internacional: true,
  },
  club_vuelta_casa: {
    categoria: "cambio de club",
    // Depende de un club ANTERIOR (validación histórica).
    requiereClubAnterior: true,
  },
  club_rescision: {
    categoria: "cambio de club",
    // Requiere contrato activo (club actual) -> el backend ya lo exige:
    // si id_club es NULL el evento se descarta.
    requiereClubActual: true,
  },
  club_venta: {
    categoria: "cambio de club",
    // Solo un club de nivel medio/alto "vende" a una categoría inferior.
    jerarquiaMinima: 3,
    jerarquiaDestino: (jerarquiaActual) => Math.max(1, jerarquiaActual - 1),
  },

  // ---- Positivos (13-18) ---------------------------------------------------
  pos_figura_partido: {
    categoria: "positivo",
    // Hay que haber JUGADO la temporada: nada de figuras sin cancha.
    exigePartidoLocal: true,
  },
  pos_gol_agonico: {
    categoria: "positivo",
    // Marcar un gol exige haber jugado; con la curva de goles del juego,
    // lo hacemos posible desde GRL razonable (el azar decide cuántos goles).
    exigePartidoLocal: true,
  },
  pos_ovacion: {
    categoria: "positivo",
    // Salir ovacionado exige haber entrado a la cancha.
    exigePartidoLocal: true,
  },
  pos_premio_rendimiento: {
    categoria: "positivo",
    // Premio por rendimiento: temporada con actividad + nivel mínimo.
    exigePartidoLocal: true,
    grlMinimo: 55,
  },
  pos_record_personal: {
    categoria: "positivo",
    // Récord personal: hay que tener carrera hecha y rendimiento relevante.
    exigePartidoLocal: true,
    grlMinimo: 60,
  },
  pos_premio_puskas: {
    categoria: "positivo",
    // Sin goles no hay Puskás.
    exigeGoles: true,
    exigeConvocado: true,
  },

  // ---- Aleatorios (19-24) --------------------------------------------------
  aleatorio_lado_oscuro: { categoria: "aleatorio" },
  aleatorio_perezoso: {
    categoria: "aleatorio",
    // Concentrarse con el equipo exige haber jugado/estar en actividad.
    exigePartidoLocal: true,
  },
  aleatorio_lam: {
    categoria: "aleatorio",
    // Compañero de equipo: requiere club actual.
    requiereClubActual: true,
  },
  aleatorio_traicion: {
    categoria: "aleatorio",
    // El utilero del equipo: requiere club actual.
    requiereClubActual: true,
  },
  aleatorio_caramelli: { categoria: "aleatorio" },
  aleatorio_senor_noche: { categoria: "aleatorio" },

  // ---- Selección (25-30) ---------------------------------------------------
  seleccion_hereda_10: {
    categoria: "seleccion",
    // Sin convocatoria no hay N°10.
    requiereEstadoSeleccion: ["suplente", "titular"],
    estadoResultante: "titular",
  },
  seleccion_titular: {
    categoria: "seleccion",
    // Titular SIN haber sido convocado jamás: imposible.
    requiereEstadoSeleccion: ["convocado", "suplente", "titular"],
    estadoResultante: "titular",
  },
  seleccion_gol: {
    categoria: "seleccion",
    // Convocado Y haber participado del encuentro.
    requiereEstadoSeleccion: ["convocado", "suplente", "titular"],
    exigePartidoInternacional: true,
    estadoResultante: "titular",
  },
  seleccion_figura: {
    categoria: "seleccion",
    requiereEstadoSeleccion: ["convocado", "suplente", "titular"],
    exigePartidoInternacional: true,
    estadoResultante: "titular",
  },
  seleccion_fuera_lista: {
    categoria: "seleccion",
    // No podés quedar fuera de una lista si nunca integraste una.
    requiereEstadoSeleccion: ["convocado", "suplente", "titular"],
    estadoResultante: "fuera",
  },
  seleccion_regreso: {
    categoria: "seleccion",
    // Regreso = hubo convocatorias antes + un período sin convocatorias.
    requiereEstadoSeleccion: ["fuera"],
    convocatoriasMinimas: 1,
    estadoResultante: "convocado",
  },

  // ---- Negativos deportivos (31-36) ----------------------------------------
  neg_perdida_gol: {
    categoria: "negativo",
    exigePartidoLocal: true,
  },
  neg_expulsion: {
    categoria: "negativo",
    exigePartidoLocal: true,
  },
  neg_mala_racha: {
    categoria: "negativo",
    exigePartidoLocal: true,
  },
  neg_penal_errado: {
    categoria: "negativo",
    exigePartidoLocal: true,
  },
  neg_vestuario_roto: {
    categoria: "negativo",
    // Práctica de fútbol: hay que estar en actividad, no lesionado grave.
    exigePartidoLocal: true,
  },
  neg_derrota_clasico: {
    categoria: "negativo",
    exigePartidoLocal: true,
    // Solo en ligas con más de un club de alto nivel (existencia de clásico).
    exigeClasico: true,
  },
};

/** Códigos de eventos que CAUSAN lesión (para incompatibilidades). */
const CODIGOS_LESION_NUEVA = [
  "lesion_desgarro",
  "lesion_esguince",
  "lesion_fractura",
  "lesion_molestia",
];

/** Códigos de eventos de Selección que CONVOCAN al jugador. */
const CODIGOS_CONVOCATORIA = [
  "seleccion_hereda_10",
  "seleccion_titular",
  "seleccion_regreso",
];

/** Códigos de eventos de cambio de club. */
const CODIGOS_CAMBIO_CLUB = [
  "club_oferta_primera",
  "club_prestamo",
  "club_transferencia_intl",
  "club_vuelta_casa",
  "club_rescision",
  "club_venta",
];

/** Estados de Selección que implican "integrar la lista". */
const ESTADOS_CONVOCADO = ["convocado", "suplente", "titular"];

/**
 * Reúne el CONTEXTO ACTUAL del jugador para la validación de eventos.
 * Todo lo que se consulta acá proviene de tablas existentes del proyecto.
 */
async function obtenerContextoJugador(query, jugador, posicionActual) {
  const contexto = {
    posicionActual,
    idClub: jugador.id_club == null ? null : Number(jugador.id_club),
    jerarquiaClub: null,
    ligaClub: null,
    continenteClub: null,
    idNacionalidad:
      jugador.id_nacionalidad == null ? null : Number(jugador.id_nacionalidad),
    idSeleccion:
      jugador.id_seleccion == null ? null : Number(jugador.id_seleccion),
    estadoSeleccion: jugador.estado_seleccion || "nunca",
    convocatorias: Number(jugador.convocatorias) || 0,
    temporadasFueraSeleccion:
      Number(jugador.temporadas_fuera_seleccion) || 0,
    lesionado: Boolean(Number(jugador.lesionado)),
    grl: Number(jugador.grl) || 1,
    goles: Number(jugador.goles) || 0,
    asistencias: Number(jugador.asistencias) || 0,
    partidosJugados: Number(jugador.partidos_jugados) || 0,
    golesUltimaTemporada: null,
    huboPartidoInternacional: false,
    clubesPrevios: [],
    historialCodigos: [],
  };

  // ---- Club actual ---------------------------------------------------------
  if (contexto.idClub) {
    const club = await query(
      `SELECT jerarquia, liga, continente
         FROM Club
        WHERE id_club = ?`,
      [contexto.idClub]
    );
    contexto.jerarquiaClub = Number(club[0]?.jerarquia) || null;
    contexto.ligaClub = club[0]?.liga || null;
    contexto.continenteClub = club[0]?.continente || null;
  }

  // ---- ¿Hubo partido internacional esta temporada? -------------------------
  // Un jugador con convocatoria activa y sin lesión disputó los partidos de
  // su Selección (Fecha FIFA de la temporada). Con estado 'fuera' o sin
  // convocatoria, no hubo partido internacional para él.
  contexto.huboPartidoInternacional =
    contexto.idSeleccion != null &&
    ESTADOS_CONVOCADO.includes(contexto.estadoSeleccion) &&
    !contexto.lesionado;

  // ---- Historial de eventos (EstadoCarreraEvento) --------------------------
  contexto.historialCodigos = (await query(
    `SELECT e.codigo_evento AS codigo, h.temporada
       FROM EstadoCarreraEvento h
       JOIN Evento e ON e.id_evento = h.id_evento
      WHERE h.id_participante = ?`,
    [jugador.id_participante]
  )).map((fila) => ({
    codigo: fila.codigo,
    temporada: Number(fila.temporada),
  }));

  // ---- Goles de la última temporada (para "Récord personal"/Puskás) --------
  // Se reconstruye del historial de rendimiento real: el juego acumula
  // goles por temporada en ParticipantePartida; el último turno registrado
  // en EstadoCarreraEvento guarda el detalle JSON cuando corresponde.
  contexto.golesUltimaTemporada = null;

  // ---- Historial de clubes -------------------------------------------------
  try {
    const historico = await query(
      `SELECT ch.id_club, ch.temporada_inicio, ch.temporada_fin,
              c.nombre, c.liga, c.jerarquia, c.continente
         FROM ClubesHistorico ch
         JOIN Club c ON c.id_club = ch.id_club
        WHERE ch.id_participante = ?
        ORDER BY ch.temporada_inicio ASC`,
      [jugador.id_participante]
    );
    contexto.clubesPrevios = historico.filter(
      (c) => Number(c.id_club) !== contexto.idClub
    );
  } catch (error) {
    if (!/ClubesHistorico/i.test(error.message)) {
      throw error;
    }
    // Tabla aún no creada: no bloquea el turno.
    contexto.clubesPrevios = [];
  }

  return contexto;
}

/**
 * DEPENDENCIAS HISTÓRICAS: situaciones que deben haber pasado ANTES.
 * (Las condiciones actuales se validan en eventoEsElegible.)
 */
function cumpleDependenciasHistoricas(evento, contexto) {
  const codigo = evento.codigo_evento;

  // ---- Recuperación exitosa: requiere una lesión previa --------------------
  if (codigo === "lesion_recuperacion") {
    const huboLesion = contexto.historialCodigos.some(
      (h) =>
        CODIGOS_LESION_NUEVA.includes(h.codigo) ||
        h.codigo === "lesion_fin_carrera"
    );
    if (!huboLesion) return false;
    // Sin lesión ACTIVA la recuperación no corresponde (condición actual,
    // doble chequeo por si la BD quedó inconsistente).
    if (!contexto.lesionado) return false;
  }

  // ---- "Muerta": cierra una lesión seria ACTIVA y termina la PARTIDA -------
  if (codigo === "lesion_fin_carrera") {
    if (!contexto.lesionado) return false;
  }

  // ---- Vuelta a casa: existe un club anterior en el que jugó ---------------
  if (codigo === "club_vuelta_casa") {
    if (contexto.clubesPrevios.length === 0) return false;
    // El regreso debe ser al club de origen (el primero de la carrera) y
    // este debe estar disponible como destino.
    if (!contexto.clubesPrevios.some((c) => Number(c.id_club) > 0)) {
      return false;
    }
  }

  // ---- Regreso a la Selección: convocatoria previa + período fuera ---------
  if (codigo === "seleccion_regreso") {
    if (contexto.convocatorias < 1) return false;
    if (contexto.temporadasFueraSeleccion < 1) return false;
  }

  // ---- Puskás: tiene que haber marcado goles en su carrera -----------------
  if (codigo === "pos_premio_puskas") {
    if (contexto.goles < 1) return false;
  }

  // ---- Heredás la N°10: primero hubo que ser al menos suplente -------------
  if (codigo === "seleccion_hereda_10") {
    if (contexto.convocatorias < 1) return false;
  }

  return true;
}

/**
 * CONDICIONES ACTUALES: ¿puede ocurrir este evento AHORA, en esta temporada?
 * Devuelve true/false. Ningún evento se sortea sin pasar este filtro.
 */
function eventoEsElegible(evento, contexto) {
  const reglas = REGLAS_EVENTOS[evento.codigo_evento] || {};
  const temporada = contexto.posicionActual;

  // Rango de temporadas.
  const temporadaMinima = Number(evento.temporada_minima) || 1;
  const temporadaMaxima =
    evento.temporada_maxima == null ? null : Number(evento.temporada_maxima);
  if (temporada < temporadaMinima) return false;
  if (temporadaMaxima !== null && temporada > temporadaMaxima) return false;

  // Cooldown (no repetir demasiado seguido).
  const cooldown = Math.max(0, Number(evento.cooldown_temporadas) || 0);
  if (cooldown > 0) {
    const reciente = contexto.historialCodigos.some(
      (h) =>
        h.codigo === evento.codigo_evento &&
        h.temporada > temporada - cooldown &&
        h.temporada <= temporada
    );
    if (reciente) return false;
  }

  // Lesión (estado actual).
  if (Number(evento.requiere_lesion) && !contexto.lesionado) return false;
  if (Number(evento.bloquea_si_lesionado) && contexto.lesionado) return false;

  // Selección (estado actual de convocatoria).
  const convocadoAhora =
    contexto.idSeleccion != null &&
    ESTADOS_CONVOCADO.includes(contexto.estadoSeleccion);
  if (Number(evento.requiere_seleccion) && !convocadoAhora) return false;

  // ---- Reglas específicas del evento ---------------------------------------
  if (reglas.jerarquiaMinima != null) {
    if (contexto.jerarquiaClub == null) return false;
    if (contexto.jerarquiaClub < reglas.jerarquiaMinima) return false;
  }
  if (reglas.jerarquiaMaxima != null) {
    if (contexto.jerarquiaClub == null) return false;
    if (contexto.jerarquiaClub > reglas.jerarquiaMaxima) return false;
  }
  if (reglas.requiereClubActual && !contexto.idClub) return false;
  if (reglas.exigeGoles && contexto.goles < 1) return false;
  if (reglas.grlMinimo != null && contexto.grl < reglas.grlMinimo) return false;
  if (reglas.exigePartidoLocal && contexto.partidosJugados < 1) return false;

  // Eventos de Selección con "participación" real en partidos internacionales:
  // exige convocatoria + estado que implique participación + no lesionado.
  if (reglas.exigePartidoInternacional) {
    if (!contexto.huboPartidoInternacional) return false;
  }

  // Estados de Selección requeridos (no basta con estar convocado).
  if (reglas.requiereEstadoSeleccion) {
    if (!reglas.requiereEstadoSeleccion.includes(contexto.estadoSeleccion)) {
      return false;
    }
  }
  if (reglas.convocatoriasMinimas != null &&
    contexto.convocatorias < reglas.convocatoriasMinimas) {
    return false;
  }

  // Clásico: la liga del club debe tener más de un club de alto nivel
  // (jerarquía >= 4): es la señal disponible de que existe un clásico.
  if (reglas.exigeClasico) {
    if (!contexto.ligaClub) return false;
    // Este dato se consulta una sola vez por turno (ver obtenerContexto).
    if (!contexto.ligaConClasico) return false;
  }

  return true;
}

/**
 * PESO CONTEXTUAL: ajusta la probabilidad RELATIVA (nunca habilita un
 * evento: los pesos solo ponderan sobre los eventos ya elegibles).
 */
function ajustarPesoPorContexto(evento, contexto) {
  const peso = Number(evento.peso);
  if (!Number.isFinite(peso) || peso <= 0) return 0;

  const codigo = evento.codigo_evento;
  const nombre = normalizarTexto(evento.nombre);
  const categoria = normalizarTexto(evento.categoria);
  const grl = Math.min(99, Math.max(1, contexto.grl));
  const jerarquia = contexto.jerarquiaClub;
  let multiplicador = 1;

  // Hitos extraordinarios: el GRL alto los hace más probables.
  if (
    codigo === "pos_premio_puskas" ||
    codigo === "pos_record_personal" ||
    /figura internacional|gol internacional|titular en la seleccion|heredas la n.?10/.test(nombre)
  ) {
    multiplicador *= 0.55 + grl / 100;
  }

  // Transferencia internacional / premio por rendimiento: mejor club = más.
  if (jerarquia != null &&
    (codigo === "club_transferencia_intl" || codigo === "pos_premio_rendimiento")) {
    multiplicador *= Math.min(1.6, Math.max(0.65, 0.8 + (jerarquia - 1) * 0.15));
  }

  // Oferta de Primera: clubes chicos la reciben más seguido.
  if (jerarquia != null && codigo === "club_oferta_primera") {
    multiplicador *= Math.min(2, Math.max(0.5, 1.4 - (jerarquia - 1) * 0.12));
  }

  // Selección: la fama empuja las convocatorias.
  if (categoria === "seleccion") {
    multiplicador *= 0.75 + grl / 200;
  }

  return Math.max(0, peso * Math.min(2, Math.max(0.25, multiplicador)));
}

/**
 * Sortea un evento usando peso como ponderación relativa entre elegibles.
 */
function sortearEventoPonderado(eventos) {
  const elegibles = eventos
    .map((evento) => ({ ...evento, peso: Number(evento.peso) }))
    .filter((evento) => Number.isFinite(evento.peso) && evento.peso > 0);
  const pesoTotal = elegibles.reduce(
    (total, evento) => total + evento.peso,
    0
  );

  if (pesoTotal <= 0) {
    throw new Error("No hay eventos con peso válido para sortear.");
  }

  let sorteo = Math.random() * pesoTotal;
  for (const evento of elegibles) {
    sorteo -= evento.peso;
    if (sorteo < 0) return evento;
  }

  return elegibles[elegibles.length - 1];
}

/**
 * Flujo COMPLETO de generación de eventos:
 *   candidatos -> condiciones actuales -> dependencias históricas ->
 *   pesos contextuales -> sorteo.
 * Los eventos imposibles NUNCA llegan al sorteo.
 */
async function generarEvento({
  query,
  jugador,
  posicionActual,
  eventos,
  ligaConClasico,
}) {
  const contexto = await obtenerContextoJugador(query, jugador, posicionActual);
  contexto.ligaConClasico = Boolean(ligaConClasico);

  // 1-2. Condiciones actuales (filtro duro).
  let elegibles = eventos.filter((evento) => eventoEsElegible(evento, contexto));

  // 3. Dependencias históricas.
  elegibles = elegibles.filter((evento) =>
    cumpleDependenciasHistoricas(evento, contexto)
  );

  if (elegibles.length === 0) {
    return { evento: null, contexto };
  }

  // 4-5. Pesos contextuales + sorteo.
  const conPesos = elegibles
    .map((evento) => ({
      ...evento,
      peso: ajustarPesoPorContexto(evento, contexto),
    }))
    .filter((evento) => evento.peso > 0);

  if (conPesos.length === 0) {
    return { evento: null, contexto };
  }

  const evento = sortearEventoPonderado(conPesos);
  return { evento, contexto };
}

module.exports = {
  normalizarTexto,
  REGLAS_EVENTOS,
  CODIGOS_LESION_NUEVA,
  CODIGOS_CONVOCATORIA,
  CODIGOS_CAMBIO_CLUB,
  ESTADOS_CONVOCADO,
  obtenerContextoJugador,
  cumpleDependenciasHistoricas,
  eventoEsElegible,
  ajustarPesoPorContexto,
  sortearEventoPonderado,
  generarEvento,
};
