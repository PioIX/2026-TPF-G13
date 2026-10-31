CREATE DATABASE IF NOT EXISTS el_trayecto;
USE el_trayecto;


CREATE TABLE Usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre_usuario VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'jugador',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE Partida (
    id_partida INT AUTO_INCREMENT PRIMARY KEY,
    nombre_sala VARCHAR(100) NOT NULL UNIQUE,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'esperando',
    id_ganador INT NULL,

    CONSTRAINT fk_partida_ganador
        FOREIGN KEY (id_ganador)
        REFERENCES Usuario(id_usuario)
);


CREATE TABLE Evento (
    id_evento INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NOT NULL,
    tipo VARCHAR(30) NOT NULL,
    efecto VARCHAR(100),
    valor INT
);


CREATE TABLE Casillero (
    id_casillero INT AUTO_INCREMENT PRIMARY KEY,
    posicion INT NOT NULL UNIQUE,
    tipo VARCHAR(30) NOT NULL,
    descripcion TEXT,
    id_evento INT NULL,

    CONSTRAINT fk_casillero_evento
        FOREIGN KEY (id_evento)
        REFERENCES Evento(id_evento)
);


CREATE TABLE Club (
    id_club INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    liga VARCHAR(100),
    jerarquia INT,
    copa_internacional BOOLEAN DEFAULT FALSE,
    descripcion TEXT
);


CREATE TABLE Titulo (
    id_titulo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pais VARCHAR(100),
    valor INT,
    es_individual BOOLEAN NOT NULL DEFAULT FALSE,
    id_casillero INT NULL,

    CONSTRAINT fk_titulo_casillero
        FOREIGN KEY (id_casillero)
        REFERENCES Casillero(id_casillero)
);


CREATE TABLE Seleccion (
    id_seleccion INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    convocado BOOLEAN NOT NULL DEFAULT FALSE
);



CREATE TABLE ParticipantePartida (
    id_participante INT AUTO_INCREMENT PRIMARY KEY,
    id_partida INT NOT NULL,
    id_usuario INT NOT NULL,
    id_club INT NULL,
    id_titulo INT NULL,
    id_seleccion INT NULL,
    puntos_campeon INT NOT NULL DEFAULT 0,
    goles INT NOT NULL DEFAULT 0,
    asistencias INT NOT NULL DEFAULT 0,
    turno BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_participante_partida
        FOREIGN KEY (id_partida)
        REFERENCES Partida(id_partida),

    CONSTRAINT fk_participante_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES Usuario(id_usuario),

    CONSTRAINT fk_participante_club
        FOREIGN KEY (id_club)
        REFERENCES Club(id_club),

    CONSTRAINT fk_participante_titulo
        FOREIGN KEY (id_titulo)
        REFERENCES Titulo(id_titulo),

    CONSTRAINT fk_participante_seleccion
        FOREIGN KEY (id_seleccion)
        REFERENCES Seleccion(id_seleccion),

    CONSTRAINT uq_usuario_partida
        UNIQUE (id_partida, id_usuario)
);


CREATE TABLE EventoPartida (
    id_evento_partida INT AUTO_INCREMENT PRIMARY KEY,
    id_partida INT NOT NULL,
    id_usuario INT NOT NULL,
    id_evento INT NOT NULL,
    id_casillero INT NOT NULL,
    semilla INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_eventopartida_partida
        FOREIGN KEY (id_partida)
        REFERENCES Partida(id_partida),

    CONSTRAINT fk_eventopartida_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES Usuario(id_usuario),

    CONSTRAINT fk_eventopartida_evento
        FOREIGN KEY (id_evento)
        REFERENCES Evento(id_evento),

    CONSTRAINT fk_eventopartida_casillero
        FOREIGN KEY (id_casillero)
        REFERENCES Casillero(id_casillero)
);

ALTER TABLE ParticipantePartida
ADD COLUMN listo BOOLEAN NOT NULL DEFAULT FALSE;


-- ============================================
-- EL TRAYECTO: SISTEMA DE PENALES
-- ============================================

-- 1. Una tanda de penales por partida
CREATE TABLE TandaPenales (
    id_tanda INT AUTO_INCREMENT PRIMARY KEY,

    id_partida INT NOT NULL UNIQUE,

    estado ENUM('en_curso', 'finalizada')
        NOT NULL DEFAULT 'en_curso',

    id_participante_primero INT NOT NULL,

    id_ganador INT NULL,

    goles_jugador1 INT NOT NULL DEFAULT 0,

    goles_jugador2 INT NOT NULL DEFAULT 0,

    ronda_actual INT NOT NULL DEFAULT 1,

    turno_actual ENUM('jugador1', 'jugador2')
        NOT NULL DEFAULT 'jugador1',

    fecha_inicio DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    fecha_fin DATETIME NULL,

    CONSTRAINT fk_tanda_partida
        FOREIGN KEY (id_partida)
        REFERENCES Partida(id_partida),

    CONSTRAINT fk_tanda_primero
        FOREIGN KEY (id_participante_primero)
        REFERENCES ParticipantePartida(id_participante),

    CONSTRAINT fk_tanda_ganador
        FOREIGN KEY (id_ganador)
        REFERENCES ParticipantePartida(id_participante)
);


-- 2. Historial de intentos de la tanda
CREATE TABLE IntentoPenal (
    id_intento INT AUTO_INCREMENT PRIMARY KEY,

    id_tanda INT NOT NULL,

    numero_ronda INT NOT NULL,

    id_participante_pateador INT NOT NULL,

    id_participante_arquero INT NOT NULL,

    direccion_pateador ENUM('izquierda', 'centro', 'derecha')
        NOT NULL,

    direccion_arquero ENUM('izquierda', 'centro', 'derecha')
        NOT NULL,

    resultado ENUM('gol', 'atajado') NOT NULL,

    fecha_intento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_intento_tanda
        FOREIGN KEY (id_tanda)
        REFERENCES TandaPenales(id_tanda),

    CONSTRAINT fk_intento_pateador
        FOREIGN KEY (id_participante_pateador)
        REFERENCES ParticipantePartida(id_participante),

    CONSTRAINT fk_intento_arquero
        FOREIGN KEY (id_participante_arquero)
        REFERENCES ParticipantePartida(id_participante)
);
