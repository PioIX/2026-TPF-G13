// ============================================================================
// PRUEBAS — Sistema de títulos (reglas de elegibilidad, módulo puro).
// Escenarios de la auditoría: nacionales, internacionales, selecciones,
// individuales, duplicados e historial.
//
//   node scripts/test_titulos.js
// ============================================================================
const {
  elegibleTituloColectivo,
  elegibleTituloInternacional,
  elegibleTituloIndividual,
  MAPA_LIGA_A_PAIS
} = require("../modulos/titulos");

let pasadas = 0;
let falladas = 0;

function prueba(descripcion, condicion) {
  if (condicion) {
    pasadas++;
    console.log(`  OK  ${descripcion}`);
  } else {
    falladas++;
    console.log(`  XX  ${descripcion}`);
  }
}

console.log("\n== 1. TÍTULOS NACIONALES ==");

const ligaArg = { id_titulo: 1, nombre: "Liga Profesional de Fútbol", pais: "Argentina", prestigio: 2 };
const premier = { id_titulo: 2, nombre: "Premier League", pais: "Inglaterra", prestigio: 4 };
const laliga = { id_titulo: 3, nombre: "La Liga", pais: "España", prestigio: 4 };
const brasileirao = { id_titulo: 11, nombre: "Brasileirão Série A", pais: "Brasil", prestigio: 3 };
const supercopaArg = { id_titulo: 10, nombre: "Supercopa Argentina", pais: "Argentina", prestigio: 1 };
const copaArg = { id_titulo: 9, nombre: "Copa Argentina", pais: "Argentina", prestigio: 1 };

prueba("River Plate (Argentina, jer 5) puede ganar la Liga Profesional",
  elegibleTituloColectivo({ titulo: ligaArg, ligaClub: "Liga Profesional Argentina", jerarquia: 5 }));

prueba("Grêmio (Brasileirão, jer 5) puede ganar el Brasileirão",
  elegibleTituloColectivo({ titulo: brasileirao, ligaClub: "Brasileirão", jerarquia: 5 }));

prueba("Manchester City (Premier, jer 5) puede ganar la Premier League",
  elegibleTituloColectivo({ titulo: premier, ligaClub: "Premier League", jerarquia: 5 }));

prueba("Real Madrid (La Liga, jer 5) puede ganar La Liga",
  elegibleTituloColectivo({ titulo: laliga, ligaClub: "La Liga", jerarquia: 5 }));

prueba("Un club argentino NO puede ganar la Premier League",
  !elegibleTituloColectivo({ titulo: premier, ligaClub: "Liga Profesional Argentina", jerarquia: 5 }));

prueba("Un club brasileño NO puede ganar La Liga",
  !elegibleTituloColectivo({ titulo: laliga, ligaClub: "Brasileirão", jerarquia: 5 }));

prueba("Un club de Primera Nacional (2ª div) NO gana la liga de primera",
  !elegibleTituloColectivo({ titulo: ligaArg, ligaClub: "Primera Nacional", jerarquia: 1 }));

prueba("Un club de Primera Nacional SÍ puede ganar la Copa Argentina",
  elegibleTituloColectivo({ titulo: copaArg, ligaClub: "Primera Nacional", jerarquia: 1 }));

prueba("Un club jerarquía 1 NO gana un trofeo de prestigio 4 (liga europea)",
  !elegibleTituloColectivo({ titulo: premier, ligaClub: "Premier League", jerarquia: 1 }));

prueba("Supercopa sin título previo: NO se puede ganar",
  !elegibleTituloColectivo({ titulo: supercopaArg, ligaClub: "Liga Profesional Argentina", jerarquia: 5, titulosPrevios: [], temporada: 3 }));

prueba("Supercopa habiendo ganado la liga la temporada anterior: SÍ",
  elegibleTituloColectivo({
    titulo: supercopaArg, ligaClub: "Liga Profesional Argentina", jerarquia: 5,
    titulosPrevios: [{ temporada: 2, pais: "Argentina", nombre: "Liga Profesional de Fútbol" }],
    temporada: 3
  }));

prueba("Supercopa habiendo ganado la copa la temporada anterior: SÍ",
  elegibleTituloColectivo({
    titulo: supercopaArg, ligaClub: "Liga Profesional Argentina", jerarquia: 5,
    titulosPrevios: [{ temporada: 2, pais: "Argentina", nombre: "Copa Argentina" }],
    temporada: 3
  }));

prueba("Supercopa con campeonato de OTRO país la temporada previa: NO",
  !elegibleTituloColectivo({
    titulo: supercopaArg, ligaClub: "Liga Profesional Argentina", jerarquia: 5,
    titulosPrevios: [{ temporada: 2, pais: "Brasil", nombre: "Brasileirão Série A" }],
    temporada: 3
  }));

prueba("Supercopa con título de hace DOS temporadas: NO (edición previa caducó)",
  !elegibleTituloColectivo({
    titulo: supercopaArg, ligaClub: "Liga Profesional Argentina", jerarquia: 5,
    titulosPrevios: [{ temporada: 1, pais: "Argentina", nombre: "Copa Argentina" }],
    temporada: 3
  }));

console.log("\n== 2. TÍTULOS INTERNACIONALES DE CLUBES ==");

const champions = { id_titulo_internacional: 26, nombre: "UEFA Champions League", tipo_seleccion: 0, continente_club: "Europa" };
const libertadores = { id_titulo_internacional: 24, nombre: "Copa Libertadores", tipo_seleccion: 0, continente_club: "América del Sur" };
const sudamericana = { id_titulo_internacional: 25, nombre: "Copa Sudamericana", tipo_seleccion: 0, continente_club: "América del Sur" };
const mundialClubesAnual = { id_titulo_internacional: 22, nombre: "Mundial de Clubes de la FIFA (formato anual)", tipo_seleccion: 0, continente_club: null };
const intercontinental = { id_titulo_internacional: 23, nombre: "Copa Intercontinental de la FIFA", tipo_seleccion: 0, continente_club: null };

prueba("River Plate NO puede ganar la Champions League",
  !elegibleTituloInternacional({ titulo: champions, continenteClub: "América del Sur" }));

prueba("Un club inglés NO puede ganar la Libertadores",
  !elegibleTituloInternacional({ titulo: libertadores, continenteClub: "Europa" }));

prueba("Un club brasileño (CONMEBOL) SÍ puede ganar la Libertadores",
  elegibleTituloInternacional({ titulo: libertadores, continenteClub: "América del Sur" }));

prueba("Un club inglés SÍ puede ganar la Champions League",
  elegibleTituloInternacional({ titulo: champions, continenteClub: "Europa" }));

prueba("Sin continente de club (datos faltantes) NO hay torneo continental",
  !elegibleTituloInternacional({ titulo: champions, continenteClub: null }));

prueba("Mundial de Clubes (anual) sin título continental previo: NO",
  !elegibleTituloInternacional({ titulo: mundialClubesAnual, continenteClub: "Europa", titulosInternacionalesPrevios: [] }));

prueba("Mundial de Clubes (anual) campeón continental vigente: SÍ",
  elegibleTituloInternacional({
    titulo: mundialClubesAnual, continenteClub: "Europa",
    titulosInternacionalesPrevios: [{ id_titulo_internacional: 26, temporada: 5 }]
  }));

prueba("Copa Intercontinental sin título continental previo: NO",
  !elegibleTituloInternacional({ titulo: intercontinental, continenteClub: "América del Sur", titulosInternacionalesPrevios: [] }));

prueba("Copa Intercontinental con Libertadores previa: SÍ",
  elegibleTituloInternacional({
    titulo: intercontinental, continenteClub: "América del Sur",
    titulosInternacionalesPrevios: [{ id_titulo_internacional: 24, temporada: 5 }]
  }));

console.log("\n== 3. SELECCIONES NACIONALES ==");

const copaAmerica = { id_titulo_internacional: 29, nombre: "Copa América", tipo_seleccion: 1, continente: "América del Sur" };
const eurocopa = { id_titulo_internacional: 30, nombre: "Eurocopa", tipo_seleccion: 1, continente: "Europa" };
const mundial = { id_titulo_internacional: 31, nombre: "Mundial de Selecciones", tipo_seleccion: 1, continente: "Mundial" };
const olimpico = { id_titulo_internacional: 3, nombre: "Torneo Olímpico de Fútbol Masculino", tipo_seleccion: 1, continente: "Mundial" };
const finalissima = { id_titulo_internacional: 20, nombre: "Finalissima", tipo_seleccion: 1, continente: "Mundial" };

prueba("Un jugador argentino convocado puede ganar la Copa América",
  elegibleTituloInternacional({
    titulo: copaAmerica, idSeleccion: 1, continenteSeleccion: "América del Sur", edad: 26
  }));

prueba("Un jugador NO convocado no puede ganar ningún título de selección",
  !elegibleTituloInternacional({
    titulo: mundial, idSeleccion: null, continenteSeleccion: "América del Sur", edad: 26
  }));

prueba("Un jugador argentino NO puede ganar la Eurocopa (selección incorrecta)",
  !elegibleTituloInternacional({
    titulo: eurocopa, idSeleccion: 1, continenteSeleccion: "América del Sur", edad: 26
  }));

prueba("Un jugador convocado con Argentina no gana un torneo que su selección no disputa (continental equivocado)",
  !elegibleTituloInternacional({
    titulo: { ...copaAmerica, continente: "Asia" }, idSeleccion: 1,
    continenteSeleccion: "América del Sur", edad: 26
  }));

prueba("Torneo Olímpico: un jugador de 24 años NO puede jugarlo",
  !elegibleTituloInternacional({ titulo: olimpico, idSeleccion: 1, continenteSeleccion: "Europa", edad: 24 }));

prueba("Torneo Olímpico: un jugador de 21 años SÍ puede",
  elegibleTituloInternacional({ titulo: olimpico, idSeleccion: 1, continenteSeleccion: "Europa", edad: 21 }));

prueba("Finalissima sin haber ganado torneo continental: NO",
  !elegibleTituloInternacional({
    titulo: finalissima, idSeleccion: 1, continenteSeleccion: "América del Sur",
    titulosInternacionalesPrevios: [], edad: 26
  }));

prueba("Finalissima campeón de la Copa América: SÍ",
  elegibleTituloInternacional({
    titulo: finalissima, idSeleccion: 1, continenteSeleccion: "América del Sur",
    titulosInternacionalesPrevios: [{ id_titulo_internacional: 29, temporada: 6 }], edad: 26
  }));

prueba("Finalissima campeón de la Eurocopa: SÍ (Europa también clasifica)",
  elegibleTituloInternacional({
    titulo: finalissima, idSeleccion: 3, continenteSeleccion: "Europa",
    titulosInternacionalesPrevios: [{ id_titulo_internacional: 30, temporada: 6 }], edad: 26
  }));

console.log("\n== 4. TÍTULOS INDIVIDUALES ==");

const balonDeOro28 = { id_titulo_individual: 28, nombre: "Balón de Oro", prestigio: 5, pais: null };
const balonDeOro1 = { id_titulo_individual: 1, nombre: "Balón de Oro (histórico)", prestigio: 5, pais: null };
const botaOro31 = { id_titulo_individual: 31, nombre: "Bota de Oro", prestigio: 4, pais: null };
const botaOroHist3 = { id_titulo_individual: 3, nombre: "Bota de Oro (histórico)", prestigio: 5, pais: null };
const guanteOro = { id_titulo_individual: 8, nombre: "Guante de Oro de la Copa Mundial", prestigio: 4, pais: null };
const yashin = { id_titulo_individual: 16, nombre: "Premio Lev Yashin", prestigio: 4, pais: null };
const pichichi = { id_titulo_individual: 26, nombre: "Máximo Goleador (Pichichi)", prestigio: 2, pais: "España" };
const maxGoleadorLiga = { id_titulo_individual: 20, nombre: "Máximo Goleador de la Liga", prestigio: 4, pais: null };
const goleadorChampions = { id_titulo_individual: 18, nombre: "Máximo Goleador de la Champions League", prestigio: 5, pais: null };
const goleadorLibertadores = { id_titulo_individual: 19, nombre: "Máximo Goleador de la Copa Libertadores", prestigio: 5, pais: null };
const goldenBoy = { id_titulo_individual: 13, nombre: "Golden Boy", prestigio: 4, pais: null };
const kopa = { id_titulo_individual: 14, nombre: "Trofeo Kopa", prestigio: 4, pais: null };
const mejorJoven = { id_titulo_individual: 29, nombre: "Mejor Jugador Joven", prestigio: 2, pais: null };
const mjMundial = { id_titulo_individual: 5, nombre: "Mejor Jugador de la Copa Mundial", prestigio: 5, pais: null };
const puskas = { id_titulo_individual: 15, nombre: "Premio Puskás", prestigio: 4, pais: null };

prueba("Un delantero con goles puede ganar la Bota de Oro",
  elegibleTituloIndividual({ titulo: botaOro31, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 25 }));

prueba("Un jugador SIN goles NO puede ganar premios de goleador",
  !elegibleTituloIndividual({ titulo: maxGoleadorLiga, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 0 }));

prueba("Un jugador con menos del mínimo de goles NO gana premio de goleador",
  !elegibleTituloIndividual({ titulo: botaOro31, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 3 }));

prueba("Un defensor (jugador de campo sin condición de arquero) NO gana premios de arquero (los ids fueron eliminados; el filtro por nombre queda como defensa)",
  !elegibleTituloIndividual({ titulo: yashin, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 0 }) &&
  !elegibleTituloIndividual({ titulo: guanteOro, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 0 }));

prueba("Un jugador que no jugó el Mundial NO gana premios de la Copa Mundial",
  !elegibleTituloIndividual({ titulo: mjMundial, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 0, convocadoConSeleccion: false }));

prueba("Un convocado SÍ puede aspirar al premio del Mundial (con edad válida)",
  elegibleTituloIndividual({ titulo: mjMundial, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 5, convocadoConSeleccion: true }));

prueba("Bota de Oro del Mundial sin convocatoria: NO",
  !elegibleTituloIndividual({ titulo: { ...botaOro31, nombre: "Bota de Oro de la Copa Mundial" }, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 10, convocadoConSeleccion: false }));

prueba("Un jugador de 24 años NO puede ganar el Trofeo Kopa (sub-21)",
  !elegibleTituloIndividual({ titulo: kopa, edad: 24, ligaClub: "Brasileirão", continenteClub: "América del Sur", golesNuevos: 5 }));

prueba("Un jugador de 19 años SÍ puede ganar el Golden Boy (si es europeo)",
  elegibleTituloIndividual({ titulo: goldenBoy, edad: 19, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 5 }));

prueba("Golden Boy exige club EUROPEO (un brasileño no lo gana)",
  !elegibleTituloIndividual({ titulo: goldenBoy, edad: 19, ligaClub: "Brasileirão", continenteClub: "América del Sur", golesNuevos: 5 }));

prueba("Mejor Jugador Joven también respeta el límite de edad",
  !elegibleTituloIndividual({ titulo: mejorJoven, edad: 25, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 5 }));

prueba("Goleador de Champions exige club europeo",
  !elegibleTituloIndividual({ titulo: goleadorChampions, edad: 26, ligaClub: "Brasileirão", continenteClub: "América del Sur", golesNuevos: 12 }));

prueba("Goleador de la Libertadores exige club sudamericano",
  !elegibleTituloIndividual({ titulo: goleadorLibertadores, edad: 26, ligaClub: "Premier League", continenteClub: "Europa", golesNuevos: 12 }));

prueba("Goleador de la Libertadores: sí para un club de CONMEBOL con goles",
  elegibleTituloIndividual({ titulo: goleadorLibertadores, edad: 26, ligaClub: "Brasileirão", continenteClub: "América del Sur", golesNuevos: 12 }));

prueba("Pichichi solo para jugadores de La Liga (España)",
  !elegibleTituloIndividual({ titulo: pichichi, edad: 26, ligaClub: "Premier League", continenteClub: "Europa", golesNuevos: 12 }));

prueba("Puskás sin goles: NO",
  !elegibleTituloIndividual({ titulo: puskas, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 0 }));

console.log("\n== 5. DUPLICADOS / HISTÓRICOS ==");

prueba("Balón de Oro histórico (id 1) NO se vuelve a sortear",
  !elegibleTituloIndividual({ titulo: balonDeOro1, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 30 }));

prueba("Balón de Oro vigente (id 28) SÍ se sortea",
  elegibleTituloIndividual({ titulo: balonDeOro28, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 30 }));

prueba("Bota de Oro histórica (id 3) NO se vuelve a sortear",
  !elegibleTituloIndividual({ titulo: botaOroHist3, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 30 }));

prueba("Bota de Oro vigente (id 31) SÍ se sortea",
  elegibleTituloIndividual({ titulo: botaOro31, edad: 26, ligaClub: "La Liga", continenteClub: "Europa", golesNuevos: 30 }));

console.log("\n== 6. MAPA LIGA -> PAÍS (bug principal corregido) ==");

prueba("Brasileirão -> Brasil",
  MAPA_LIGA_A_PAIS["Brasileirão"] === "Brasil");
prueba("MLS -> Estados Unidos",
  MAPA_LIGA_A_PAIS["MLS"] === "Estados Unidos");
prueba("Liga Profesional Argentina -> Argentina",
  MAPA_LIGA_A_PAIS["Liga Profesional Argentina"] === "Argentina");
prueba("Primera Nacional -> Argentina (mismo país, otra división)",
  MAPA_LIGA_A_PAIS["Primera Nacional"] === "Argentina");

console.log(`\nRESULTADO: ${pasadas} OK, ${falladas} falladas\n`);
process.exit(falladas > 0 ? 1 : 0);
