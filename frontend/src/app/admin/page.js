"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./admin.css";

const API_BASE = "http://localhost:4000";

const SECCIONES = [
    { id: "usuarios", etiqueta: "Usuarios" },
    { id: "eventos", etiqueta: "Eventos" },
    { id: "partidas", etiqueta: "Partidas" },
    { id: "titulos-nacionales", etiqueta: "Títulos locales" },
    { id: "titulos-internacionales", etiqueta: "Títulos internacionales" },
    { id: "titulos-individuales", etiqueta: "Títulos individuales" },
    { id: "clubes", etiqueta: "Clubes" },
    { id: "ligas", etiqueta: "Ligas" }
];

// Definición de las tres tablas de títulos.
// "tipo" coincide con el segmento usado en /admin/titulos/:tipo del backend.
const CONFIG_TITULOS = {
    "titulos-nacionales": {
        tipo: "nacionales",
        titulo: "Títulos locales / nacionales",
        tabla: "Titulo",
        columnaId: "id_titulo",
        camposTexto: ["nombre", "pais", "imagen"],
        camposNumero: ["puntos_campeon", "prestigio"]
    },
    "titulos-internacionales": {
        tipo: "internacionales",
        titulo: "Títulos internacionales",
        tabla: "TituloInternacional",
        columnaId: "id_titulo_internacional",
        camposTexto: ["nombre", "continente", "imagen"],
        camposNumero: ["puntos_campeon", "prestigio"]
    },
    "titulos-individuales": {
        tipo: "individuales",
        titulo: "Títulos individuales",
        tabla: "TituloIndividual",
        columnaId: "id_titulo_individual",
        camposTexto: ["nombre", "imagen"],
        camposNumero: ["puntos_campeon", "prestigio"]
    }
};

export default function AdminPage() {
    const router = useRouter();

    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [seccion, setSeccion] = useState("usuarios");

    function cerrarSesion() {
        fetch(`${API_BASE}/logout`, {
            method: "POST",
            credentials: "include"
        })
            .then((respuesta) => {
                if (respuesta.ok) {
                    router.push("/login");
                }
            })
            .catch((error) => console.error(error));
    }

    useEffect(() => {
        function obtenerUsuario() {
            fetch(`${API_BASE}/usuario`, {
                method: "GET",
                credentials: "include"
            })
                .then((respuesta) => {
                    if (!respuesta.ok) {
                        return respuesta.json().then((datos) => {
                            throw new Error(datos.error);
                        });
                    }
                    return respuesta.json();
                })
                .then((datos) => {
                    if (datos.rol !== "admin") {
                        throw new Error("No tenés permiso para acceder al panel de administración");
                    }
                    setUsuario(datos);
                })
                .catch((error) => {
                    console.error(error);
                    setError(error.message);
                })
                .finally(() => {
                    setCargando(false);
                });
        }

        obtenerUsuario();
    }, []);

    if (cargando) {
        return (
            <main className="admin-page">
                <p className="admin-estado">Cargando...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="admin-page">
                <section className="admin-panel admin-panel--solo">
                    <p className="admin-error">{error}</p>
                    <button
                        type="button"
                        className="admin-boton admin-boton--primario"
                        onClick={() => router.push("/inicio")}
                    >
                        Volver al inicio
                    </button>
                </section>
            </main>
        );
    }

    return (
        <main className="admin-page">
            <section className="admin-panel">
                <header className="admin-encabezado">
                    <div>
                        <p className="admin-etiqueta">PANEL DE ADMINISTRACIÓN</p>
                        <h1 className="admin-titulo">El Trayecto</h1>
                        <p className="admin-subtitulo">
                            Bienvenido, {usuario.nombre_usuario}.
                        </p>
                    </div>

                    <div className="admin-acciones-encabezado">
                        <button
                            type="button"
                            className="admin-boton admin-boton--secundario"
                            onClick={() => router.push("/inicio")}
                        >
                            Inicio
                        </button>
                        <button
                            type="button"
                            className="admin-boton admin-boton--secundario"
                            onClick={cerrarSesion}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </header>

                <nav className="admin-tabs" aria-label="Secciones del panel">
                    {SECCIONES.map((opcion) => (
                        <button
                            key={opcion.id}
                            type="button"
                            className={`admin-tab${seccion === opcion.id ? " admin-tab--activa" : ""}`}
                            onClick={() => setSeccion(opcion.id)}
                        >
                            {opcion.etiqueta}
                        </button>
                    ))}
                </nav>

                <div className="admin-contenido" key={seccion}>
                    {seccion === "usuarios" && <SeccionUsuarios usuarioActual={usuario} />}
                    {seccion === "eventos" && <SeccionEventos />}
                    {seccion === "partidas" && <SeccionPartidas />}
                    {CONFIG_TITULOS[seccion] && (
                        <SeccionTitulos config={CONFIG_TITULOS[seccion]} />
                    )}
                    {seccion === "clubes" && <SeccionClubes />}
                    {seccion === "ligas" && <SeccionLigas />}
                </div>
            </section>
        </main>
    );
}

// ============================================================================
// SECCIÓN: USUARIOS
// ============================================================================

function SeccionUsuarios({ usuarioActual }) {
    const [usuarios, setUsuarios] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editandoId, setEditandoId] = useState(null);
    const [formEdicion, setFormEdicion] = useState({
        nombre_usuario: "",
        email: "",
        rol: "jugador"
    });

    const cargarUsuarios = useCallback(() => {
        setCargando(true);
        setError("");
        fetch(`${API_BASE}/admin/usuarios`, {
            method: "GET",
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then((datos) => {
                setUsuarios(datos);
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                setCargando(false);
            });
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            cargarUsuarios();
        }, 0);
        return () => clearTimeout(id);
    }, [cargarUsuarios]);

    function iniciarEdicion(usuario) {
        setEditandoId(usuario.id_usuario);
        setFormEdicion({
            nombre_usuario: usuario.nombre_usuario,
            email: usuario.email,
            rol: usuario.rol
        });
        setError("");
        setMensaje("");
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormEdicion({ nombre_usuario: "", email: "", rol: "jugador" });
    }

    function guardarEdicion(event) {
        event.preventDefault();
        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/usuarios/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(formEdicion)
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then(() => {
                setMensaje("Usuario modificado correctamente.");
                setEditandoId(null);
                cargarUsuarios();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    function eliminarUsuario(usuario) {
        const confirmar = window.confirm(
            `¿Eliminar al usuario "${usuario.nombre_usuario}"? Esta acción no se puede deshacer.`
        );

        if (!confirmar) return;

        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/usuarios/${usuario.id_usuario}`, {
            method: "DELETE",
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then(() => {
                setMensaje("Usuario eliminado correctamente.");
                cargarUsuarios();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    if (cargando) {
        return <p className="admin-estado">Cargando usuarios...</p>;
    }

    if (error && usuarios.length === 0) {
        return <p className="admin-error">{error}</p>;
    }

    return (
        <div className="admin-bloque">
            <div className="admin-bloque-encabezado">
                <h2 className="admin-bloque-titulo">Gestión de usuarios</h2>
                <button
                    type="button"
                    className="admin-boton admin-boton--primario"
                    onClick={cargarUsuarios}
                >
                    Recargar
                </button>
            </div>

            {mensaje && <p className="admin-mensaje">{mensaje}</p>}
            {error && <p className="admin-error">{error}</p>}

            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Registro</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map((usuario) => (
                            <tr key={usuario.id_usuario}>
                                {editandoId === usuario.id_usuario ? (
                                    <>
                                        <td>{usuario.id_usuario}</td>
                                        <td>
                                            <input
                                                type="text"
                                                className="admin-input"
                                                value={formEdicion.nombre_usuario}
                                                onChange={(event) =>
                                                    setFormEdicion((estado) => ({
                                                        ...estado,
                                                        nombre_usuario: event.target.value
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="email"
                                                className="admin-input"
                                                value={formEdicion.email}
                                                onChange={(event) =>
                                                    setFormEdicion((estado) => ({
                                                        ...estado,
                                                        email: event.target.value
                                                    }))
                                                }
                                            />
                                        </td>
                                        <td>
                                            <select
                                                className="admin-input"
                                                value={formEdicion.rol}
                                                onChange={(event) =>
                                                    setFormEdicion((estado) => ({
                                                        ...estado,
                                                        rol: event.target.value
                                                    }))
                                                }
                                            >
                                                <option value="jugador">jugador</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td>{formatearFecha(usuario.fecha_registro)}</td>
                                        <td className="admin-tabla-acciones">
                                            <button
                                                type="button"
                                                className="admin-boton admin-boton--primario admin-boton--pequeno"
                                                onClick={guardarEdicion}
                                            >
                                                Guardar
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-boton admin-boton--secundario admin-boton--pequeno"
                                                onClick={cancelarEdicion}
                                            >
                                                Cancelar
                                            </button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td>{usuario.id_usuario}</td>
                                        <td>{usuario.nombre_usuario}</td>
                                        <td>{usuario.email}</td>
                                        <td>
                                            <span className={`admin-chip admin-chip--${usuario.rol}`}>
                                                {usuario.rol}
                                            </span>
                                        </td>
                                        <td>{formatearFecha(usuario.fecha_registro)}</td>
                                        <td className="admin-tabla-acciones">
                                            <button
                                                type="button"
                                                className="admin-boton admin-boton--secundario admin-boton--pequeno"
                                                onClick={() => iniciarEdicion(usuario)}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                className="admin-boton admin-boton--peligro admin-boton--pequeno"
                                                onClick={() => eliminarUsuario(usuario)}
                                                disabled={
                                                    usuario.id_usuario === usuarioActual.id_usuario
                                                }
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// SECCIÓN: EVENTOS
// ============================================================================

const CATEGORIAS_EVENTO = ["positivo", "negativo", "aleatorio", "especial"];

function SeccionEventos() {
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const [creando, setCreando] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [formulario, setFormulario] = useState(formularioVacio());

    function formularioVacio() {
        return {
            nombre: "",
            descripcion: "",
            categoria: "positivo",
            efecto_fama: 0,
            efecto_plata: 0,
            efecto_idolatria: 0,
            bloquea_avance: false,
            peso: 10,
            turnos_perdidos: 0
        };
    }

    const cargarEventos = useCallback(() => {
        setCargando(true);
        setError("");
        fetch(`${API_BASE}/admin/eventos`, {
            method: "GET",
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then((datos) => {
                setEventos(datos);
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                setCargando(false);
            });
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            cargarEventos();
        }, 0);
        return () => clearTimeout(id);
    }, [cargarEventos]);

    function abrirCreacion() {
        setCreando(true);
        setEditandoId(null);
        setFormulario(formularioVacio());
        setError("");
        setMensaje("");
    }

    function abrirEdicion(evento) {
        setCreando(false);
        setEditandoId(evento.id_evento);
        setFormulario({
            nombre: evento.nombre,
            descripcion: evento.descripcion,
            categoria: evento.categoria,
            efecto_fama: evento.efecto_fama ?? 0,
            efecto_plata: evento.efecto_plata ?? 0,
            efecto_idolatria: evento.efecto_idolatria ?? 0,
            bloquea_avance: Boolean(evento.bloquea_avance),
            peso: evento.peso ?? 10,
            turnos_perdidos: evento.turnos_perdidos ?? 0
        });
        setError("");
        setMensaje("");
    }

    function cancelarFormulario() {
        setCreando(false);
        setEditandoId(null);
        setFormulario(formularioVacio());
    }

    function manejarCambio(campo, valor) {
        setFormulario((estado) => ({ ...estado, [campo]: valor }));
    }

    function enviarFormulario(event) {
        event.preventDefault();
        setError("");
        setMensaje("");

        const url = editandoId
            ? `${API_BASE}/admin/eventos/${editandoId}`
            : `${API_BASE}/admin/eventos`;
        const metodo = editandoId ? "PUT" : "POST";

        fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(formulario)
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then(() => {
                setMensaje(
                    editandoId
                        ? "Evento modificado correctamente."
                        : "Evento creado correctamente."
                );
                cancelarFormulario();
                cargarEventos();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    function eliminarEvento(evento) {
        const confirmar = window.confirm(
            `¿Eliminar el evento "${evento.nombre}"? Esta acción no se puede deshacer.`
        );

        if (!confirmar) return;

        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/eventos/${evento.id_evento}`, {
            method: "DELETE",
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then(() => {
                setMensaje("Evento eliminado correctamente.");
                cargarEventos();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    const mostrandoFormulario = creando || editandoId !== null;

    if (cargando) {
        return <p className="admin-estado">Cargando eventos...</p>;
    }

    return (
        <div className="admin-bloque">
            <div className="admin-bloque-encabezado">
                <h2 className="admin-bloque-titulo">Gestión de eventos</h2>
                <div className="admin-bloque-acciones">
                    {!mostrandoFormulario && (
                        <button
                            type="button"
                            className="admin-boton admin-boton--primario"
                            onClick={abrirCreacion}
                        >
                            Nuevo evento
                        </button>
                    )}
                    <button
                        type="button"
                        className="admin-boton admin-boton--secundario"
                        onClick={cargarEventos}
                    >
                        Recargar
                    </button>
                </div>
            </div>

            {mensaje && <p className="admin-mensaje">{mensaje}</p>}
            {error && <p className="admin-error">{error}</p>}

            {mostrandoFormulario && (
                <form className="admin-formulario" onSubmit={enviarFormulario}>
                    <h3 className="admin-formulario-titulo">
                        {editandoId ? "Editar evento" : "Crear evento"}
                    </h3>

                    <div className="admin-formulario-grid">
                        <div className="admin-campo">
                            <label htmlFor="evento-nombre">Nombre</label>
                            <input
                                id="evento-nombre"
                                type="text"
                                className="admin-input"
                                value={formulario.nombre}
                                onChange={(event) =>
                                    manejarCambio("nombre", event.target.value)
                                }
                                required
                                maxLength={100}
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="evento-categoria">Categoría</label>
                            <select
                                id="evento-categoria"
                                className="admin-input"
                                value={formulario.categoria}
                                onChange={(event) =>
                                    manejarCambio("categoria", event.target.value)
                                }
                            >
                                {CATEGORIAS_EVENTO.map((categoria) => (
                                    <option key={categoria} value={categoria}>
                                        {categoria}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="admin-campo admin-campo--completo">
                            <label htmlFor="evento-descripcion">Descripción</label>
                            <textarea
                                id="evento-descripcion"
                                className="admin-input admin-textarea"
                                value={formulario.descripcion}
                                onChange={(event) =>
                                    manejarCambio("descripcion", event.target.value)
                                }
                                required
                                rows={3}
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="evento-fama">Efecto fama</label>
                            <input
                                id="evento-fama"
                                type="number"
                                className="admin-input"
                                value={formulario.efecto_fama}
                                onChange={(event) =>
                                    manejarCambio("efecto_fama", Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="evento-plata">Efecto plata</label>
                            <input
                                id="evento-plata"
                                type="number"
                                className="admin-input"
                                value={formulario.efecto_plata}
                                onChange={(event) =>
                                    manejarCambio("efecto_plata", Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="evento-idolatria">Efecto idolatría</label>
                            <input
                                id="evento-idolatria"
                                type="number"
                                className="admin-input"
                                value={formulario.efecto_idolatria}
                                onChange={(event) =>
                                    manejarCambio("efecto_idolatria", Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="evento-peso">Peso</label>
                            <input
                                id="evento-peso"
                                type="number"
                                className="admin-input"
                                min={1}
                                value={formulario.peso}
                                onChange={(event) =>
                                    manejarCambio("peso", Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="evento-turnos">Turnos perdidos</label>
                            <input
                                id="evento-turnos"
                                type="number"
                                className="admin-input"
                                min={0}
                                value={formulario.turnos_perdidos}
                                onChange={(event) =>
                                    manejarCambio("turnos_perdidos", Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="admin-campo admin-campo--checkbox">
                            <label htmlFor="evento-bloquea">
                                <input
                                    id="evento-bloquea"
                                    type="checkbox"
                                    checked={formulario.bloquea_avance}
                                    onChange={(event) =>
                                        manejarCambio("bloquea_avance", event.target.checked)
                                    }
                                />
                                Bloquea el avance
                            </label>
                        </div>
                    </div>

                    <div className="admin-formulario-acciones">
                        <button
                            type="submit"
                            className="admin-boton admin-boton--primario"
                        >
                            {editandoId ? "Guardar cambios" : "Crear evento"}
                        </button>
                        <button
                            type="button"
                            className="admin-boton admin-boton--secundario"
                            onClick={cancelarFormulario}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Categoría</th>
                            <th>Efectos</th>
                            <th>Peso</th>
                            <th>Bloquea</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {eventos.length === 0 && (
                            <tr>
                                <td colSpan={7} className="admin-tabla-vacia">
                                    No hay eventos cargados todavía.
                                </td>
                            </tr>
                        )}

                        {eventos.map((evento) => (
                            <tr key={evento.id_evento}>
                                <td>{evento.id_evento}</td>
                                <td>
                                    <strong>{evento.nombre}</strong>
                                    <p className="admin-tabla-descripcion">
                                        {evento.descripcion}
                                    </p>
                                </td>
                                <td>
                                    <span className={`admin-chip admin-chip--${evento.categoria}`}>
                                        {evento.categoria}
                                    </span>
                                </td>
                                <td>
                                    <ul className="admin-efectos">
                                        <li>Fama: {evento.efecto_fama}</li>
                                        <li>Plata: {evento.efecto_plata}</li>
                                        <li>Idolatría: {evento.efecto_idolatria}</li>
                                        <li>Turnos perdidos: {evento.turnos_perdidos}</li>
                                    </ul>
                                </td>
                                <td>{evento.peso}</td>
                                <td>{evento.bloquea_avance ? "Sí" : "No"}</td>
                                <td className="admin-tabla-acciones">
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--secundario admin-boton--pequeno"
                                        onClick={() => abrirEdicion(evento)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--peligro admin-boton--pequeno"
                                        onClick={() => eliminarEvento(evento)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// SECCIÓN: PARTIDAS (solo lectura)
// ============================================================================

function SeccionPartidas() {
    const [partidas, setPartidas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    // Estado del popover anclado al botón que lo abrió.
    const [idAbierto, setIdAbierto] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [errorDetalle, setErrorDetalle] = useState("");

    const cargarPartidas = useCallback(() => {
        setCargando(true);
        setError("");
        fetch(`${API_BASE}/admin/partidas`, {
            method: "GET",
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then((datos) => {
                setPartidas(datos);
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                setCargando(false);
            });
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            cargarPartidas();
        }, 0);
        return () => clearTimeout(id);
    }, [cargarPartidas]);

    // Cerrar con tecla Escape.
    useEffect(() => {
        if (idAbierto === null) return;

        function cerrar(event) {
            if (event.key === "Escape") {
                cerrarDetalle();
            }
        }

        window.addEventListener("keydown", cerrar);
        return () => window.removeEventListener("keydown", cerrar);
    }, [idAbierto]);

    function verDetalle(partida) {
        // Si ya está abierto para esta misma partida, lo cerramos (toggle).
        if (idAbierto === partida.id_partida) {
            cerrarDetalle();
            return;
        }

        setIdAbierto(partida.id_partida);
        setDetalle(null);
        setErrorDetalle("");
        setCargandoDetalle(true);

        fetch(`${API_BASE}/admin/partidas/${partida.id_partida}`, {
            method: "GET",
            credentials: "include"
        })
            .then((respuesta) => {
                if (!respuesta.ok) {
                    return respuesta.json().then((datos) => {
                        throw new Error(datos.error);
                    });
                }
                return respuesta.json();
            })
            .then((datos) => {
                setDetalle(datos);
            })
            .catch((error) => {
                console.error(error);
                setErrorDetalle(error.message);
            })
            .finally(() => {
                setCargandoDetalle(false);
            });
    }

    function cerrarDetalle() {
        setIdAbierto(null);
        setDetalle(null);
        setErrorDetalle("");
        setCargandoDetalle(false);
    }

    if (cargando) {
        return <p className="admin-estado">Cargando partidas...</p>;
    }

    if (error) {
        return <p className="admin-error">{error}</p>;
    }

    return (
        <div className="admin-bloque">
            <div className="admin-bloque-encabezado">
                <h2 className="admin-bloque-titulo">Consulta de partidas</h2>
                <button
                    type="button"
                    className="admin-boton admin-boton--primario"
                    onClick={cargarPartidas}
                >
                    Recargar
                </button>
            </div>

            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Sala</th>
                            <th>Estado</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th>Ganador</th>
                            <th>Participantes</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {partidas.length === 0 && (
                            <tr>
                                <td colSpan={8} className="admin-tabla-vacia">
                                    Aún no se registraron partidas.
                                </td>
                            </tr>
                        )}

                        {partidas.map((partida) => {
                            const abierto = idAbierto === partida.id_partida;
                            return (
                                <tr key={partida.id_partida}>
                                    <td>{partida.id_partida}</td>
                                    <td>{partida.nombre_sala}</td>
                                    <td>
                                        <span className={`admin-chip admin-chip--${partida.estado}`}>
                                            {partida.estado}
                                        </span>
                                    </td>
                                    <td>{formatearFecha(partida.fecha_inicio)}</td>
                                    <td>{formatearFecha(partida.fecha_fin)}</td>
                                    <td>{partida.nombre_ganador || "—"}</td>
                                    <td>{partida.cantidad_participantes}</td>
                                    <td className="admin-tabla-acciones admin-celda-popover">
                                        <button
                                            type="button"
                                            className={`admin-boton admin-boton--secundario admin-boton--pequeno${abierto ? " admin-boton--activo" : ""}`}
                                            onClick={() => verDetalle(partida)}
                                            aria-expanded={abierto}
                                        >
                                            {abierto ? "Ocultar detalle" : "Ver detalle"}
                                        </button>

                                        {abierto && (
                                            <PopoverDetalle
                                                partida={partida}
                                                detalle={detalle}
                                                cargando={cargandoDetalle}
                                                error={errorDetalle}
                                                onCerrar={cerrarDetalle}
                                            />
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PopoverDetalle({ partida, detalle, cargando, error, onCerrar }) {
    return (
        <div
            className="admin-popover"
            role="dialog"
            aria-label={`Detalle de la partida ${partida.nombre_sala}`}
        >
            <div className="admin-popover-encabezado">
                <div>
                    <p className="admin-etiqueta">DETALLE DE PARTIDA</p>
                    <h3 className="admin-bloque-titulo">{partida.nombre_sala}</h3>
                </div>
                <button
                    type="button"
                    className="admin-modal-cerrar"
                    onClick={onCerrar}
                    aria-label="Cerrar"
                >
                    ×
                </button>
            </div>

            <div className="admin-popover-cuerpo">
                {cargando && <p className="admin-estado">Cargando detalle...</p>}

                {error && <p className="admin-error">{error}</p>}

                {detalle && (
                    <>
                        <p>
                            <strong>ID:</strong> {detalle.partida.id_partida}
                        </p>
                        <p>
                            <strong>Estado:</strong> {detalle.partida.estado}
                        </p>
                        <p>
                            <strong>Inicio:</strong>{" "}
                            {formatearFecha(detalle.partida.fecha_inicio)}
                        </p>
                        <p>
                            <strong>Fin:</strong>{" "}
                            {formatearFecha(detalle.partida.fecha_fin)}
                        </p>
                        <p>
                            <strong>Ganador:</strong>{" "}
                            {detalle.partida.nombre_ganador || "—"}
                        </p>

                        <h4 className="admin-subtitulo-seccion">Participantes</h4>
                        <div className="admin-tabla-contenedor">
                            <table className="admin-tabla">
                                <thead>
                                    <tr>
                                        <th>Jugador</th>
                                        <th>Leyenda</th>
                                        <th>Goles</th>
                                        <th>Asist.</th>
                                        <th>Fama</th>
                                        <th>Plata</th>
                                        <th>Idolatría</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detalle.participantes.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="admin-tabla-vacia">
                                                Sin participantes registrados.
                                            </td>
                                        </tr>
                                    )}
                                    {detalle.participantes.map((participante) => (
                                        <tr key={participante.id_participante}>
                                            <td>{participante.nombre_usuario}</td>
                                            <td>{participante.nombre_leyenda}</td>
                                            <td>{participante.goles}</td>
                                            <td>{participante.asistencias}</td>
                                            <td>{participante.fama}</td>
                                            <td>{participante.plata}</td>
                                            <td>{participante.idolatria}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {detalle.eventos && detalle.eventos.length > 0 && (
                            <>
                                <h4 className="admin-subtitulo-seccion">
                                    Eventos ocurridos
                                </h4>
                                <ul className="admin-lista-eventos">
                                    {detalle.eventos.map((evento, indice) => (
                                        <li key={`${evento.id_evento}-${indice}`}>
                                            <span className="admin-chip">
                                                Pos. {evento.posicion}
                                            </span>
                                            <span>{evento.nombre_evento}</span>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// SECCIÓN: TÍTULOS (locales, internacionales e individuales)
// Consultar, modificar y eliminar. Comparten estructura: config define la tabla.
// ============================================================================

const ETIQUETAS_CAMPO = {
    nombre: "Nombre",
    pais: "País",
    continente: "Continente",
    imagen: "Imagen (URL)",
    puntos_campeon: "Puntos campeón",
    prestigio: "Prestigio",
    liga: "Liga",
    jerarquia: "Jerarquía",
    descripcion: "Descripción"
};

function SeccionTitulos({ config }) {
    const [titulos, setTitulos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editandoId, setEditandoId] = useState(null);
    const [formulario, setFormulario] = useState(null);

    const cargarTitulos = useCallback(() => {
        setCargando(true);
        setError("");
        fetch(`${API_BASE}/admin/titulos/${config.tipo}`, {
            method: "GET",
            credentials: "include"
        })
            .then(leerRespuesta)
            .then((datos) => {
                setTitulos(datos);
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => {
                setCargando(false);
            });
    }, [config.tipo]);

    useEffect(() => {
        const id = setTimeout(() => {
            cargarTitulos();
        }, 0);
        return () => clearTimeout(id);
    }, [cargarTitulos]);

    function iniciarEdicion(titulo) {
        const inicial = {};

        for (const campo of [...config.camposTexto, ...config.camposNumero]) {
            inicial[campo] = titulo[campo] ?? (config.camposNumero.includes(campo) ? 0 : "");
        }

        setFormulario(inicial);
        setEditandoId(titulo[config.columnaId]);
        setError("");
        setMensaje("");
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(null);
    }

    function manejarCambio(campo, valor) {
        setFormulario((estado) => ({ ...estado, [campo]: valor }));
    }

    function guardarEdicion(event) {
        event.preventDefault();
        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/titulos/${config.tipo}/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(formulario)
        })
            .then(leerRespuesta)
            .then(() => {
                setMensaje("Título modificado correctamente.");
                cancelarEdicion();
                cargarTitulos();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    function eliminarTitulo(titulo) {
        const confirmar = window.confirm(
            `¿Eliminar el título "${titulo.nombre}"? Esta acción no se puede deshacer.`
        );

        if (!confirmar) return;

        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/titulos/${config.tipo}/${titulo[config.columnaId]}`, {
            method: "DELETE",
            credentials: "include"
        })
            .then(leerRespuesta)
            .then(() => {
                setMensaje("Título eliminado correctamente.");
                if (editandoId === titulo[config.columnaId]) cancelarEdicion();
                cargarTitulos();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    if (cargando) {
        return <p className="admin-estado">Cargando títulos...</p>;
    }

    if (error && titulos.length === 0) {
        return <p className="admin-error">{error}</p>;
    }

    return (
        <div className="admin-bloque">
            <div className="admin-bloque-encabezado">
                <h2 className="admin-bloque-titulo">{config.titulo}</h2>
                <button
                    type="button"
                    className="admin-boton admin-boton--primario"
                    onClick={cargarTitulos}
                >
                    Recargar
                </button>
            </div>

            <p className="admin-nota">
                Tabla <code>{config.tabla}</code>. Desde el panel solo se pueden
                modificar y eliminar títulos existentes.
            </p>

            {mensaje && <p className="admin-mensaje">{mensaje}</p>}
            {error && <p className="admin-error">{error}</p>}

            {editandoId !== null && formulario && (
                <form className="admin-formulario" onSubmit={guardarEdicion}>
                    <h3 className="admin-formulario-titulo">
                        Editar título #{editandoId}
                    </h3>

                    <div className="admin-formulario-grid">
                        {[...config.camposTexto, ...config.camposNumero].map((campo) => (
                            <div
                                key={campo}
                                className={`admin-campo${campo === "descripcion" || campo === "imagen" ? " admin-campo--completo" : ""}`}
                            >
                                <label htmlFor={`titulo-${campo}`}>
                                    {ETIQUETAS_CAMPO[campo] || campo}
                                </label>

                                {campo === "descripcion" ? (
                                    <textarea
                                        id={`titulo-${campo}`}
                                        className="admin-input admin-textarea"
                                        rows={3}
                                        value={formulario[campo] ?? ""}
                                        onChange={(event) =>
                                            manejarCambio(campo, event.target.value)
                                        }
                                    />
                                ) : (
                                    <input
                                        id={`titulo-${campo}`}
                                        type={config.camposNumero.includes(campo) ? "number" : "text"}
                                        className="admin-input"
                                        value={formulario[campo] ?? ""}
                                        onChange={(event) =>
                                            manejarCambio(
                                                campo,
                                                config.camposNumero.includes(campo)
                                                    ? Number(event.target.value)
                                                    : event.target.value
                                            )
                                        }
                                        required={campo === "nombre" || campo === "continente"}
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="admin-formulario-acciones">
                        <button type="submit" className="admin-boton admin-boton--primario">
                            Guardar cambios
                        </button>
                        <button
                            type="button"
                            className="admin-boton admin-boton--secundario"
                            onClick={cancelarEdicion}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            {config.camposTexto
                                .filter((c) => c !== "nombre")
                                .map((campo) => (
                                    <th key={campo}>{ETIQUETAS_CAMPO[campo] || campo}</th>
                                ))}
                            <th>Puntos</th>
                            <th>Prestigio</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {titulos.length === 0 && (
                            <tr>
                                <td colSpan={6} className="admin-tabla-vacia">
                                    No hay títulos cargados en esta tabla.
                                </td>
                            </tr>
                        )}

                        {titulos.map((titulo) => (
                            <tr key={titulo[config.columnaId]}>
                                <td>{titulo[config.columnaId]}</td>
                                <td>
                                    <strong>{titulo.nombre}</strong>
                                </td>
                                {config.camposTexto
                                    .filter((c) => c !== "nombre")
                                    .map((campo) => (
                                        <td key={campo}>
                                            {campo === "imagen" && titulo.imagen ? (
                                                <a
                                                    href={titulo.imagen}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="admin-enlace"
                                                >
                                                    Ver imagen
                                                </a>
                                            ) : (
                                                titulo[campo] || "—"
                                            )}
                                        </td>
                                    ))}
                                <td>{titulo.puntos_campeon}</td>
                                <td>{titulo.prestigio}</td>
                                <td className="admin-tabla-acciones">
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--secundario admin-boton--pequeno"
                                        onClick={() => iniciarEdicion(titulo)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--peligro admin-boton--pequeno"
                                        onClick={() => eliminarTitulo(titulo)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// SECCIÓN: CLUBES (solo modificar y eliminar)
// ============================================================================

// Ligas disponibles, compartidas entre clubes y la sección de ligas.
function useLigas() {
    const [ligas, setLigas] = useState([]);

    useEffect(() => {
        const id = setTimeout(() => {
            fetch(`${API_BASE}/admin/ligas`, {
                method: "GET",
                credentials: "include"
            })
                .then(leerRespuesta)
                .then((datos) => setLigas(datos.map((fila) => fila.liga)))
                .catch((error) => console.error(error));
        }, 0);

        return () => clearTimeout(id);
    }, []);

    return ligas;
}

function SeccionClubes() {
    const [clubes, setClubes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editandoId, setEditandoId] = useState(null);
    const [formulario, setFormulario] = useState(null);
    const ligas = useLigas();

    const cargarClubes = useCallback(() => {
        setCargando(true);
        setError("");
        fetch(`${API_BASE}/admin/clubes`, {
            method: "GET",
            credentials: "include"
        })
            .then(leerRespuesta)
            .then((datos) => setClubes(datos))
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => setCargando(false));
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            cargarClubes();
        }, 0);
        return () => clearTimeout(id);
    }, [cargarClubes]);

    function iniciarEdicion(club) {
        setFormulario({
            nombre: club.nombre ?? "",
            liga: club.liga ?? "",
            jerarquia: club.jerarquia ?? 0,
            copa_internacional: Boolean(club.copa_internacional),
            descripcion: club.descripcion ?? ""
        });
        setEditandoId(club.id_club);
        setError("");
        setMensaje("");
    }

    function cancelarEdicion() {
        setEditandoId(null);
        setFormulario(null);
    }

    function manejarCambio(campo, valor) {
        setFormulario((estado) => ({ ...estado, [campo]: valor }));
    }

    function guardarEdicion(event) {
        event.preventDefault();
        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/clubes/${editandoId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(formulario)
        })
            .then(leerRespuesta)
            .then(() => {
                setMensaje("Club modificado correctamente.");
                cancelarEdicion();
                cargarClubes();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    function eliminarClub(club) {
        const confirmar = window.confirm(
            `¿Eliminar el club "${club.nombre}"? Esta acción no se puede deshacer.`
        );

        if (!confirmar) return;

        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/clubes/${club.id_club}`, {
            method: "DELETE",
            credentials: "include"
        })
            .then(leerRespuesta)
            .then(() => {
                setMensaje("Club eliminado correctamente.");
                if (editandoId === club.id_club) cancelarEdicion();
                cargarClubes();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    if (cargando) {
        return <p className="admin-estado">Cargando clubes...</p>;
    }

    if (error && clubes.length === 0) {
        return <p className="admin-error">{error}</p>;
    }

    return (
        <div className="admin-bloque">
            <div className="admin-bloque-encabezado">
                <h2 className="admin-bloque-titulo">Clubes</h2>
                <button
                    type="button"
                    className="admin-boton admin-boton--primario"
                    onClick={cargarClubes}
                >
                    Recargar
                </button>
            </div>

            <p className="admin-nota">
                Tabla <code>Club</code>. Desde el panel solo se pueden modificar
                y eliminar clubes existentes.
            </p>

            {mensaje && <p className="admin-mensaje">{mensaje}</p>}
            {error && <p className="admin-error">{error}</p>}

            {editandoId !== null && formulario && (
                <form className="admin-formulario" onSubmit={guardarEdicion}>
                    <h3 className="admin-formulario-titulo">
                        Editar club #{editandoId}
                    </h3>

                    <div className="admin-formulario-grid">
                        <div className="admin-campo">
                            <label htmlFor="club-nombre">Nombre</label>
                            <input
                                id="club-nombre"
                                type="text"
                                className="admin-input"
                                value={formulario.nombre}
                                onChange={(event) => manejarCambio("nombre", event.target.value)}
                                required
                            />
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="club-liga">Liga</label>
                            <input
                                id="club-liga"
                                type="text"
                                className="admin-input"
                                list="lista-ligas"
                                value={formulario.liga}
                                onChange={(event) => manejarCambio("liga", event.target.value)}
                            />
                            <datalist id="lista-ligas">
                                {ligas.map((liga) => (
                                    <option key={liga} value={liga} />
                                ))}
                            </datalist>
                        </div>

                        <div className="admin-campo">
                            <label htmlFor="club-jerarquia">Jerarquía</label>
                            <input
                                id="club-jerarquia"
                                type="number"
                                className="admin-input"
                                value={formulario.jerarquia}
                                onChange={(event) =>
                                    manejarCambio("jerarquia", Number(event.target.value))
                                }
                            />
                        </div>

                        <div className="admin-campo admin-campo--checkbox">
                            <label htmlFor="club-copa">
                                <input
                                    id="club-copa"
                                    type="checkbox"
                                    checked={formulario.copa_internacional}
                                    onChange={(event) =>
                                        manejarCambio("copa_internacional", event.target.checked)
                                    }
                                />
                                Participa de copa internacional
                            </label>
                        </div>

                        <div className="admin-campo admin-campo--completo">
                            <label htmlFor="club-descripcion">Descripción</label>
                            <textarea
                                id="club-descripcion"
                                className="admin-input admin-textarea"
                                rows={3}
                                value={formulario.descripcion}
                                onChange={(event) =>
                                    manejarCambio("descripcion", event.target.value)
                                }
                            />
                        </div>
                    </div>

                    <div className="admin-formulario-acciones">
                        <button type="submit" className="admin-boton admin-boton--primario">
                            Guardar cambios
                        </button>
                        <button
                            type="button"
                            className="admin-boton admin-boton--secundario"
                            onClick={cancelarEdicion}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nombre</th>
                            <th>Liga</th>
                            <th>Jerarquía</th>
                            <th>Copa internacional</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clubes.length === 0 && (
                            <tr>
                                <td colSpan={6} className="admin-tabla-vacia">
                                    No hay clubes cargados.
                                </td>
                            </tr>
                        )}

                        {clubes.map((club) => (
                            <tr key={club.id_club}>
                                <td>{club.id_club}</td>
                                <td>
                                    <strong>{club.nombre}</strong>
                                    {club.descripcion && (
                                        <p className="admin-tabla-descripcion">
                                            {club.descripcion}
                                        </p>
                                    )}
                                </td>
                                <td>{club.liga || "—"}</td>
                                <td>{club.jerarquia}</td>
                                <td>{club.copa_internacional ? "Sí" : "No"}</td>
                                <td className="admin-tabla-acciones">
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--secundario admin-boton--pequeno"
                                        onClick={() => iniciarEdicion(club)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--peligro admin-boton--pequeno"
                                        onClick={() => eliminarClub(club)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// SECCIÓN: LIGAS (agrupación de Club.liga; solo modificar y eliminar)
// ============================================================================

function SeccionLigas() {
    const [ligas, setLigas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [editandoNombre, setEditandoNombre] = useState(null);
    const [nuevoNombre, setNuevoNombre] = useState("");

    const cargarLigas = useCallback(() => {
        setCargando(true);
        setError("");
        fetch(`${API_BASE}/admin/ligas`, {
            method: "GET",
            credentials: "include"
        })
            .then(leerRespuesta)
            .then((datos) => setLigas(datos))
            .catch((error) => {
                console.error(error);
                setError(error.message);
            })
            .finally(() => setCargando(false));
    }, []);

    useEffect(() => {
        const id = setTimeout(() => {
            cargarLigas();
        }, 0);
        return () => clearTimeout(id);
    }, [cargarLigas]);

    function iniciarEdicion(liga) {
        setEditandoNombre(liga.liga);
        setNuevoNombre(liga.liga);
        setError("");
        setMensaje("");
    }

    function cancelarEdicion() {
        setEditandoNombre(null);
        setNuevoNombre("");
    }

    function guardarEdicion(event) {
        event.preventDefault();
        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/ligas/${encodeURIComponent(editandoNombre)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ nuevo_nombre: nuevoNombre })
        })
            .then(leerRespuesta)
            .then((datos) => {
                setMensaje(datos.mensaje || "Liga modificada correctamente.");
                cancelarEdicion();
                cargarLigas();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    function eliminarLiga(liga) {
        const confirmar = window.confirm(
            `¿Eliminar la liga "${liga.liga}"? Los ${liga.cantidad_clubes} club(es) quedarán sin liga.`
        );

        if (!confirmar) return;

        setError("");
        setMensaje("");

        fetch(`${API_BASE}/admin/ligas/${encodeURIComponent(liga.liga)}`, {
            method: "DELETE",
            credentials: "include"
        })
            .then(leerRespuesta)
            .then((datos) => {
                setMensaje(datos.mensaje || "Liga eliminada correctamente.");
                if (editandoNombre === liga.liga) cancelarEdicion();
                cargarLigas();
            })
            .catch((error) => {
                console.error(error);
                setError(error.message);
            });
    }

    if (cargando) {
        return <p className="admin-estado">Cargando ligas...</p>;
    }

    if (error && ligas.length === 0) {
        return <p className="admin-error">{error}</p>;
    }

    return (
        <div className="admin-bloque">
            <div className="admin-bloque-encabezado">
                <h2 className="admin-bloque-titulo">Ligas</h2>
                <button
                    type="button"
                    className="admin-boton admin-boton--primario"
                    onClick={cargarLigas}
                >
                    Recargar
                </button>
            </div>

            <p className="admin-nota">
                Las ligas son la columna <code>Club.liga</code> agrupada. Al
                renombrar o eliminar una liga se actualizan todos los clubes que
                la usan.
            </p>

            {mensaje && <p className="admin-mensaje">{mensaje}</p>}
            {error && <p className="admin-error">{error}</p>}

            {editandoNombre !== null && (
                <form className="admin-formulario" onSubmit={guardarEdicion}>
                    <h3 className="admin-formulario-titulo">
                        Renombrar liga: {editandoNombre}
                    </h3>

                    <div className="admin-formulario-grid">
                        <div className="admin-campo admin-campo--completo">
                            <label htmlFor="liga-nombre">Nuevo nombre</label>
                            <input
                                id="liga-nombre"
                                type="text"
                                className="admin-input"
                                value={nuevoNombre}
                                onChange={(event) => setNuevoNombre(event.target.value)}
                                required
                                maxLength={100}
                            />
                        </div>
                    </div>

                    <div className="admin-formulario-acciones">
                        <button type="submit" className="admin-boton admin-boton--primario">
                            Guardar cambios
                        </button>
                        <button
                            type="button"
                            className="admin-boton admin-boton--secundario"
                            onClick={cancelarEdicion}
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            )}

            <div className="admin-tabla-contenedor">
                <table className="admin-tabla">
                    <thead>
                        <tr>
                            <th>Liga</th>
                            <th>Clubes</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ligas.length === 0 && (
                            <tr>
                                <td colSpan={3} className="admin-tabla-vacia">
                                    No hay ligas registradas.
                                </td>
                            </tr>
                        )}

                        {ligas.map((liga) => (
                            <tr key={liga.liga}>
                                <td>
                                    <strong>{liga.liga}</strong>
                                </td>
                                <td>{liga.cantidad_clubes}</td>
                                <td className="admin-tabla-acciones">
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--secundario admin-boton--pequeno"
                                        onClick={() => iniciarEdicion(liga)}
                                    >
                                        Editar
                                    </button>
                                    <button
                                        type="button"
                                        className="admin-boton admin-boton--peligro admin-boton--pequeno"
                                        onClick={() => eliminarLiga(liga)}
                                    >
                                        Eliminar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ============================================================================
// UTILIDADES
// ============================================================================

// Lee la respuesta de la API y lanza un Error con el mensaje del backend.
function leerRespuesta(respuesta) {
    return respuesta.json().then((datos) => {
        if (!respuesta.ok || (datos && datos.error)) {
            throw new Error((datos && datos.error) || "Error inesperado del servidor");
        }

        return datos;
    });
}

function formatearFecha(valor) {
    if (!valor) return "—";

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return valor;

    return fecha.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}
