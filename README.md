# 2026-TPF-G13

# El Trayecto
## Documento de Alcance y Planificación del Proyecto

> **Proyecto Integrador Interdisciplinario — Desarrollo de una aplicación web**

---

# 1. Descripción del proyecto

## Nombre de la aplicación

**El Trayecto**

## Descripción general

*El Trayecto* será una aplicación web multijugador 1v1 basada en la dinámica de los juegos de tablero. Dos jugadores competirán para construir la mejor carrera futbolística mediante lanzamientos de dado, avance por temporadas y eventos aleatorios.

Cada jugador comenzará en una posición inicial y avanzará una casilla/temporada por turno. En cada temporada pueden ocurrir distintos eventos que afectarán positiva o negativamente su carrera.

Los eventos estarán relacionados con situaciones del mundo del fútbol, desde situaciones cotidianas hasta situaciones humorísticas, bizarras o inesperadas.

La partida se desarrollará en tiempo real utilizando WebSockets para sincronizar las acciones de ambos jugadores.

## Problemática o necesidad

El proyecto busca ofrecer una experiencia de entretenimiento interactiva y competitiva, permitiendo que dos usuarios participen simultáneamente en una misma partida.

Además, permitirá integrar frontend, backend, base de datos, autenticación, operaciones CRUD, comunicación HTTP y WebSockets, aplicando los conocimientos adquiridos durante el año.

## Público objetivo

Está dirigido principalmente a jóvenes y personas interesadas en el fútbol, los videojuegos y los juegos de tablero.

## Objetivo general

Desarrollar una aplicación web multijugador 1v1 que permita a dos usuarios competir en una partida de temática futbolística, integrando frontend, backend, persistencia de datos, autenticación, operaciones CRUD, comunicación HTTP y comunicación en tiempo real mediante WebSockets.

---

# 2. Principales funcionalidades

- Registro e inicio de sesión.
- Autenticación de usuarios por sesión (cookies).
- Diferenciación entre jugador y administrador.
- Creación e ingreso a partidas 1v1 mediante salas.
- Lobby de espera.
- Límite de dos jugadores por sala.
- Tablero de juego (20 temporadas/casilleros).
- Lanzamiento de dados.
- Movimiento de los jugadores.
- Sistema de turnos alternados.
- Eventos positivos, negativos, aleatorios y de selección (36 eventos).
- Sistema de lesiones con recuperación y turnos perdidos.
- Sistema de títulos: colectivos (con el club), internacionales (club y selección) e individuales (premios como el Balón de Oro), con reglas de elegibilidad futbolísticamente coherentes.
- Sistema de estadísticas de carrera: goles, asistencias, partidos, GRL (Gol Rating), fama, plata e idolatría.
- Economía interna: premios en dinero por títulos y eventos, con moneda según la nacionalidad de la leyenda (USD, EUR, GBP, CHF).
- Cambios de club con ofertas según jerarquía, transferencias internacionales y "vuelta a casa".
- Sistema de puntuación final: puntos por títulos más suplemento por estadísticas.
- Comunicación en tiempo real mediante WebSockets.
- Finalización automática de la partida y determinación del ganador.
- Ranking global: mejores carreras e histórico agregado por jugador.
- Panel de administración.
- CRUD de usuarios, eventos, clubes, ligas y títulos.
- Consulta de partidas desde el panel de administración.
- Persistencia de información en base de datos.
- Registro de clubes, títulos, selecciones y nacionalidades asociados a la partida.

---

# 3. Alcance

## Usuarios

### Jugador

Podrá:

- Registrarse e iniciar sesión.
- Crear o ingresar a una partida.
- Participar de una partida 1v1.
- Lanzar el dado durante su turno.
- Avanzar por el tablero.
- Recibir eventos.
- Elegir un nuevo club cuando se le ofrece un cambio.
- Consultar su estado y el del oponente en tiempo real.
- Consultar el resultado de una partida finalizada.
- Consultar el ranking global de carreras e histórico de jugadores.

### Administrador

Podrá:

- Gestionar usuarios.
- Gestionar eventos.
- Gestionar clubes y ligas.
- Gestionar títulos (colectivos, internacionales e individuales).
- Consultar información de partidas.
- Realizar operaciones de creación, consulta, modificación y eliminación.

---

# 4. Sistema de partidas

Cada partida tendrá dos jugadores y estará asociada a un nombre de sala.

Al comenzar:

1. Un jugador ingresa el nombre de una sala.
2. Si la sala no existe, el sistema crea una nueva partida asociada a ese nombre.
3. El sistema registra al primer jugador en la partida.
4. Si la sala ya existe y tiene un solo jugador, el segundo jugador puede ingresar.
5. Si la sala ya tiene dos jugadores, se rechaza el ingreso.
6. Cada jugador elige su club inicial, su selección (nacionalidad) y el nombre de su leyenda.
7. Cuando ambos confirmaron su elección y marcaron "listo", la partida comienza.
8. El jugador correspondiente lanza el dado y avanza una temporada.
9. El sistema sortea el evento de la temporada según las condiciones actuales del jugador.
10. Se aplican los efectos del evento y los títulos de la temporada.
11. Se actualiza el estado de la partida.
12. El cambio se comunica al otro jugador mediante WebSockets (el evento es privado: solo lo ve quien lo vivió).
13. Continúan los turnos hasta que uno de los jugadores complete las 20 temporadas.
14. Cuando un jugador alcanza el último casillero, la partida finaliza y se determina el ganador según la puntuación final de cada uno.

El backend es responsable de validar turnos, movimientos, resultados del dado, cambios de club y demás acciones relacionadas con el estado de la partida. Todos los cambios de un turno se aplican dentro de una transacción: si algo falla, no se aplica nada parcialmente.

---

# 5. Mecánica del juego

El tablero está compuesto por 20 casilleros/temporadas, del arranque de la carrera hasta la retirada. Cada turno el jugador tira el dado, avanza una casilla y disputa una temporada completa.

## Dado

El jugador lanza un dado de 6 caras. El resultado determina cuántas casillas se avanza en la tirada (cada tirada representa el avance de una temporada); sobre la temporada resultante se sortea el evento.

## Eventos

Los eventos representan situaciones de la carrera futbolística y afectan los valores del jugador (fama, plata, idolatría, lesiones, turnos perdidos y cambios de club).

Los eventos se sortean con pesos contextuales: cada evento exige condiciones reales para poder salir (tener contrato, estar convocado, estar lesionado, tener goles, jerarquía del club, temporadas mínimas/máximas, cooldowns) y algunos dependen del historial de la carrera (por ejemplo, "Vuelta a casa" exige haber jugado antes en ese club). Un evento imposible nunca entra al sorteo.

Categorías de eventos:

- Positivos: figura del partido, gol agónico, ovación de la gente, récord personal, premio Puskás.
- Negativos: lesiones (desgarro, esguince, fractura), rescisión de contrato, expulsión polémica, mala racha.
- Aleatorios: caída al lado oscuro, traición, señor de la noche, entre otros.
- De cambio de club: oferta de Primera, préstamo, transferencia internacional, venta inesperada, vuelta a casa.
- De selección: heredar la N°10, titular en la Selección, gol internacional, regreso a la Selección.
- Fin de carrera: retiro forzado (termina la partida para ambos jugadores).

Los eventos son administrables desde el panel de administración.

## Títulos

Al cerrar cada temporada el jugador puede ganar hasta un título por categoría:

- **Colectivos**: ligas y copas del país de su club (el prestigio no puede superar la jerarquía del club; la Supercopa exige haber sido campeón la temporada anterior).
- **Internacionales**: torneos de clubes según la confederación (Libertadores, Champions, Sudamericana, Europa League), Mundial de Clubes e Intercontinental (solo campeones continentales), y torneos de selecciones (Copa América, Eurocopa, Mundial, Olímpico sub-23, Finalissima).
- **Individuales**: premios personales (Balón de Oro, The Best, Bota de Oro, Golden Boy, goleadores), con condiciones reales de goles, edad, convocatoria y liga.

Reglas de coherencia entre jugadores: no puede haber dos campeones de la misma liga el mismo año, y el club de un rival nunca se ofrece como destino de un cambio de club.

## Cambio de club

Según el evento, el sistema ofrece clubes de la jerarquía correspondiente (más alta para transferencias, igual para rescisiones y préstamos, más baja para ventas). Cambiarse de club cuesta idolatría: la hinchada no perdona.

## Estadísticas

Durante la carrera se acumulan:

- Goles y asistencias por temporada, según la nota de rendimiento.
- GRL (Gol Rating): calidad general del jugador, con máximo histórico.
- Fama: reconocimiento público (eventos y títulos).
- Plata: premios en dinero de títulos y eventos, expresada en la moneda de la nacionalidad (USD, EUR, GBP, CHF).
- Idolatría: lo que la hinchada siente por la leyenda (eventos, títulos individuales y permanencia en el club).

---

# 6. Sistema de puntuación

El puntaje final de una carrera se compone de dos partes:

1. **Puntos por títulos**: cada título ganado suma sus puntos de campeonato (definidos por prestigio del trofeo: una liga nacional vale menos que una Champions; el Balón de Oro es el premio individual más valioso).
2. **Suplemento por estadísticas**: al finalizar la partida se suma un suplemento calculado con los goles, asistencias, fama, plata, idolatría y GRL acumulados durante la carrera.

El jugador que obtenga la mayor puntuación final es el ganador. El resultado y su desglose quedan almacenados para su consulta posterior en la pantalla final de la partida y en el ranking global.

---

# 7. Comunicación

## HTTP

Se utiliza `Fetch` para las operaciones que no requieren comunicación en tiempo real, como:

- Registro e inicio de sesión.
- Gestión de usuarios, eventos, clubes, ligas y títulos (CRUD).
- Consultas de información de clubes, ligas y selecciones.
- Elección inicial de club y selección.
- Cambio de club tras un evento.
- Consulta del ranking y de los resultados de partidas finalizadas.

## WebSockets (Socket.IO)

Se utilizan para:

- Conexión de jugadores a la sala.
- Ingreso a salas.
- Inicio de partidas.
- Turnos y lanzamientos de dados.
- Movimientos.
- Eventos (privados para quien los vivió).
- Actualización de estadísticas y paneles de jugador.
- Finalización de partidas.

Esto permite que ambos jugadores vean los cambios de la partida en tiempo real.

---

# 8. Persistencia

La aplicación utiliza una base de datos **MySQL** para almacenar:

- Usuarios (con roles jugador/administrador).
- Partidas y participantes de partida (con el estado completo de cada carrera).
- Clubes, ligas, selecciones y estadlos.
- Eventos y sus efectos.
- Eventos ocurridos durante las partidas (con semilla reproducible para auditoría).
- Estado de carrera por evento (cooldowns y dependencias históricas).
- Historial de clubes por participante.
- Títulos colectivos, internacionales e individuales, y títulos ganados por cada carrera.
- Resultados finales y puntajes.

La información permanece almacenada una vez finalizada una partida.

---

# 9. DER

![Diagrama](docs/DER%20-%20Proyecto%20Final%20-%20Grupo%2013.drawio.png)

# 10. Diseño inicial

> Capturas del diseño inicial del juego (puede diferir de la implementación final).

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(490).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(491).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(492).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(493).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(494).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(495).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(496).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(497).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(498).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(499).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(500).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(501).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(502).png)

![Diagrama](docs/diseño/Captura%20de%20pantalla%20(503).png)

---

# 11. Planificación

| Objetivo | Tareas | Responsable | Fecha |
|---|---|---|---|
| Configuración inicial | Repositorio y estructura | Jose Groppa + Ezequiel Barbeito | 06/10 |
| Base de datos | DER, tablas y script SQL | Juan Manuel Pereyra + Santino Capote | 08/10 |
| Usuarios | Registro, login y roles | Jose Groppa + Juan Manuel Pereyra | 13/10 |
| Frontend | Layout y pantallas principales | Lucas Mortola | 15/10 |
| Backend | Servidor, API y BD | Juan Manuel Pereyra | 15/10 |
| Tablero | Casilleros y movimiento | Santino Capote + Jose Groppa | 20/10 |
| Dado | Lanzamiento y procesamiento | Santino Capote | 21/10 |
| Eventos | Eventos y efectos | Santino Capote + Lucas Mortola | 24/10 |
| Partidas 1v1 | Creación e ingreso a salas | Ezequiel Barbeito + Juan Manuel Pereyra | 27/10 |
| WebSockets | Sincronización en tiempo real | Ezequiel Barbeito | 31/10 |
| CRUD | Usuarios, eventos, clubes, ligas y títulos | Juan Manuel Pereyra + Lucas Mortola | 04/11 |
| Ranking | Persistencia y ranking de carreras | Lucas Mortola + Juan Manuel Pereyra | 07/11 |
| Integración | Integración general | Todo el grupo | 11/11 |
| Pruebas | Testing y corrección | Todo el grupo | 14/11 |
| Documentación | README y DER final | Todo el grupo | 17/11 |
| Presentación | Preparación de la demo | Todo el grupo | 19/11 |

---

# 12. Hitos

## Hito 1 — Sistema base

**13/10**

- Proyecto configurado.
- Base de datos inicial.
- Backend y frontend funcionando.
- Registro, login y roles.

## Hito 2 — Primera versión jugable

**27/10**

- Tablero.
- Dado.
- Turnos.
- Eventos.
- Partida 1v1.
- Sistema de salas.

## Hito 3 — Juego en tiempo real y sistema integrado

**04/11**

- Comunicación mediante WebSockets.
- Sincronización de ambos jugadores.
- Movimientos y eventos en tiempo real.
- CRUD de usuarios, eventos, clubes, ligas y títulos.
- Integración entre frontend, backend y base de datos.

## Hito 4 — Producto final

**17/11**

- Sistema completo y funcional.
- Persistencia de partidas.
- Ranking de carreras.
- Panel de administración.
- Pruebas y corrección de errores.
- Documentación completa.
- DER actualizado respecto de la implementación final.

---

# 13. Distribución del trabajo

| Integrante | Área principal | Responsabilidades |
|---|---|---|
| **Lucas Mortola** | Frontend | Pantallas, navegación, tablero y componentes visuales. |
| **Juan Manuel Pereyra** | Backend | API, lógica de negocio, autenticación y usuarios. |
| **Ezequiel Barbeito** | Base de datos | DER, tablas, relaciones y persistencia. |
| **Jose Groppa** | Lógica del juego | Dado, movimiento, turnos, eventos y puntuación. |
| **Santino Capote** | WebSockets e integración | Comunicación en tiempo real e integración frontend/backend. |

La distribución de responsabilidades tiene como objetivo organizar el desarrollo y asignar áreas principales de trabajo, pero no implica una separación absoluta de conocimientos.

Todos los integrantes deberán conocer el funcionamiento general de la aplicación y comprender los principales componentes desarrollados por los demás integrantes.

Además, participarán en revisiones de código, pruebas e integración de las distintas partes del proyecto.

Todos los integrantes deberán participar activamente en Issues, ramas, Pull Requests y commits, manteniendo una participación coherente durante todo el desarrollo.

---

# 14. Resultado esperado

El producto final será una aplicación web en la que dos jugadores podrán competir para construir la mejor carrera futbolística.

El sistema contará con:

- Usuarios y autenticación.
- Roles de jugador y administrador.
- Partidas 1v1.
- Sistema de salas con un máximo de dos jugadores.
- Tablero y dado.
- Eventos aleatorios con condiciones y dependencias históricas.
- Sistema de títulos colectivos, internacionales e individuales.
- Sistema de puntuación con desglose final.
- Economía interna con moneda por nacionalidad.
- Ranking global de carreras e histórico de jugadores.
- CRUD de usuarios, eventos, clubes, ligas y títulos.
- Base de datos MySQL.
- Comunicación HTTP mediante Fetch.
- Comunicación en tiempo real mediante WebSockets.
- Frontend con React/Next.js.
- Backend con Node.js.
- Gestión de clubes, títulos y selecciones.
- Documentación y DER actualizado.
