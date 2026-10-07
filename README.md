# 2026-TPF-G13

# El Trayecto
## Documento de Alcance y Planificación del Proyecto

> **Proyecto Integrador Interdisciplinario — Desarrollo de una aplicación web**

---

# 1. Descripción del proyecto

## Nombre de la aplicación

**El Trayecto**

## Descripción general

*El Trayecto* será una aplicación web multijugador 1v1 basada en la dinámica de los juegos de tablero. Dos jugadores competirán para construir la mejor carrera futbolística mediante lanzamientos de dado, movimientos por un tablero y eventos aleatorios.

Cada jugador comenzará en una posición inicial y avanzará según el resultado del dado. Dependiendo del casillero alcanzado, podrán ocurrir distintos eventos que afectarán positiva o negativamente su carrera.

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
- Autenticación de usuarios.
- Diferenciación entre jugador y administrador.
- Creación e ingreso a partidas 1v1 mediante salas.
- Lobby de espera.
- Límite de dos jugadores por sala.
- Tablero de juego.
- Lanzamiento de dados.
- Movimiento de los jugadores.
- Sistema de turnos.
- Eventos positivos, negativos y aleatorios.
- Sistema de puntuación.
- Comunicación en tiempo real mediante WebSockets.
- Finalización automática de la partida y determinación del ganador.
- Historial de partidas.
- Panel de administración.
- CRUD de usuarios, eventos y casilleros.
- Persistencia de información en base de datos.
- Registro de clubes, títulos y selecciones asociados a la partida.

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
- Consultar su estado y el del oponente.
- Consultar el resultado de una partida finalizada.
- Consultar su historial.

### Administrador

Podrá:

- Gestionar usuarios.
- Gestionar eventos.
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
6. Cuando hay dos jugadores, la partida comienza.
7. Se asignan los turnos.
8. El jugador correspondiente lanza el dado.
9. El sistema determina el movimiento.
10. Se ejecuta el evento del casillero correspondiente.
11. Se actualiza el estado de la partida.
12. El cambio se comunica al otro jugador mediante WebSockets.
13. Continúan los turnos hasta finalizar la partida.
14. Cuando uno de los jugadores alcanza el último casillero, finaliza la partida y se determina el ganador según la puntuación obtenida.

El backend será responsable de validar los turnos, movimientos, resultados del dado y demás acciones relacionadas con el estado de la partida.

---

# 5. Mecánica del juego

El tablero estará compuesto por casilleros con diferentes efectos.

## Dado

El jugador podrá lanzar un dado de seis caras. El resultado determinará la cantidad de casilleros que deberá avanzar.

## Casilleros

El tablero estará compuesto inicialmente por **20 casilleros**, cada uno con diferentes características y efectos.

Podrán existir:

- Casilleros normales.
- Casilleros con eventos positivos.
- Casilleros con eventos negativos.
- Casilleros con eventos aleatorios.
- Casilleros de avance.
- Casilleros de retroceso.
- Casilleros especiales.

El último casillero representará la meta del tablero.

## Eventos

Los eventos representarán diferentes situaciones de la carrera futbolística y podrán afectar positiva o negativamente los valores del jugador.

Se implementarán inicialmente y aproximadamente **20 eventos**, que podrán ser positivos, negativos, aleatorios o especiales.

Algunos ejemplos son:

- Buen rendimiento en un partido.
- Contrato con un club importante.
- Lesión.
- Suspensión.
- Transferencia.
- Pérdida de titularidad.
- Problemas con la prensa.
- Situaciones humorísticas relacionadas con el fútbol argentino.

Los eventos serán administrables desde el panel de administración.

---

# 6. Sistema de puntuación

Los eventos podrán modificar distintos valores de la carrera del jugador, como:

- Puntos de carrera.
- Goles.
- Asistencias.
- Otros valores definidos durante el desarrollo.

Al finalizar la partida, estos valores serán utilizados para determinar el ganador.

El resultado será almacenado para permitir su consulta posterior.

> **Nota:** La fórmula exacta de la puntuación final será definida por nos (G13) durante el desarrollo e implementación del juego.

El jugador que obtenga la mayor puntuación final será el ganador

---

# 7. Comunicación

## HTTP

Se utilizará `Fetch` para las operaciones que no requieran comunicación en tiempo real, como:

- Registro e inicio de sesión.
- Gestión de usuarios.
- Gestión de eventos.
- Gestión de casilleros.
- Consulta del historial.
- Operaciones CRUD.
- Consultas de información de clubes, títulos y selecciones.

## WebSockets

Se utilizarán para:

- Conexión de jugadores.
- Ingreso a salas.
- Inicio de partidas.
- Turnos.
- Lanzamientos de dados.
- Movimientos.
- Eventos.
- Actualización de estadísticas.
- Finalización de partidas.

Esto permitirá que ambos jugadores vean los cambios de la partida en tiempo real.

---

# 8. Persistencia

La aplicación utilizará una base de datos **MySQL** para almacenar:

- Usuarios.
- Partidas.
- Participantes.
- Casilleros.
- Eventos.
- Eventos ocurridos durante las partidas.
- Resultados.
- Clubes.
- Títulos.
- Selecciones.

La información permanecerá almacenada una vez finalizada una partida.

---

# 9. DER

![Diagrama](docs/DER%20-%20Proyecto%20Final%20-%20Grupo%2013.drawio.png)

# 10. Diseño inicial

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
| CRUD | Usuarios, eventos y casilleros | Juan Manuel Pereyra + Lucas Mortola | 04/11 |
| Historial | Persistencia de partidas | Lucas Mortola + Juan Manuel Pereyra | 07/11 |
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
- CRUD de usuarios, eventos y casilleros.
- Integración entre frontend, backend y base de datos.

## Hito 4 — Producto final

**17/11**

- Sistema completo y funcional.
- Persistencia de partidas.
- Historial.
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
- Eventos aleatorios.
- Sistema de puntuación.
- Historial.
- CRUD.
- Base de datos MySQL.
- Comunicación HTTP mediante Fetch.
- Comunicación en tiempo real mediante WebSockets.
- Frontend con React/Next.js.
- Backend con Node.js.
- Gestión de clubes, títulos y selecciones.
- Documentación y DER actualizado.
