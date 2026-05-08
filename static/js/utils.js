// ===========================================
// utils.js — Funciones compartidas FCE
// Cargar ANTES del script específico de cada página
// ===========================================

// --- CONFIGURACIÓN GLOBAL ---
const API = "http://127.0.0.1:8000";

const ESTADOS = {
    "en_tto":       { label: "En tratamiento", color: "#22c55e" },
    "alta":         { label: "Alta",            color: "#3b82f6" },
    "pausa":        { label: "Pausa",           color: "#facc15" },
    "lista_espera": { label: "Lista de espera", color: "#f97316" },
    "derivado":     { label: "Derivado",        color: "#94a3b8" }
};

// Variable global compartida para el usuario activo en modales
let usuarioActivoId = null;

// ===========================================
// INTERFAZ
// ===========================================

// Carga nombre, foto y fecha del profesional en la barra superior
function inicializarInterfaz() {
    const nombre = localStorage.getItem('nombre_profesional');
    if (!nombre) {
        window.location.href = "/";
        return;
    }

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

// Cierra sesión y redirige al login
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/";
}

// Redirige a la ficha completa del usuario
function verFichaUsuario(usuarioId) {
    window.location.href = `/ficha/${usuarioId}`;
}

// Calcula la edad a partir de fecha de nacimiento
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nac = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
}

// Genera URL de avatar con iniciales
function avatarUrl(nombre) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=2563eb&color=fff`;
}

// ===========================================
// SECCIONES COLAPSABLES
// ===========================================

// Toggle de sección colapsable con badge +/-
function toggleSeccion(id, el) {
    const seccion = document.getElementById(id);
    if (!seccion) return;
    const badge = el ? el.querySelector('.seccion-badge') : null;
    if (seccion.style.display === 'none') {
        seccion.style.display = 'block';
        if (badge) badge.textContent = '−';
    } else {
        seccion.style.display = 'none';
        if (badge) badge.textContent = '+';
    }
}

// Toggle de tabs (pestañas)
function cambiarTab(tab, modalId) {
    const modal = modalId ? document.getElementById(modalId) : document;
    if (!modal) return;
    modal.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    modal.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.classList.add('active');
    if (event && event.target) event.target.classList.add('active');
}

// ===========================================
// EDITAR USUARIO — Modal compartido
// ===========================================

// Abre modal de editar usuario con datos precargados
async function abrirEditarUsuario(id) {
    if (id) usuarioActivoId = id;
    const modal = document.getElementById('modal-editar-ficha');
    if (!modal) return;

    try {
        const res = await fetch(`${API}/usuarios/${usuarioActivoId}`);
        const u = await res.json();
        document.getElementById('edit-nombre').value = u.nombre || '';
        document.getElementById('edit-rut').value = u.rut || '';
        document.getElementById('edit-fecha-nacimiento').value = u.fecha_nacimiento || '';
        document.getElementById('edit-telefono1').value = u.telefono_1 || '';
        document.getElementById('edit-telefono2').value = u.telefono_2 || '';
        document.getElementById('edit-email').value = u.email || '';
        document.getElementById('edit-tutor').value = u.nombre_tutor || '';
        document.getElementById('edit-establecimiento').value = u.establecimiento_educacional || '';
        document.getElementById('edit-tarifa').value = u.tarifa_pactada || '';
        await cargarDiagnosticos();
        await cargarMedicamentos();
        modal.style.display = 'flex';
    } catch (error) {
        console.error("Error cargando usuario:", error);
        alert("No se pudo cargar el usuario");
    }
}

function cerrarEditarUsuario() {
    const modal = document.getElementById('modal-editar-ficha');
    if (modal) modal.style.display = 'none';
}

// Guarda cambios de datos personales del usuario
async function guardarDatosUsuario(callbackExito) {
    const datos = {
        nombre: document.getElementById('edit-nombre').value,
        rut: document.getElementById('edit-rut').value,
        fecha_nacimiento: document.getElementById('edit-fecha-nacimiento').value,
        telefono_1: document.getElementById('edit-telefono1').value || null,
        telefono_2: document.getElementById('edit-telefono2').value || null,
        email: document.getElementById('edit-email').value || null,
        nombre_tutor: document.getElementById('edit-tutor').value || null,
        establecimiento_educacional: document.getElementById('edit-establecimiento').value || null,
        tarifa_pactada: parseInt(document.getElementById('edit-tarifa').value) || null
    };

    const res = await fetch(`${API}/usuarios/${usuarioActivoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        alert("✅ Datos actualizados correctamente");
        cerrarEditarUsuario();
        if (typeof callbackExito === 'function') callbackExito();
    } else {
        alert("Error al guardar los datos");
    }
}

// ===========================================
// DIAGNÓSTICOS — Funciones compartidas
// ===========================================

// Carga lista de diagnósticos del usuarioActivoId
async function cargarDiagnosticos() {
    const res = await fetch(`${API}/diagnosticos/usuario/${usuarioActivoId}`);
    const data = await res.json();
    const lista = document.getElementById('lista-diagnosticos');
    if (!lista) return;

    if (data.length === 0) {
        lista.innerHTML = "<p style='color:#64748b; font-size:0.85rem;'>Sin diagnósticos registrados</p>";
        return;
    }
    lista.innerHTML = data.map(d => `
        <div class="item-lista">
            <div>
                <strong>${d.descripcion}</strong>
                <span class="tag">${d.tipo}</span>
                <span style="color:#94a3b8; font-size:0.8rem; margin-left:6px;">${d.fecha || ''}</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn-eliminar" onclick="editarDiagnostico(${d.id}, '${d.descripcion}', '${d.tipo}', '${d.fecha || ''}')">✏️</button>
                <button class="btn-eliminar" onclick="eliminarDiagnostico(${d.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function editarDiagnostico(id, descripcion, tipo, fecha) {
    document.getElementById('diag-edit-id').value = id;
    document.getElementById('diag-descripcion').value = descripcion;
    document.getElementById('diag-tipo').value = tipo;
    document.getElementById('diag-fecha').value = fecha;
    document.getElementById('diag-form-titulo').textContent = 'Editar Diagnóstico';
    document.getElementById('diag-btn-guardar').textContent = '💾 Guardar Cambios';
    document.getElementById('diag-btn-cancelar').style.display = 'block';
}

function cancelarEditarDiagnostico() {
    document.getElementById('diag-edit-id').value = '';
    document.getElementById('diag-descripcion').value = '';
    document.getElementById('diag-tipo').value = '';
    document.getElementById('diag-fecha').value = '';
    document.getElementById('diag-form-titulo').textContent = 'Agregar Diagnóstico';
    document.getElementById('diag-btn-guardar').textContent = '➕ Agregar';
    document.getElementById('diag-btn-cancelar').style.display = 'none';
}

async function guardarDiagnostico() {
    const descripcion = document.getElementById('diag-descripcion').value.trim();
    const tipo = document.getElementById('diag-tipo').value.trim();
    const fecha = document.getElementById('diag-fecha').value || null;
    const editId = document.getElementById('diag-edit-id').value;

    if (!descripcion || !tipo) { alert("⚠️ Descripción y Tipo son obligatorios"); return; }

    const datos = { usuario_id: usuarioActivoId, descripcion, tipo, fecha };

    if (editId) {
        await fetch(`${API}/diagnosticos/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
    } else {
        await fetch(`${API}/diagnosticos/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
    }
    cancelarEditarDiagnostico();
    await cargarDiagnosticos();
}

async function eliminarDiagnostico(id) {
    if (!confirm("¿Eliminar este diagnóstico?")) return;
    await fetch(`${API}/diagnosticos/${id}`, { method: 'DELETE' });
    await cargarDiagnosticos();
}

// ===========================================
// MEDICAMENTOS — Funciones compartidas
// ===========================================

// Carga lista de medicamentos del usuarioActivoId
async function cargarMedicamentos() {
    const res = await fetch(`${API}/medicamentos/usuario/${usuarioActivoId}`);
    const data = await res.json();
    const lista = document.getElementById('lista-medicamentos');
    if (!lista) return;

    if (data.length === 0) {
        lista.innerHTML = "<p style='color:#64748b; font-size:0.85rem;'>Sin medicamentos registrados</p>";
        return;
    }
    lista.innerHTML = data.map(m => `
        <div class="item-lista">
            <div>
                <strong>${m.nombre}</strong>
                <span class="tag">${m.dosis || 'Sin dosis'}</span>
                <span style="color:#94a3b8; font-size:0.8rem; margin-left:6px;">${m.fecha_inicio || ''} ${m.fecha_fin ? '→ ' + m.fecha_fin : ''}</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn-eliminar" onclick="editarMedicamento(${m.id}, '${m.nombre}', '${m.dosis || ''}', '${m.fecha_inicio || ''}', '${m.fecha_fin || ''}')">✏️</button>
                <button class="btn-eliminar" onclick="eliminarMedicamento(${m.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function editarMedicamento(id, nombre, dosis, fechaInicio, fechaFin) {
    document.getElementById('med-edit-id').value = id;
    document.getElementById('med-nombre').value = nombre;
    document.getElementById('med-dosis').value = dosis;
    document.getElementById('med-fecha-inicio').value = fechaInicio;
    document.getElementById('med-fecha-fin').value = fechaFin;
    document.getElementById('med-form-titulo').textContent = 'Editar Medicamento';
    document.getElementById('med-btn-guardar').textContent = '💾 Guardar Cambios';
    document.getElementById('med-btn-cancelar').style.display = 'block';
}

function cancelarEditarMedicamento() {
    document.getElementById('med-edit-id').value = '';
    document.getElementById('med-nombre').value = '';
    document.getElementById('med-dosis').value = '';
    document.getElementById('med-fecha-inicio').value = '';
    document.getElementById('med-fecha-fin').value = '';
    document.getElementById('med-form-titulo').textContent = 'Agregar Medicamento';
    document.getElementById('med-btn-guardar').textContent = '➕ Agregar';
    document.getElementById('med-btn-cancelar').style.display = 'none';
}

async function guardarMedicamento() {
    const nombre = document.getElementById('med-nombre').value.trim();
    const dosis = document.getElementById('med-dosis').value.trim();
    const fechaInicio = document.getElementById('med-fecha-inicio').value || null;
    const fechaFin = document.getElementById('med-fecha-fin').value || null;
    const editId = document.getElementById('med-edit-id').value;

    if (!nombre) { alert("⚠️ El nombre del medicamento es obligatorio"); return; }

    const datos = { usuario_id: usuarioActivoId, nombre, dosis, fecha_inicio: fechaInicio, fecha_fin: fechaFin };

    if (editId) {
        await fetch(`${API}/medicamentos/${editId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
    } else {
        await fetch(`${API}/medicamentos/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
    }
    cancelarEditarMedicamento();
    await cargarMedicamentos();
}

async function eliminarMedicamento(id) {
    if (!confirm("¿Eliminar este medicamento?")) return;
    await fetch(`${API}/medicamentos/${id}`, { method: 'DELETE' });
    await cargarMedicamentos();
}

// ===========================================
// UTILIDADES VARIAS
// ===========================================

// Toggle diagnósticos expandibles en modal de atención
function toggleDiagnosticos(el) {
    const wrapper = el.closest('.diagnosticos-wrapper');
    const lista = wrapper.querySelector('.lista-diag-extra');
    const total = el.dataset.total;
    if (lista.style.display === 'none') {
        lista.style.display = 'flex';
        el.textContent = 'Ver menos';
    } else {
        lista.style.display = 'none';
        el.textContent = `+${total} más`;
    }
}