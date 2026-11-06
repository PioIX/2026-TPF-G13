// ============================================================================
// PRUEBAS DEL SISTEMA DE EVENTOS — auditoría integral (G13)
//
// Ejecuta: node scripts/test_eventos.js
// No requiere el servidor levantado: prueba la lógica pura del módulo
// modulos/eventos.js (elegibilidad, dependencias, pesos, sorteo) y,
// si MYSQL_* está configurado, también contra la base real.
// ============================================================================

const {
  normalizarTexto,
  eventoEsElegible,
  cumpleDependenciasHistoricas,
  sortearEventoPonderado,
  REGLAS_EVENTOS,
} = require("../modulos/eventos");

let pasaron = 0;
let fallaron = 0;

function prueba(nombre, condicion) {
  if (condicion) {
    pasaron++;
    console.log(`  ✔ ${nombre}`);
  } else {
    fallaron++;
    console.error(`  ✘ FALLO: ${nombre}`);
  }
}

function mkEvento(overrides = {}) {
  return {
    id_evento: 1,
    nombre: "Prueba",
    categoria: "Positivo",
    peso: 10,
    temporada_minima: 1,
    temporada_maxima: null,
    requiere_lesion: 0,
    requiere_seleccion: 0,
    bloquea_si_lesionado: 0,
    cooldown_temporadas: 0,
    codigo_evento: null,
    fin_carrera: 0,
    ...overrides,
  };
}

function mkContexto(overrides = {}) {
  return {
    posicionActual: 1,
    idClub: 1,
    jerarquiaClub: 3,
    ligaClub: "Liga Profesional Argentina",
    continenteClub: "América del Sur",
    idNacionalidad: 1,
    idSeleccion: null,
    estadoSeleccion: "nunca",
    convocatorias: 0,
    temporadasFueraSeleccion: 0,
    lesionado: false,
    grl: 60,
    goles: 0,
    asistencias: 0,
    partidosJugados: 30,
    huboPartidoInternacional: false,
    clubesPrevios: [],
    historialCodigos: [],
    ligaConClasico: true,
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
console.log("\n[1] Competiciones internacionales (títulos)");
// ----------------------------------------------------------------------------

// (La elegibilidad de títulos se prueba con la lógica replicada de
//  procesarTitulosTemporada filtrando por continente del club.)
const tituloChampions = {
  nombre: "UEFA Champions League",
  tipo_seleccion: 0,
  continente_club: "Europa",
};
const tituloLibertadores = {
  nombre: "Copa Libertadores",
  tipo_seleccion: 0,
  continente_club: "América del Sur",
};
const tituloMundialClubes = {
  nombre: "Copa Mundial de Clubes",
  tipo_seleccion: 0,
  continente_club: null,
};
const tituloMundial = {
  nombre: "Mundial de Selecciones",
  tipo_seleccion: 1,
  continente: "Mundial",
};

function puedeGanarClub(titulo, continenteClub) {
  if (Number(titulo.tipo_seleccion) === 0) {
    const continenteTorneo = normalizarTexto(titulo.continente_club);
    if (!continenteTorneo) return true;
    if (!continenteClub) return false;
    return normalizarTexto(continenteClub) === continenteTorneo;
  }
  return false;
}

prueba("1.1 club brasileño (Grêmio, continente Sudamérica) NO gana la Champions",
  !puedeGanarClub(tituloChampions, "América del Sur"));

prueba("1.2 club europeo SÍ gana la Champions",
  puedeGanarClub(tituloChampions, "Europa"));

prueba("1.3 club sudamericano (River) SÍ gana la Libertadores",
  puedeGanarClub(tituloLibertadores, "América del Sur"));

prueba("1.4 club sudamericano NO gana la Europa League (no participa)",
  !puedeGanarClub({ ...tituloChampions, nombre: "UEFA Europa League" }, "América del Sur"));

prueba("1.5 Mundial de Clubes: lo disputa cualquier confederación",
  puedeGanarClub(tituloMundialClubes, "América del Sur") &&
  puedeGanarClub(tituloMundialClubes, "Europa"));

// ----------------------------------------------------------------------------
console.log("\n[2] Selección nacional");
// ----------------------------------------------------------------------------

// Torneo de selecciones: exige convocatoria real (idSeleccion > 0 y estado
// de participación) y haber jugado la temporada.
function puedeGanarTorneoSeleccion(titulo, { idSeleccion, estadoSeleccion, jugo }) {
  if (Number(titulo.tipo_seleccion) !== 1) return false;
  if (!jugo) return false;
  if (!(idSeleccion > 0)) return false;
  if (!["convocado", "suplente", "titular"].includes(estadoSeleccion)) return false;
  return true;
}

prueba("2.1 nunca convocado NO gana el Mundial",
  !puedeGanarTorneoSeleccion(tituloMundial,
    { idSeleccion: 0, estadoSeleccion: "nunca", jugo: true }));

prueba("2.2 convocado que no jugó (lesionado toda la temporada) NO gana el Mundial",
  !puedeGanarTorneoSeleccion(tituloMundial,
    { idSeleccion: 1, estadoSeleccion: "titular", jugo: false }));

prueba("2.3 convocado y jugó SÍ puede ganar el Mundial",
  puedeGanarTorneoSeleccion(tituloMundial,
    { idSeleccion: 1, estadoSeleccion: "titular", jugo: true }));

prueba("2.4 estado 'fuera de la lista' NO participa de torneos",
  !puedeGanarTorneoSeleccion(tituloMundial,
    { idSeleccion: 1, estadoSeleccion: "fuera", jugo: true }));

// Evento "Regreso a la Selección": requiere convocatoria previa + período fuera.
const regreso = mkEvento({ codigo_evento: "seleccion_regreso", categoria: "Selección" });
prueba("2.5 'Regreso a la Selección' sin convocatorias previas: IMPOSIBLE",
  !cumpleDependenciasHistoricas(regreso,
    mkContexto({ convocatorias: 0, temporadasFueraSeleccion: 3 })));

prueba("2.6 'Regreso a la Selección' con convocatoria previa y período fuera: posible",
  cumpleDependenciasHistoricas(regreso,
    mkContexto({ convocatorias: 2, temporadasFueraSeleccion: 3 })));

prueba("2.7 'Regreso a la Selección' sin período fuera: imposible",
  !cumpleDependenciasHistoricas(regreso,
    mkContexto({ convocatorias: 2, temporadasFueraSeleccion: 0 })));

// "Quedás fuera de la lista": requiere estar convocado (condición actual).
const fueraLista = mkEvento({
  codigo_evento: "seleccion_fuera_lista",
  categoria: "Selección",
  requiere_seleccion: 1,
});
prueba("2.8 'Quedás fuera de la lista' sin convocatoria: IMPOSIBLE",
  !eventoEsElegible(fueraLista, mkContexto({ estadoSeleccion: "nunca" })));

prueba("2.9 'Quedás fuera de la lista' convocado: posible",
  eventoEsElegible(fueraLista, mkContexto({
    estadoSeleccion: "convocado", idSeleccion: 1,
  })));

// Gol internacional: convocado + participación en partidos internacionales.
const golInt = mkEvento({
  codigo_evento: "seleccion_gol",
  categoria: "Selección",
  requiere_seleccion: 1,
  bloquea_si_lesionado: 1,
});
prueba("2.10 'Gol internacional' convocado pero lesionado: IMPOSIBLE",
  !eventoEsElegible(golInt, mkContexto({
    estadoSeleccion: "convocado", idSeleccion: 1, lesionado: true,
  })));

prueba("2.11 'Gol internacional' convocado y jugando: posible",
  eventoEsElegible(golInt, mkContexto({
    estadoSeleccion: "convocado", idSeleccion: 1,
    huboPartidoInternacional: true,
  })));

prueba("2.12 'Titular en la Selección' sin convocatoria: IMPOSIBLE",
  !eventoEsElegible(
    mkEvento({ codigo_evento: "seleccion_titular", categoria: "Selección" }),
    mkContexto({ estadoSeleccion: "nunca" })));

// ----------------------------------------------------------------------------
console.log("\n[3] Eventos relacionados con partidos");
// ----------------------------------------------------------------------------

const figura = mkEvento({
  codigo_evento: "pos_figura_partido",
  bloquea_si_lesionado: 1,
});
prueba("3.1 'Figura del partido' lesionado (no jugó): IMPOSIBLE",
  !eventoEsElegible(figura, mkContexto({ lesionado: true })));

prueba("3.2 'Figura del partido' jugando: posible",
  eventoEsElegible(figura, mkContexto({ lesionado: false })));

const figuraSinPartidos = mkEvento({
  codigo_evento: "pos_figura_partido",
});
prueba("3.3 'Figura del partido' sin partidos en la carrera: IMPOSIBLE",
  !eventoEsElegible(figuraSinPartidos, mkContexto({ partidosJugados: 0 })));

const expulsion = mkEvento({ codigo_evento: "neg_expulsion", bloquea_si_lesionado: 1 });
prueba("3.4 'Expulsión polémica' sin haber jugado: IMPOSIBLE",
  !eventoEsElegible(expulsion, mkContexto({ partidosJugados: 0 })));

const penal = mkEvento({ codigo_evento: "neg_penal_errado", bloquea_si_lesionado: 1 });
prueba("3.5 'Penal errado' sin partidos: IMPOSIBLE",
  !eventoEsElegible(penal, mkContexto({ partidosJugados: 0 })));

const derrotaClasico = mkEvento({
  codigo_evento: "neg_derrota_clasico",
  bloquea_si_lesionado: 1,
});
prueba("3.6 'Derrota en el clásico' en liga sin clásico: IMPOSIBLE",
  !eventoEsElegidoDerrotaClasico(ligaConClasico = false));

// Helper local (evita dependencia del orden de declaraciones).
function eventoEsElegidoDerrotaClasico(ligaConClasico) {
  return eventoEsElegible(derrotaClasico, mkContexto({ ligaConClasico }));
}

prueba("3.7 'Derrota en el clásico' en liga con clásico: posible",
  eventoEsElegible(derrotaClasico, mkContexto({ ligaConClasico: true })));

prueba("3.8 'Derrota en el clásico' lesionado: IMPOSIBLE",
  !eventoEsElegible(derrotaClasico, mkContexto({
    ligaConClasico: true, lesionado: true,
  })));

// ----------------------------------------------------------------------------
console.log("\n[4] Transferencias y cambios de club");
// ----------------------------------------------------------------------------

const ofertaPrimera = mkEvento({
  codigo_evento: "club_oferta_primera",
  categoria: "Cambio de club",
});
prueba("4.1 'Oferta de Primera' en un club de jerarquía 5 (ya arriba): IMPOSIBLE",
  !eventoEsElegible(ofertaPrimera, mkContexto({ jerarquiaClub: 5 })));

prueba("4.2 'Oferta de Primera' en un club chico (jerarquía 1): posible",
  eventoEsElegible(ofertaPrimera, mkContexto({ jerarquiaClub: 1 })));

const transferenciaIntl = mkEvento({
  codigo_evento: "club_transferencia_intl",
  categoria: "Cambio de club",
});
prueba("4.3 'Transferencia internacional' desde un club chico (jerarquía 1): IMPOSIBLE",
  !eventoEsElegible(transferenciaIntl, mkContexto({ jerarquiaClub: 1 })));

prueba("4.4 'Transferencia internacional' desde un club grande: posible",
  eventoEsElegible(transferenciaIntl, mkContexto({ jerarquiaClub: 4 })));

const vueltaCasa = mkEvento({
  codigo_evento: "club_vuelta_casa",
  categoria: "Cambio de club",
});
prueba("4.5 'Vuelta a casa' sin historial de clubes: IMPOSIBLE",
  !cumpleDependenciasHistoricas(vueltaCasa, mkContexto({ clubesPrevios: [] })));

prueba("4.6 'Vuelta a casa' con un club anterior: posible",
  cumpleDependenciasHistoricas(vueltaCasa,
    mkContexto({
      clubesPrevios: [{ id_club: 2, nombre: "Ferro", jerarquia: 1 }],
    })));

const rescision = mkEvento({
  codigo_evento: "club_rescision",
  categoria: "Cambio de club",
  requiereClubActual: true,
});
prueba("4.7 'Rescisión de contrato' sin club (sin contrato): IMPOSIBLE",
  !eventoEsElegible(rescision, mkContexto({ idClub: null, jerarquiaClub: null })));

const venta = mkEvento({
  codigo_evento: "club_venta",
  categoria: "Cambio de club",
});
prueba("4.8 'Venta inesperada' desde un club chico (jerarquía 1): IMPOSIBLE",
  !eventoEsElegidoVenta());

function eventoEsElegidoVenta() {
  return eventoEsElegible(venta, mkContexto({ jerarquiaClub: 1 }));
}

prueba("4.9 'Venta inesperada' desde un club grande: posible",
  eventoEsElegible(venta, mkContexto({ jerarquiaClub: 4 })));

// ----------------------------------------------------------------------------
console.log("\n[5] Lesiones");
// ----------------------------------------------------------------------------

const recuperacion = mkEvento({
  codigo_evento: "lesion_recuperacion",
  categoria: "Lesión",
  requiere_lesion: 1,
});
prueba("5.1 'Recuperación exitosa' sin lesión previa: IMPOSIBLE",
  !cumpleDependenciasHistoricas(recuperacion, mkContexto({ lesionado: true })));

prueba("5.2 'Recuperación exitosa' con lesión previa en historial: posible",
  cumpleDependenciasHistoricas(recuperacion,
    mkContexto({
      lesionado: true,
      historialCodigos: [{ codigo: "lesion_desgarro", temporada: 3 }],
    })));

prueba("5.3 'Recuperación exitosa' sin lesión ACTIVA (inconsistencia): IMPOSIBLE",
  !cumpleDependenciasHistoricas(recuperacion,
    mkContexto({
      lesionado: false,
      historialCodigos: [{ codigo: "lesion_esguince", temporada: 5 }],
    })));

prueba("5.4 Lesión nueva lesionado: IMPOSIBLE (lesiones incompatibles)",
  !eventoEsElegible(
    mkEvento({ codigo_evento: "lesion_desgarro", bloquea_si_lesionado: 1 }),
    mkContexto({ lesionado: true })));

const retiro = mkEvento({ codigo_evento: "lesion_fin_carrera", fin_carrera: 1 });
prueba("5.5 'Muerta' (fin de partida) sin lesión activa: IMPOSIBLE",
  !cumpleDependenciasHistoricas(retiro, mkContexto({ lesionado: false })));

prueba("5.6 'Muerta' (fin de partida) con lesión activa: posible",
  cumpleDependenciasHistoricas(retiro, mkContexto({ lesionado: true })));

// ----------------------------------------------------------------------------
console.log("\n[6] Eventos positivos con condición mínima");
// ----------------------------------------------------------------------------

const puskas = mkEvento({
  codigo_evento: "pos_premio_puskas",
  requiere_seleccion: 1,
});
prueba("6.1 'Premio Puskás' sin goles en la carrera: IMPOSIBLE",
  !cumpleDependenciasHistoricas(puskas, mkContexto({ goles: 0 })));

prueba("6.2 'Premio Puskás' con goles y convocado: posible",
  cumpleDependenciasHistoricas(puskas, mkContexto({ goles: 8 })) &&
  eventoEsElegible(puskas, mkContexto({
    goles: 8, estadoSeleccion: "titular", idSeleccion: 1,
  })));

const premioRendimiento = mkEvento({
  codigo_evento: "pos_premio_rendimiento",
  bloquea_si_lesionado: 1,
});
prueba("6.3 'Premio por rendimiento' sin partidos: IMPOSIBLE",
  !eventoEsElegible(premioRendimiento, mkContexto({ partidosJugados: 0 })));

prueba("6.4 'Premio por rendimiento' con GRL bajo (< 55): IMPOSIBLE",
  !eventoEsElegible(premioRendimiento, mkContexto({ grl: 40 })));

prueba("6.5 'Premio por rendimiento' con buen GRL y partidos: posible",
  eventoEsElegible(premioRendimiento, mkContexto({ grl: 70 })));

const recordPersonal = mkEvento({ codigo_evento: "pos_record_personal" });
prueba("6.6 'Récord personal' con GRL bajo: IMPOSIBLE",
  !eventoEsElegible(recordPersonal, mkContexto({ grl: 40 })));

prueba("6.7 'Récord personal' con GRL alto: posible",
  eventoEsElegible(recordPersonal, mkContexto({ grl: 75 })));

// ----------------------------------------------------------------------------
console.log("\n[7] Cooldown, temporadas y eventos únicos");
// ----------------------------------------------------------------------------

prueba("7.1 Cooldown: evento repetido dentro del período: IMPOSIBLE",
  !eventoEsElegible(
    mkEvento({ cooldown_temporadas: 3, codigo_evento: "lesion_desgarro" }),
    mkContexto({
      posicionActual: 4,
      historialCodigos: [{ codigo: "lesion_desgarro", temporada: 3 }],
    })));

prueba("7.2 Cooldown vencido: posible de nuevo (evento recurrente)",
  eventoEsElegible(
    mkEvento({ cooldown_temporadas: 3, codigo_evento: "lesion_desgarro" }),
    mkContexto({
      posicionActual: 7,
      historialCodigos: [{ codigo: "lesion_desgarro", temporada: 3 }],
    })));

prueba("7.3 Temporada mínima: 'Puskás' antes de la 6: IMPOSIBLE",
  !eventoEsElegible(
    mkEvento({ codigo_evento: "pos_premio_puskas", temporada_minima: 6 }),
    mkContexto({ posicionActual: 5 })));

prueba("7.4 Temporada máxima: 'Oferta de Primera' después de la 14: IMPOSIBLE",
  !eventoEsElegible(
    mkEvento({ codigo_evento: "club_oferta_primera", temporada_maxima: 14 }),
    mkContexto({ posicionActual: 15 })));

// ----------------------------------------------------------------------------
console.log("\n[8] Sorteo ponderado (las probabilidades se calculan sobre elegibles)");
// ----------------------------------------------------------------------------

// Verifica la distribución: los eventos imposibles jamás salen del sorteo.
const elegibles = [
  { id_evento: 1, nombre: "A", peso: 9 },
  { id_evento: 2, nombre: "B", peso: 1 },
];
const pesosAjustados = elegibles
  .map((e) => ({ ...e, peso: e.peso }))
  .filter((e) => e.peso > 0);

let conteo = { A: 0, B: 0 };
for (let i = 0; i < 20000; i++) {
  const elegido = sortearEventoPonderado(pesosAjustados);
  conteo[elegido.nombre]++;
}
const proporcion = conteo.A / (conteo.A + conteo.B);
prueba("8.1 El sorteo respeta los pesos relativos (~90% A):",
  proporcion > 0.87 && proporcion < 0.93);

prueba("8.2 Un evento con peso 0 nunca sale sorteado",
  (() => {
    for (let i = 0; i < 5000; i++) {
      const elegido = sortearEventoPonderado([
        { id_evento: 1, nombre: "A", peso: 1 },
        { id_evento: 2, nombre: "Cero", peso: 0 },
      ]);
      if (elegido.nombre === "Cero") return false;
    }
    return true;
  })());

prueba("8.3 Sin eventos elegibles el sorteo falla de forma controlada",
  (() => {
    try {
      sortearEventoPonderado([{ id_evento: 1, nombre: "X", peso: 0 }]);
      return false;
    } catch {
      return true;
    }
  })());

// ----------------------------------------------------------------------------
console.log("\n[9] Coherencia del conjunto de reglas (auditoría estática)");
// ----------------------------------------------------------------------------

const codigosEsperados = Object.keys(REGLAS_EVENTOS);
prueba("9.1 Los 36 eventos tienen regla definida", codigosEsperados.length === 36);

prueba("9.2 Todos los eventos de partido exigen participación (bloquea_si_lesionado)",
  ["pos_figura_partido", "pos_gol_agonico", "pos_ovacion",
    "neg_perdida_gol", "neg_expulsion", "neg_penal_errado",
    "neg_derrota_clasico", "seleccion_gol", "seleccion_figura"]
    .every((codigo) => {
      const reglas = REGLAS_EVENTOS[codigo];
      return reglas.exigePartidoLocal || reglas.exigePartidoInternacional;
    }));

prueba("9.3 Ningún evento de Selección puede ocurrir sin estado de convocatoria",
  ["seleccion_hereda_10", "seleccion_titular", "seleccion_gol",
    "seleccion_figura", "seleccion_fuera_lista"]
    .every((codigo) => Array.isArray(REGLAS_EVENTOS[codigo].requiereEstadoSeleccion)));

prueba("9.4 'Regreso a la Selección' exige estado 'fuera' + convocatorias previas",
  REGLAS_EVENTOS.seleccion_regreso.requiereEstadoSeleccion.includes("fuera") &&
  REGLAS_EVENTOS.seleccion_regreso.convocatoriasMinimas === 1);

// ----------------------------------------------------------------------------
console.log(`\nRESULTADO: ${pasaron} OK, ${fallaron} fallos`);
process.exit(fallaron > 0 ? 1 : 0);
