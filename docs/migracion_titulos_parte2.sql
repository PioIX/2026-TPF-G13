-- SEGUNDA PARTE de la migración de títulos.
-- Correr esto (solamente esto) porque la primera pasada ya hizo el backup
-- y falló en el DROP TABLE Titulo por la foreign key.
USE el_trayecto;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS Titulo;

CREATE TABLE Titulo (
    id_titulo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    pais VARCHAR(100),
    puntos_campeon INT NOT NULL,
    prestigio TINYINT NOT NULL DEFAULT 1,
    imagen VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS TituloIndividual (
    id_titulo_individual INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    puntos_campeon INT NOT NULL,
    prestigio TINYINT NOT NULL DEFAULT 1,
    imagen VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS TituloInternacional (
    id_titulo_internacional INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    puntos_campeon INT NOT NULL,
    prestigio TINYINT NOT NULL DEFAULT 1,
    continente VARCHAR(50) NOT NULL,
    imagen VARCHAR(255) NULL
);

CREATE TABLE IF NOT EXISTS TituloGanado (
    id_titulo_ganado INT AUTO_INCREMENT PRIMARY KEY,
    id_participante INT NOT NULL,
    id_titulo INT NULL,
    id_titulo_individual INT NULL,
    id_titulo_internacional INT NULL,
    temporada INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_titulo_ganado_participante
        FOREIGN KEY (id_participante)
        REFERENCES ParticipantePartida(id_participante),

    CONSTRAINT fk_titulo_ganado_titulo
        FOREIGN KEY (id_titulo)
        REFERENCES Titulo(id_titulo),

    CONSTRAINT fk_titulo_ganado_individual
        FOREIGN KEY (id_titulo_individual)
        REFERENCES TituloIndividual(id_titulo_individual),

    CONSTRAINT fk_titulo_ganado_internacional
        FOREIGN KEY (id_titulo_internacional)
        REFERENCES TituloInternacional(id_titulo_internacional)
);

-- Las columnas nuevas de ParticipantePartida pueden ya existir si la
-- primera pasada llegó hasta acá; por eso no se agregan con ALTER.
-- Si SHOW COLUMNS no las muestra, descomentar:
-- ALTER TABLE ParticipantePartida
--     ADD COLUMN id_titulo_individual INT NULL,
--     ADD COLUMN id_titulo_internacional INT NULL;

INSERT INTO Titulo (nombre, pais, puntos_campeon, prestigio, imagen) VALUES
    ('Liga Profesional Argentina', 'Argentina', 120, 2, '/images/titulos/liga.png'),
    ('Premier League', 'Inglaterra', 180, 4, '/images/titulos/premier.png'),
    ('La Liga', 'España', 180, 4, '/images/titulos/laliga.png'),
    ('Serie A', 'Italia', 170, 4, '/images/titulos/seriea.png'),
    ('Bundesliga', 'Alemania', 170, 4, '/images/titulos/bundesliga.png'),
    ('Ligue 1', 'Francia', 150, 3, '/images/titulos/ligue1.png'),
    ('Eredivisie', 'Países Bajos', 110, 2, '/images/titulos/eredivisie.png'),
    ('Primera División de Portugal', 'Portugal', 100, 2, '/images/titulos/portugal.png'),
    ('Copa Nacional', NULL, 60, 1, '/images/titulos/copa-nacional.png'),
    ('Supercopa Nacional', NULL, 35, 1, '/images/titulos/supercopa.png');

INSERT INTO TituloIndividual (nombre, puntos_campeon, prestigio, imagen) VALUES
    ('Goleador de la Liga', 80, 2, '/images/titulos/goleador.png'),
    ('Mejor Jugador de la Temporada', 120, 3, '/images/titulos/mvp.png'),
    ('Balón de Oro', 250, 5, '/images/titulos/balon-de-oro.png'),
    ('Mejor Jugador Joven', 70, 2, '/images/titulos/joven.png'),
    ('Mejor Arquero del Año', 70, 2, '/images/titulos/arquero.png'),
    ('Bota de Oro', 150, 4, '/images/titulos/bota-de-oro.png');

INSERT INTO TituloInternacional (nombre, puntos_campeon, prestigio, continente, imagen) VALUES
    ('Copa Libertadores', 200, 5, 'América del Sur', '/images/titulos/libertadores.png'),
    ('Copa Sudamericana', 130, 3, 'América del Sur', '/images/titulos/sudamericana.png'),
    ('UEFA Champions League', 300, 5, 'Europa', '/images/titulos/champions.png'),
    ('UEFA Europa League', 160, 3, 'Europa', '/images/titulos/europa-league.png'),
    ('Copa Mundial de Clubes', 280, 5, 'Mundial', '/images/titulos/mundial-clubes.png'),
    ('Copa América', 180, 4, 'América del Sur', '/images/titulos/copamerica.png'),
    ('Eurocopa', 200, 4, 'Europa', '/images/titulos/eurocopa.png'),
    ('Mundial de Selecciones', 320, 5, 'Mundial', '/images/titulos/mundial.png');

SET FOREIGN_KEY_CHECKS = 1;
