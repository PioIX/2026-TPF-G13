// ============================================================================
// TÍTULOS — Reglas de elegibilidad (auditoría de coherencia futbolística).
//
// Funciones PURAS: no tocan la base. El backend (index.js) consulta los
// datos y les pasa los parámetros; así las reglas se pueden testear sin DB.
//
// Convención del proyecto: Club.liga guarda la LIGA (ej. "Brasileirão"),
// y los países/continentes se comparan con normalización de acentos.
// ============================================================================

// Normaliza texto: minúsculas, sin acentos.
function normalizarTexto(valor) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// ---------------------------------------------------------------------------
// Mapa liga del Club -> país de Titulo. (Club.liga NO es el país: el
// Brasileirão es Brasil, la MLS es Estados Unidos, etc.)
// ---------------------------------------------------------------------------
const MAPA_LIGA_A_PAIS = {
  "Liga Profesional Argentina": "Argentina",
  "Primera Nacional": "Argentina",
  "Brasileirão": "Brasil",
  "La Liga": "España",
  "Premier League": "Inglaterra",
  "Serie A": "Italia",
  "Bundesliga": "Alemania",
  "Ligue 1": "Francia",
  "Primeira Liga": "Portugal",
  "Eredivisie": "Países Bajos",
  "Süper Lig": "Turquía",
  "Scottish Premiership": "Escocia",
  "Belgian Pro League": "Bélgica",
  "Swiss Super League": "Suiza",
  "Austrian Bundesliga": "Austria",
  "Liga MX": "México",
  "MLS": "Estados Unidos",
  "Saudi Pro League": "Arabia Saudita",
  "J1 League": "Japón"
};

// Tipos de título nacional por nombre normalizado.
const NOMBRES_LIGA = [
  "liga profesional de futbol", "premier league", "la liga", "serie a",
  "bundesliga", "ligue 1", "eredivisie", "primeira liga",
  "brasileirao serie a", "liga mx", "mls cup", "super lig",
  "scottish premiership", "belgian pro league", "swiss super league",
  "austrian bundesliga", "saudi pro league", "j1 league"
];
const NOMBRES_SUPERCOPA = ["supercopa argentina"];

function esLiga(nombre) {
  return NOMBRES_LIGA.includes(normalizarTexto(nombre));
}
function esSupercopa(nombre) {
  return NOMBRES_SUPERCOPA.includes(normalizarTexto(nombre));
}

/**
 * Elegibilidad de un título NACIONAL (colectivo) para el club del jugador.
 * - El país del título tiene que ser el país de la LIGA del club.
 * - El prestigio del trofeo no puede superar la jerarquía del club.
 * - Un club de segunda división (Primera Nacional) no gana la liga de
 *   primera: solo copas y supercopas.
 * - La Supercopa exige haber ganado (liga o copa del mismo país) la
 *   temporada ANTERIOR: no basta con pertenecer al país.
 */
function elegibleTituloColectivo({ titulo, ligaClub, jerarquia, titulosPrevios, temporada }) {
  const paisClub = MAPA_LIGA_A_PAIS[ligaClub];
  if (!paisClub) return false;
  if (normalizarTexto(titulo.pais) !== normalizarTexto(paisClub)) return false;
  if (Number(titulo.prestigio) > Math.max(1, Number(jerarquia) || 1)) return false;

  const nombre = titulo.nombre;
  if (esLiga(nombre)) {
    // Segunda división: no disputa la liga de primera.
    if (normalizarTexto(ligaClub) === "primera nacional") return false;
    return true;
  }

  if (esSupercopa(nombre)) {
    // Clasificación: campeón de liga o copa del MISMO país la temporada previa.
    const temporadaPrev = Number(temporada) - 1;
    if (!(temporadaPrev >= 1)) return false;
    return (titulosPrevios || []).some((prev) =>
      Number(prev.temporada) === temporadaPrev &&
      normalizarTexto(prev.pais) === normalizarTexto(paisClub) &&
      (esLiga(prev.nombre) || /copa/.test(normalizarTexto(prev.nombre)))
    );
  }

  // Copas nacionales: cualquier club del país puede disputarlas.
  if (/copa/.test(normalizarTexto(nombre))) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Títulos internacionales: dependencias por id (ver docs/auditoria_titulos).
// 22/23: Mundial de Clubes (formato anual) y Copa Intercontinental — exigen
//        haber ganado una copa continental (con el club) antes.
// 20:    Finalissima — exige haber ganado un torneo continental de selecciones.
// 3:     Torneo Olímpico — límite de edad sub-23 (regla del torneo).
// ---------------------------------------------------------------------------
const TORNEOS_DE_CLUBES_CON_TITULO_PREVIO = new Set([22, 23]);
const EDAD_MAXIMA_OLIMPICO = 23;

/**
 * Elegibilidad de un título INTERNACIONAL.
 * @param titulo fila de TituloInternacional
 * @param idSeleccion id de la selección SOLO si el jugador jugó con ella
 * @param titulosInternacionalesPrevios [{ id_titulo_internacional, temporada }]
 */
function elegibleTituloInternacional({
  titulo,
  continenteClub,
  idSeleccion,
  continenteSeleccion,
  titulosInternacionalesPrevios,
  edad
}) {
  const previos = titulosInternacionalesPrevios || [];
  const tieneTituloContinentalClub = previos.some((p) =>
    [24, 25, 26, 27].includes(Number(p.id_titulo_internacional))
  );
  const tieneTituloContinentalSeleccion = previos.some((p) =>
    [8, 11, 12, 14, 16, 18, 29, 30].includes(Number(p.id_titulo_internacional))
  );

  if (Number(titulo.tipo_seleccion) === 0) {
    // Torneo de CLUBES: decide la confederación del CLUB, no el país del jugador.
    const continenteTorneo = normalizarTexto(titulo.continente_club);
    if (continenteTorneo) {
      if (!continenteClub) return false;
      if (normalizarTexto(continenteClub) !== continenteTorneo) return false;
    }
    // Mundial de Clubes (anual) e Intercontinental: solo campeones continentales.
    if (TORNEOS_DE_CLUBES_CON_TITULO_PREVIO.has(Number(titulo.id_titulo_internacional))) {
      return tieneTituloContinentalClub;
    }
    return true;
  }

  // Torneo de SELECCIONES: hay que haber sido convocado y jugado.
  const convocado =
    idSeleccion !== null && idSeleccion !== undefined && Number(idSeleccion) > 0;
  if (!convocado) return false;

  const continente = normalizarTexto(titulo.continente);

  // Olímpico: sub-23 (con margen de permitidos que el juego no modela).
  if (Number(titulo.id_titulo_internacional) === 3) {
    if (Number(edad) > EDAD_MAXIMA_OLIMPICO) return false;
    return true;
  }

  // Finalissima: campeón continental vigente (campeón de América vs campeón de Europa).
  if (Number(titulo.id_titulo_internacional) === 20) {
    return tieneTituloContinentalSeleccion;
  }

  if (continente === "mundial") return true;

  // Continental: la selección tiene que ser de esa confederación.
  return normalizarTexto(continenteSeleccion) === continente;
}

// ---------------------------------------------------------------------------
// Títulos individuales.
//
// EXCLUIDOS_DEL_SORTEO: registros históricos duplicados que NO se vuelven a
// sortear (se conservan para el historial de TituloGanado ya existente):
//   1  "Balón de Oro (histórico)" (duplicado del 28, escala vieja de puntos)
//   3  "Bota de Oro (histórico)" (duplicado del 31)
// Los premios de ARQUEROS (8, 16, 30) fueron ELIMINADOS de la base por la
// migración (docs/auditoria_titulos_migracion.sql §0): el juego no registra
// la posición del futbolista. El filtro por nombre (guante de oro / yashin /
// arquero) queda como defensa si un administrador vuelve a crear uno.
// ---------------------------------------------------------------------------
const EXCLUIDOS_DEL_SORTEO = new Set([1, 3]);

// Mínimo de goles de la temporada para premios de goleador (documentado:
// el modelo no compara contra otros jugadores, exige una producción real).
const GOLES_MINIMOS_GOLEADOR = 8;
const EDAD_MAXIMA_JUVENIL = 21; // Golden Boy y Trofeo Kopa: sub-21 reales.

/**
 * Elegibilidad de un título INDIVIDUAL según rendimiento real.
 * @param golesNuevos goles de LA TEMPORADA
 */
function elegibleTituloIndividual({
  titulo,
  edad,
  ligaClub,
  continenteClub,
  golesNuevos,
  convocadoConSeleccion
}) {
  if (EXCLUIDOS_DEL_SORTEO.has(Number(titulo.id_titulo_individual))) return false;

  const nombre = normalizarTexto(titulo.nombre);

  // Premio por país (Pichichi, MVPs de liga): coincide con el país del club.
  if (titulo.pais != null) {
    const paisClub = MAPA_LIGA_A_PAIS[ligaClub] || ligaClub;
    if (!paisClub || normalizarTexto(titulo.pais) !== normalizarTexto(paisClub)) {
      return false;
    }
  }

  // Premios de arqueros: sin posición registrada, no se sortean.
  if (/guante de oro|yashin|arquero/.test(nombre)) return false;

  // Premios del Mundial de Selecciones: exige convocatoria esa temporada.
  if (/copa mundial/.test(nombre) && !convocadoConSeleccion) return false;

  // Juveniles: sub-21 (Golden Boy, Kopa, mejor joven del Mundial).
  if (/joven|golden boy|kopa/.test(nombre) && Number(edad) > EDAD_MAXIMA_JUVENIL) {
    return false;
  }

  // Premios UEFA / juveniles europeos: club europeo.
  if ((/uefa/.test(nombre) || /golden boy|kopa/.test(nombre)) &&
    normalizarTexto(continenteClub) !== "europa") {
    return false;
  }

  // Goleadores: necesitan goles de verdad, en la competición correcta.
  if (/goleador|bota de oro/.test(nombre)) {
    if (Number(golesNuevos) < GOLES_MINIMOS_GOLEADOR) return false;
    if (/copa mundial/.test(nombre) && !convocadoConSeleccion) return false;
    if (/champions/.test(nombre) && normalizarTexto(continenteClub) !== "europa") return false;
    if (/libertadores/.test(nombre) &&
      normalizarTexto(continenteClub) !== "america del sur") {
      return false;
    }
    return true;
  }

  // Puskás: el gol del año — imposible sin goles.
  if (/puskas/.test(nombre) && Number(golesNuevos) <= 0) return false;

  return true;
}

module.exports = {
  normalizarTexto,
  MAPA_LIGA_A_PAIS,
  esLiga,
  esSupercopa,
  elegibleTituloColectivo,
  elegibleTituloInternacional,
  elegibleTituloIndividual,
  EXCLUIDOS_DEL_SORTEO,
  GOLES_MINIMOS_GOLEADOR,
  EDAD_MAXIMA_JUVENIL,
  EDAD_MAXIMA_OLIMPICO,
  TORNEOS_DE_CLUBES_CON_TITULO_PREVIO
};
