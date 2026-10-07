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