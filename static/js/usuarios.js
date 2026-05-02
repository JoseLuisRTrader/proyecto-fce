const API = "http://127.0.0.1:8000";
let todosLosUsuarios = [];
let diagnosticosNuevos = [];
let medicamentosNuevos = [];
let vistaActual = 'tabla';
let dropdownAbierto = false;

const ESTADOS = {
    "en_tto":       { label: "En tratamiento", color: "#22c55e" },
    "alta":         { label: "Alta",            color: "#3b82f6" },
    "pausa":        { label: "Pausa",           color: "#facc15" },
    "lista_espera": { label: "Lista de espera", color: "#f97316" },
    "derivado":     { label: "Derivado",        color: "#94a3b8" }
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarInterfaz();
    cargarUsuarios();
});     

function inicializarInterfaz() {
    const nombre = localStorage.getItem('nombre_profesional');
    if (!nombre) { window.location.href = "/"; return; }
    const nombreEl = document.getElementById('nombre-profesional-top');
    const fotoEl = document.getElementById('user-photo-top');
    if (nombreEl) nombreEl.innerText = nombre;
    if (fotoEl) fotoEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=2563eb&color=fff`;
    const fechaEl = document.getElementById('fecha-completa');
    if (fechaEl) {
        const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        fechaEl.innerText = new Date().toLocaleDateString('es-CL', opciones);
    }
}

async function cargarUsuarios() {
    try {
        const res = await fetch(`${API}/usuarios/`);
        todosLosUsuarios = await res.json();
        actualizarStats();
        filtrarUsuarios();
    } catch (error) {
        console.error("Error cargando usuarios:", error);
    }
}

function actualizarStats() {
    document.getElementById('stat-total').textContent = todosLosUsuarios.length;
    document.getElementById('stat-tto').textContent = todosLosUsuarios.filter(u => u.estado === 'en_tto' || !u.estado).length;
    document.getElementById('stat-alta').textContent = todosLosUsuarios.filter(u => u.estado === 'alta').length;
    document.getElementById('stat-pausa').textContent = todosLosUsuarios.filter(u => u.estado === 'pausa').length;
}

function filtrarUsuarios() {
    const buscar = document.getElementById('filtro-buscar').value.toLowerCase();
    const estado = document.getElementById('filtro-estado').value;
    const edad = document.getElementById('filtro-edad').value;

    let filtrados = todosLosUsuarios.filter(u => {
        const matchBuscar = u.nombre.toLowerCase().includes(buscar) || u.rut.toLowerCase().includes(buscar);
        const matchEstado = estado === '' || u.estado === estado || (!u.estado && estado === 'en_tto');
        return matchBuscar && matchEstado;
    });

    if (edad === 'asc') {
        filtrados.sort((a, b) => new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento));
    } else if (edad === 'desc') {
        filtrados.sort((a, b) => new Date(b.fecha_nacimiento) - new Date(a.fecha_nacimiento));
    }

    renderUsuarios(filtrados);
}

function renderUsuarios(usuarios) {
    document.getElementById('total-label').textContent = `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}`;
    if (vistaActual === 'tabla') renderTabla(usuarios);
    else if (vistaActual === 'cards') renderCards(usuarios);
    else renderCompacta(usuarios);
}

function cambiarVista(vista) {
    vistaActual = vista;
    ['tabla', 'cards', 'compacta'].forEach(v => {
        document.getElementById(`vista-${v}`).style.display = v === vista ? (v === 'cards' ? 'grid' : 'block') : 'none';
        document.getElementById(`btn-vista-${v}`).classList.toggle('activo', v === vista);
    });
    filtrarUsuarios();
}

function renderTabla(usuarios) {
    const contenedor = document.getElementById('vista-tabla');
    if (usuarios.length === 0) {
        contenedor.innerHTML = `<p style="text-align:center; padding:30px; color:#64748b;">No hay usuarios que coincidan</p>`;
        return;
    }
    contenedor.innerHTML = `
        <table class="fce-table">
            <thead>
                <tr>
                    <th style="width:50px;"></th>
                    <th>Nombre</th>
                    <th>Edad</th>
                    <th>RUT</th>
                    <th>Tutor</th>
                    <th>Estado</th>
                    <th>Ciclos</th>
                    <th style="text-align:right;">Acciones</th>
                </tr>
            </thead>
            <tbody>
                ${usuarios.map(u => {
                    const estado = ESTADOS[u.estado] || ESTADOS['en_tto'];
                    const foto = u.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=2563eb&color=fff`;
                    return `
                        <tr>
                            <td><img src="${foto}" class="avatar-small" alt="Foto"></td>
                            <td><strong>${u.nombre}</strong></td>
                            <td>${calcularEdad(u.fecha_nacimiento)} años</td>
                            <td style="color:#64748b;">${u.rut}</td>
                            <td>${u.nombre_tutor || '—'}</td>
                            <td>
                                <span class="estado-badge" style="background:${estado.color}20; color:${estado.color};">
                                    ${estado.label}
                                </span>
                            </td>
                            <td style="text-align:center;">0</td>
                            <td style="text-align:right;">
                                <button class="btn-accion-mini" onclick="verUsuario(${u.id})">👁️ Ver</button>
                                <button class="btn-accion-mini" onclick="editarUsuario(${u.id})">✏️ Editar</button>
                                <button class="btn-accion-mini" onclick="abrirCambiarEstado(event, ${u.id})">🔄 Estado</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderCards(usuarios) {
    const contenedor = document.getElementById('vista-cards');
    if (usuarios.length === 0) {
        contenedor.innerHTML = `<p style="color:#64748b; text-align:center; grid-column:1/-1; padding:40px;">No hay usuarios que coincidan</p>`;
        return;
    }
    contenedor.innerHTML = usuarios.map(u => {
        const estado = ESTADOS[u.estado] || ESTADOS['en_tto'];
        const foto = u.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre)}&background=2563eb&color=fff`;        return `
            <div class="usuario-card" onclick="verUsuario(${u.id})">
                <img src="${foto}" class="usuario-card-foto" alt="Foto">
                <span class="usuario-card-nombre">${u.nombre}</span>
                <span class="usuario-card-edad">${calcularEdad(u.fecha_nacimiento)} años</span>
                <span class="usuario-card-estado" style="background:${estado.color}20; color:${estado.color};">
                    ${estado.label}
                </span>
                <span class="usuario-card-tutor">${u.nombre_tutor ? '👤 ' + u.nombre_tutor : 'Sin tutor'}</span>
                <div class="usuario-card-acciones">
                    <button class="btn-accion-mini" onclick="event.stopPropagation(); editarUsuario(${u.id})">✏️</button>
                    <button class="btn-accion-mini" onclick="event.stopPropagation(); abrirCambiarEstado(event, ${u.id})">🔄</button>
                </div>
            </div>
        `;
    }).join('');
}

function renderCompacta(usuarios) {
    const contenedor = document.getElementById('vista-compacta');
    if (usuarios.length === 0) {
        contenedor.innerHTML = `<p style="color:#64748b; text-align:center; padding:20px;">No hay usuarios que coincidan</p>`;
        return;
    }
    contenedor.innerHTML = usuarios.map(u => {
        const estado = ESTADOS[u.estado] || ESTADOS['en_tto'];
        return `
            <div class="compacta-fila" onclick="verUsuario(${u.id})">
                <span class="semaforo-dot" style="background-color:${estado.color};"></span>
                <span class="compacta-nombre">${u.nombre}</span>
                <span class="compacta-edad">${calcularEdad(u.fecha_nacimiento)} años</span>
                <span class="compacta-rut">${u.rut}</span>
                <span class="compacta-tutor">${u.nombre_tutor ? '👤 ' + u.nombre_tutor : ''}</span>
                <span class="estado-badge" style="background:${estado.color}20; color:${estado.color};">
                    ${estado.label}
                </span>
                <div class="acciones-compacta">
                    <button class="btn-accion-mini" onclick="event.stopPropagation(); editarUsuario(${u.id})">✏️</button>
                    <button class="btn-accion-mini" onclick="event.stopPropagation(); abrirCambiarEstado(event, ${u.id})">🔄</button>
                </div>
            </div>
        `;
    }).join('');
}

function verUsuario(id) {
    window.location.href = `/ficha/${id}`;
}

function editarUsuario(id) {
    alert(`Editar usuario ${id} - próximamente`);
}

// DROPDOWN ESTADO
function abrirCambiarEstado(event, id) {
    event.stopPropagation();
    
    // Cerrar si ya hay uno abierto
    const existente = document.getElementById('dropdown-estado');
    if (existente) {
        existente.remove();
        dropdownAbierto = false;
        return;
    }

    const usuario = todosLosUsuarios.find(u => u.id === id);
    if (!usuario) return;

    const estadoActual = usuario.estado || 'en_tto';
    const dropdown = document.createElement('div');
    dropdown.id = 'dropdown-estado';
    dropdown.className = 'dropdown-estado';

    dropdown.innerHTML = Object.entries(ESTADOS).map(([key, val]) => `
        <div class="estado-opcion ${key === estadoActual ? 'activo' : ''}"
             onclick="confirmarCambioEstado(${id}, '${key}')"
             style="color:${val.color}">
            ${val.label}
        </div>
    `).join('');

    // Posicionar donde se hizo click
    const rect = event.target.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(dropdown);
    dropdownAbierto = true;

    setTimeout(() => {
        document.addEventListener('click', cerrarDropdownEstado, { once: true });
    }, 0);
}

function cerrarDropdownEstado() {
    const d = document.getElementById('dropdown-estado');
    if (d) d.remove();
    dropdownAbierto = false;
}

async function confirmarCambioEstado(id, nuevoEstado) {
    await fetch(`${API}/usuarios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
    });
    cerrarDropdownEstado();
    await cargarUsuarios();
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/";
}

// MODAL NUEVO USUARIO
function abrirModalUsuario() {
    document.getElementById('modal-usuario').style.display = 'flex';
}

function cerrarModalUsuario() {
    archivoFotoSeleccionado = null;
    document.getElementById('preview-foto').src = 
        'https://ui-avatars.com/api/?name=Nuevo+Usuario&background=e2e8f0&color=94a3b8&size=128';
    document.getElementById('modal-usuario').style.display = 'none';
    document.getElementById('form-usuario').reset();
    diagnosticosNuevos = [];
    medicamentosNuevos = [];
    document.getElementById('lista-diagnosticos-nuevo').innerHTML = '';
    document.getElementById('lista-medicamentos-nuevo').innerHTML = '';
    document.getElementById('usuario-mensaje-error').textContent = '';
}

function toggleSeccion(id) {
    const seccion = document.getElementById(id);
    seccion.style.display = seccion.style.display === 'none' ? 'block' : 'none';
}

function agregarDiagnosticoNuevo() {
    const descripcion = document.getElementById('nuevo-diag-descripcion').value.trim();
    const tipo = document.getElementById('nuevo-diag-tipo').value.trim();
    const fecha = document.getElementById('nuevo-diag-fecha').value || null;
    if (!descripcion || !tipo) { alert("⚠️ Descripción y Tipo son obligatorios"); return; }
    diagnosticosNuevos.push({ descripcion, tipo, fecha });
    renderListaDiagnosticosNuevos();
    document.getElementById('nuevo-diag-descripcion').value = '';
    document.getElementById('nuevo-diag-tipo').value = '';
    document.getElementById('nuevo-diag-fecha').value = '';
}

function renderListaDiagnosticosNuevos() {
    document.getElementById('lista-diagnosticos-nuevo').innerHTML = diagnosticosNuevos.map((d, i) => `
        <div class="item-lista">
            <div><strong>${d.descripcion}</strong> <span class="tag">${d.tipo}</span></div>
            <button class="btn-eliminar" onclick="eliminarDiagnosticoNuevo(${i})">🗑️</button>
        </div>
    `).join('');
}

function eliminarDiagnosticoNuevo(index) {
    diagnosticosNuevos.splice(index, 1);
    renderListaDiagnosticosNuevos();
}

function agregarMedicamentoNuevo() {
    const nombre = document.getElementById('nuevo-med-nombre').value.trim();
    if (!nombre) { alert("⚠️ El nombre del medicamento es obligatorio"); return; }
    medicamentosNuevos.push({
        nombre,
        dosis: document.getElementById('nuevo-med-dosis').value.trim(),
        fecha_inicio: document.getElementById('nuevo-med-inicio').value || null,
        fecha_fin: document.getElementById('nuevo-med-fin').value || null
    });
    renderListaMedicamentosNuevos();
    document.getElementById('nuevo-med-nombre').value = '';
    document.getElementById('nuevo-med-dosis').value = '';
    document.getElementById('nuevo-med-inicio').value = '';
    document.getElementById('nuevo-med-fin').value = '';
}

function renderListaMedicamentosNuevos() {
    document.getElementById('lista-medicamentos-nuevo').innerHTML = medicamentosNuevos.map((m, i) => `
        <div class="item-lista">
            <div><strong>${m.nombre}</strong> <span class="tag">${m.dosis || 'Sin dosis'}</span></div>
            <button class="btn-eliminar" onclick="eliminarMedicamentoNuevo(${i})">🗑️</button>
        </div>
    `).join('');
}

function eliminarMedicamentoNuevo(index) {
    medicamentosNuevos.splice(index, 1);
    renderListaMedicamentosNuevos();
}

async function guardarUsuario() {
    const rut = document.getElementById('usuario-rut').value.trim();
    const nombre = document.getElementById('usuario-nombre').value.trim();
    const fechaNacimiento = document.getElementById('usuario-fecha-nacimiento').value;
    const error = document.getElementById('usuario-mensaje-error');

    if (!rut || !nombre || !fechaNacimiento) {
        error.textContent = "⚠️ RUT, Nombre y Fecha de Nacimiento son obligatorios";
        return;
    }

    const datos = {
        rut, nombre,
        fecha_nacimiento: fechaNacimiento,
        telefono_1: document.getElementById('usuario-telefono1').value || null,
        telefono_2: document.getElementById('usuario-telefono2').value || null,
        email: document.getElementById('usuario-email').value || null,
        nombre_tutor: document.getElementById('usuario-tutor').value || null,
        establecimiento_educacional: document.getElementById('usuario-establecimiento').value || null,
        tarifa_pactada: parseInt(document.getElementById('usuario-tarifa').value) || null
    }

    try {
        const response = await fetch(`${API}/usuarios/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            const nuevoUsuario = await response.json();
            for (const d of diagnosticosNuevos) {
                await fetch(`${API}/diagnosticos/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...d, usuario_id: nuevoUsuario.id })
                });
            }
            for (const m of medicamentosNuevos) {
                await fetch(`${API}/medicamentos/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...m, usuario_id: nuevoUsuario.id })
                });
            }
            if (archivoFotoSeleccionado) {
                await subirFoto(nuevoUsuario.id);
            }
            archivoFotoSeleccionado = null;
            alert("✅ Usuario registrado correctamente");
            cerrarModalUsuario();
            cargarUsuarios();
        } else {
            const err = await response.json();
            error.textContent = err.detail || "Error al guardar el usuario";
        }
    } catch (e) {
        error.textContent = "Error de conexión";
    }
}

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '—';
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const mes = hoy.getMonth() - nac.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}     

let archivoFotoSeleccionado = null;

function previsualizarFoto(event) {
    const archivo = event.target.files[0];
    if (!archivo) return;
    archivoFotoSeleccionado = archivo;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('preview-foto').src = e.target.result;
    };
    reader.readAsDataURL(archivo);
}

async function subirFoto(usuarioId) {
    if (!archivoFotoSeleccionado) return null;
    const formData = new FormData();
    formData.append('foto', archivoFotoSeleccionado);
    try {
        const res = await fetch(`${API}/usuarios/${usuarioId}/foto`, {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            return data.foto_url;
        }
    } catch (error) {
        console.error("Error subiendo foto:", error);
    }
    return null;
}

let vistaHistorial = 'compacta';

function cambiarVistaHistorial(vista) {
    vistaHistorial = vista;
    document.getElementById('btn-hist-compacta').classList.toggle('activo', vista === 'compacta');
    document.getElementById('btn-hist-completa').classList.toggle('activo', vista === 'completa');
    renderCiclos();
}

function calcularSemaforoCiclo(sesiones) {
    if (!sesiones || sesiones.length === 0) return '#94a3b8';
    const cumplidos = sesiones.filter(s => s.cumplido).length;
    const porcentaje = cumplidos / sesiones.length;
    if (porcentaje >= 0.7) return '#22c55e';
    if (porcentaje >= 0.4) return '#facc15';
    return '#ef4444';
}

function renderCiclos() {
    const divCiclos = document.getElementById('ficha-ciclos');

    if (fichaData.ciclos.length === 0) {
        divCiclos.innerHTML = `
            <div style="text-align:center; padding:30px; color:#94a3b8;">
                <div style="font-size:2rem; margin-bottom:8px;">📋</div>
                <p style="font-size:0.85rem;">Sin ciclos registrados</p>
            </div>
        `;
        return;
    }

    if (vistaHistorial === 'compacta') {
        renderCiclosCompacta(divCiclos);
    } else {
        renderCiclosCompleta(divCiclos);
    }
}

function renderCiclosCompacta(contenedor) {
    contenedor.innerHTML = fichaData.ciclos.map((c, i) => {
        const numCiclo = fichaData.ciclos.length - i;
        const estadoColor = c.estado === 'activo' ? '#22c55e' : '#94a3b8';
        const estadoLabel = c.estado === 'activo' ? '🟢 Activo' : '✅ Cerrado';
        return `
            <div class="ciclo-expandible">
                <div class="ciclo-header" onclick="toggleCiclo(${c.id})">
                    <div class="ciclo-header-izq">
                        <span class="semaforo-dot" id="semaforo-ciclo-${c.id}" style="background:#94a3b8;"></span>
                        <strong>Ciclo ${numCiclo}</strong>
                        <span style="color:#94a3b8; font-size:0.8rem; margin-left:8px;">${c.fecha_inicio}</span>
                    </div>
                    <div class="ciclo-header-der">
                        <span class="estado-badge" style="background:${estadoColor}20; color:${estadoColor}; font-size:0.75rem;">
                            ${estadoLabel}
                        </span>
                        <span style="color:#64748b; font-size:0.82rem;">${c.numero_sesiones} sesiones</span>
                        <span class="ciclo-flecha" id="flecha-ciclo-${c.id}">▶</span>
                    </div>
                </div>
                <div class="ciclo-sesiones" id="sesiones-ciclo-${c.id}" style="display:none;"></div>
            </div>
        `;
    }).join('');
}

async function renderCiclosCompleta(contenedor) {
    contenedor.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Cargando historial completo...</p>`;

    let todasLasSesiones = [];

    for (const ciclo of fichaData.ciclos) {
        const res = await fetch(`${API}/ciclos/${ciclo.id}/sesiones`);
        const sesiones = await res.json();
        sesiones.forEach(s => {
            todasLasSesiones.push({ ...s, ciclo_id: ciclo.id, ciclo_estado: ciclo.estado });
        });
    }

    todasLasSesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (todasLasSesiones.length === 0) {
        contenedor.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Sin sesiones registradas</p>`;
        return;
    }

    contenedor.innerHTML = todasLasSesiones.map(s => `
        <div class="sesion-completa-item" onclick="abrirSesion(${s.id})">
            <div class="sesion-completa-izq">
                <span class="sesion-numero">${s.es_ingreso ? '⭐' : '📝'} Sesión ${s.numero_sesion}</span>
                <span class="sesion-fecha">${s.fecha || '—'}</span>
            </div>
            <div class="sesion-completa-der">
                <p class="sesion-actividades">${s.actividades || 'Sin registro'}</p>
            </div>
            <button class="btn-accion-mini" onclick="event.stopPropagation(); abrirSesion(${s.id})">
                Ver/Editar
            </button>
        </div>
    `).join('');
}

async function toggleCiclo(cicloId) {
    const contenedor = document.getElementById(`sesiones-ciclo-${cicloId}`);
    const flecha = document.getElementById(`flecha-ciclo-${cicloId}`);

    if (contenedor.style.display === 'none') {
        contenedor.style.display = 'block';
        flecha.textContent = '▼';
        contenedor.innerHTML = `<p style="color:#94a3b8; font-size:0.82rem; padding:10px;">Cargando sesiones...</p>`;

        try {
            const res = await fetch(`${API}/ciclos/${cicloId}/sesiones`);
            const sesiones = await res.json();

            const semaforo = document.getElementById(`semaforo-ciclo-${cicloId}`);
            if (semaforo) semaforo.style.backgroundColor = calcularSemaforoCiclo(sesiones);

            if (sesiones.length === 0) {
                contenedor.innerHTML = `<p style="color:#94a3b8; font-size:0.82rem; padding:10px;">Sin sesiones registradas</p>`;
                return;
            }

            contenedor.innerHTML = sesiones.map(s => `
                <div class="sesion-item" onclick="abrirSesion(${s.id})" style="cursor:pointer;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="sesion-numero">${s.es_ingreso ? '⭐' : '📝'} Sesión ${s.numero_sesion}</span>
                            <span class="sesion-fecha" style="margin-left:10px;">${s.fecha || '—'}</span>
                        </div>
                        <button class="btn-accion-mini" onclick="event.stopPropagation(); abrirSesion(${s.id})">Ver/Editar</button>
                    </div>
                    <p class="sesion-actividades">${s.actividades || 'Sin registro'}</p>
                </div>
            `).join('');
        } catch (error) {
            contenedor.innerHTML = `<p style="color:#dc2626; font-size:0.82rem; padding:10px;">Error cargando sesiones</p>`;
        }
    } else {
        contenedor.style.display = 'none';
        flecha.textContent = '▶';
    }
}

function abrirSesion(sesionId) {
    alert(`Ver/Editar sesión ${sesionId} - próximamente`);
}