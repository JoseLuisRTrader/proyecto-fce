const API = "http://127.0.0.1:8000";

const ESTADOS = {
    "en_tto":       { label: "En tratamiento", color: "#22c55e" },
    "alta":         { label: "Alta",            color: "#3b82f6" },
    "pausa":        { label: "Pausa",           color: "#facc15" },
    "lista_espera": { label: "Lista de espera", color: "#f97316" },
    "derivado":     { label: "Derivado",        color: "#94a3b8" }
}

const usuarioId = window.location.pathname.split('/').pop();
let fichaData = null;

document.addEventListener('DOMContentLoaded', () => {
    inicializarInterfaz();
    cargarFicha();
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

async function cargarFicha() {
    try {
        const res = await fetch(`${API}/usuarios/${usuarioId}/ficha`);
        if (!res.ok) throw new Error("No encontrado");
        fichaData = await res.json();
        renderFicha();
    } catch (error) {
        console.error("Error cargando ficha:", error);
    }
}

function renderFicha() {
    const estado = ESTADOS[fichaData.estado] || ESTADOS['en_tto'];
    const foto = fichaData.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fichaData.nombre)}&background=2563eb&color=fff&size=128`;

    document.getElementById('ficha-foto').src = foto;
    document.getElementById('ficha-nombre').textContent = fichaData.nombre;
    document.getElementById('ficha-edad').textContent = fichaData.edad;
    document.getElementById('ficha-rut').textContent = fichaData.rut;

    const estadoBadge = document.getElementById('ficha-estado-badge');
    estadoBadge.textContent = estado.label;
    estadoBadge.style.background = `${estado.color}20`;
    estadoBadge.style.color = estado.color;

    document.getElementById('ficha-tel1').textContent = fichaData.telefono_1 || '—';
    document.getElementById('ficha-tel2').textContent = fichaData.telefono_2 || '—';
    document.getElementById('ficha-email').textContent = fichaData.email || '—';
    document.getElementById('ficha-tutor').textContent = fichaData.nombre_tutor || '—';
    document.getElementById('ficha-establecimiento').textContent = fichaData.establecimiento_educacional || '—';
    document.getElementById('ficha-tarifa').textContent = fichaData.tarifa_pactada ? `$${fichaData.tarifa_pactada.toLocaleString('es-CL')}` : '—';

    document.getElementById('ficha-total-ciclos').textContent = fichaData.ciclos.length;
    document.getElementById('ficha-total-sesiones').textContent = fichaData.total_sesiones;

    // Diagnósticos
    const divDiag = document.getElementById('ficha-diagnosticos');
    if (fichaData.diagnosticos.length === 0) {
        divDiag.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin diagnósticos registrados</p>`;
    } else {
        divDiag.innerHTML = fichaData.diagnosticos.map(d => `
            <div class="ficha-dato">
                <span>${d.tipo}</span>
                <b>${d.descripcion}</b>
            </div>
        `).join('');
    }

    // Medicamentos
    const divMed = document.getElementById('ficha-medicamentos');
    if (fichaData.medicamentos.length === 0) {
        divMed.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin medicamentos registrados</p>`;
    } else {
        divMed.innerHTML = fichaData.medicamentos.map(m => `
            <div class="ficha-dato">
                <span>${m.dosis || 'Sin dosis'}</span>
                <b>${m.nombre}</b>
            </div>
        `).join('');
    }

    // Ciclos
    const divCiclos = document.getElementById('ficha-ciclos');
    if (fichaData.ciclos.length === 0) {
        divCiclos.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin ciclos registrados</p>`;
    } else {
        divCiclos.innerHTML = fichaData.ciclos.map((c, i) => `
            <div class="ciclo-item">
                <div>
                    <strong>Ciclo ${fichaData.ciclos.length - i}</strong>
                    <span style="color:#64748b; margin-left:8px; font-size:0.8rem;">${c.fecha_inicio}</span>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="color:#64748b;">${c.numero_sesiones} sesiones</span>
                    <span class="estado-badge" style="font-size:0.75rem; background:${c.estado === 'activo' ? '#dcfce7' : '#f1f5f9'}; color:${c.estado === 'activo' ? '#16a34a' : '#64748b'};">
                        ${c.estado}
                    </span>
                </div>
            </div>
        `).join('');
    }
}

function abrirEditarFicha() {
    window.location.href = `/usuarios/${usuarioId}/editar`;
}

function abrirCambiarEstadoFicha(event) {
    event.stopPropagation();
    const existente = document.getElementById('dropdown-estado');
    if (existente) { existente.remove(); return; }

    const dropdown = document.createElement('div');
    dropdown.id = 'dropdown-estado';
    dropdown.className = 'dropdown-estado';

    dropdown.innerHTML = Object.entries(ESTADOS).map(([key, val]) => `
        <div class="estado-opcion ${key === fichaData.estado ? 'activo' : ''}"
             onclick="confirmarCambioEstado('${key}')"
             style="color:${val.color}">
            ${val.label}
        </div>
    `).join('');

    const rect = event.target.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 4}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    document.body.appendChild(dropdown);

    setTimeout(() => {
        document.addEventListener('click', () => {
            const d = document.getElementById('dropdown-estado');
            if (d) d.remove();
        }, { once: true });
    }, 0);
}

async function confirmarCambioEstado(nuevoEstado) {
    await fetch(`${API}/usuarios/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado })
    });
    const d = document.getElementById('dropdown-estado');
    if (d) d.remove();
    await cargarFicha();
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/";
}

// --- MODAL EDITAR FICHA ---

function cambiarTabFicha(tab) {
    document.querySelectorAll('#modal-editar-ficha .tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#modal-editar-ficha .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`ftab-${tab}`).classList.add('active');
    event.target.classList.add('active');
}

function abrirEditarFicha() {
    const modal = document.getElementById('modal-editar-ficha');
    document.getElementById('fedit-nombre').value = fichaData.nombre || '';
    document.getElementById('fedit-rut').value = fichaData.rut || '';
    document.getElementById('fedit-fecha-nacimiento').value = fichaData.fecha_nacimiento || '';
    document.getElementById('fedit-telefono1').value = fichaData.telefono_1 || '';
    document.getElementById('fedit-telefono2').value = fichaData.telefono_2 || '';
    document.getElementById('fedit-email').value = fichaData.email || '';
    document.getElementById('fedit-tutor').value = fichaData.nombre_tutor || '';
    document.getElementById('fedit-establecimiento').value = fichaData.establecimiento_educacional || '';
    document.getElementById('fedit-tarifa').value = fichaData.tarifa_pactada || '';
    fCargarDiagnosticos();
    fCargarMedicamentos();
    modal.style.display = 'flex';
}

function cerrarEditarFicha() {
    document.getElementById('modal-editar-ficha').style.display = 'none';
}

async function guardarDatosFicha() {
    const datos = {
        nombre: document.getElementById('fedit-nombre').value,
        rut: document.getElementById('fedit-rut').value,
        fecha_nacimiento: document.getElementById('fedit-fecha-nacimiento').value,
        telefono_1: document.getElementById('fedit-telefono1').value || null,
        telefono_2: document.getElementById('fedit-telefono2').value || null,
        email: document.getElementById('fedit-email').value || null,
        nombre_tutor: document.getElementById('fedit-tutor').value || null,
        establecimiento_educacional: document.getElementById('fedit-establecimiento').value || null,
        tarifa_pactada: parseInt(document.getElementById('fedit-tarifa').value) || null
    }

    const res = await fetch(`${API}/usuarios/${usuarioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        alert("✅ Datos actualizados correctamente");
        cerrarEditarFicha();
        await cargarFicha();
    } else {
        alert("Error al guardar los datos");
    }
}

// DIAGNÓSTICOS
async function fCargarDiagnosticos() {
    const res = await fetch(`${API}/diagnosticos/usuario/${usuarioId}`);
    const data = await res.json();
    const lista = document.getElementById('flista-diagnosticos');
    if (data.length === 0) {
        lista.innerHTML = "<p style='color:#64748b;'>Sin diagnósticos registrados</p>";
        return;
    }
    lista.innerHTML = data.map(d => `
        <div class="item-lista">
            <div>
                <strong>${d.descripcion}</strong>
                <span class="tag">${d.tipo}</span>
                <span style="color:#94a3b8; font-size:0.8rem; margin-left:8px;">${d.fecha || ''}</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn-eliminar" onclick="fEditarDiagnostico(${d.id}, '${d.descripcion}', '${d.tipo}', '${d.fecha || ''}')">✏️</button>
                <button class="btn-eliminar" onclick="fEliminarDiagnostico(${d.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function fEditarDiagnostico(id, descripcion, tipo, fecha) {
    document.getElementById('fdiag-edit-id').value = id;
    document.getElementById('fdiag-descripcion').value = descripcion;
    document.getElementById('fdiag-tipo').value = tipo;
    document.getElementById('fdiag-fecha').value = fecha;
    document.getElementById('fdiag-form-titulo').textContent = 'Editar Diagnóstico';
    document.getElementById('fdiag-btn-guardar').textContent = '💾 Guardar Cambios';
    document.getElementById('fdiag-btn-cancelar').style.display = 'block';
}

function fCancelarDiagnostico() {
    document.getElementById('fdiag-edit-id').value = '';
    document.getElementById('fdiag-descripcion').value = '';
    document.getElementById('fdiag-tipo').value = '';
    document.getElementById('fdiag-fecha').value = '';
    document.getElementById('fdiag-form-titulo').textContent = 'Agregar Diagnóstico';
    document.getElementById('fdiag-btn-guardar').textContent = '➕ Agregar';
    document.getElementById('fdiag-btn-cancelar').style.display = 'none';
}

async function fGuardarDiagnostico() {
    const descripcion = document.getElementById('fdiag-descripcion').value.trim();
    const tipo = document.getElementById('fdiag-tipo').value.trim();
    const fecha = document.getElementById('fdiag-fecha').value || null;
    const editId = document.getElementById('fdiag-edit-id').value;

    if (!descripcion || !tipo) { alert("⚠️ Descripción y Tipo son obligatorios"); return; }

    const datos = { usuario_id: parseInt(usuarioId), descripcion, tipo, fecha };

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
    fCancelarDiagnostico();
    await fCargarDiagnosticos();
    await cargarFicha();
}

async function fEliminarDiagnostico(id) {
    if (!confirm("¿Eliminar este diagnóstico?")) return;
    await fetch(`${API}/diagnosticos/${id}`, { method: 'DELETE' });
    await fCargarDiagnosticos();
    await cargarFicha();
}

// MEDICAMENTOS
async function fCargarMedicamentos() {
    const res = await fetch(`${API}/medicamentos/usuario/${usuarioId}`);
    const data = await res.json();
    const lista = document.getElementById('flista-medicamentos');
    if (data.length === 0) {
        lista.innerHTML = "<p style='color:#64748b;'>Sin medicamentos registrados</p>";
        return;
    }
    lista.innerHTML = data.map(m => `
        <div class="item-lista">
            <div>
                <strong>${m.nombre}</strong>
                <span class="tag">${m.dosis || 'Sin dosis'}</span>
                <span style="color:#94a3b8; font-size:0.8rem; margin-left:8px;">${m.fecha_inicio || ''} → ${m.fecha_fin || 'Activo'}</span>
            </div>
            <div style="display:flex; gap:6px;">
                <button class="btn-eliminar" onclick="fEditarMedicamento(${m.id}, '${m.nombre}', '${m.dosis || ''}', '${m.fecha_inicio || ''}', '${m.fecha_fin || ''}')">✏️</button>
                <button class="btn-eliminar" onclick="fEliminarMedicamento(${m.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function fEditarMedicamento(id, nombre, dosis, fechaInicio, fechaFin) {
    document.getElementById('fmed-edit-id').value = id;
    document.getElementById('fmed-nombre').value = nombre;
    document.getElementById('fmed-dosis').value = dosis;
    document.getElementById('fmed-fecha-inicio').value = fechaInicio;
    document.getElementById('fmed-fecha-fin').value = fechaFin;
    document.getElementById('fmed-form-titulo').textContent = 'Editar Medicamento';
    document.getElementById('fmed-btn-guardar').textContent = '💾 Guardar Cambios';
    document.getElementById('fmed-btn-cancelar').style.display = 'block';
}

function fCancelarMedicamento() {
    document.getElementById('fmed-edit-id').value = '';
    document.getElementById('fmed-nombre').value = '';
    document.getElementById('fmed-dosis').value = '';
    document.getElementById('fmed-fecha-inicio').value = '';
    document.getElementById('fmed-fecha-fin').value = '';
    document.getElementById('fmed-form-titulo').textContent = 'Agregar Medicamento';
    document.getElementById('fmed-btn-guardar').textContent = '➕ Agregar';
    document.getElementById('fmed-btn-cancelar').style.display = 'none';
}

async function fGuardarMedicamento() {
    const nombre = document.getElementById('fmed-nombre').value.trim();
    const dosis = document.getElementById('fmed-dosis').value.trim();
    const fechaInicio = document.getElementById('fmed-fecha-inicio').value || null;
    const fechaFin = document.getElementById('fmed-fecha-fin').value || null;
    const editId = document.getElementById('fmed-edit-id').value;

    if (!nombre) { alert("⚠️ El nombre del medicamento es obligatorio"); return; }

    const datos = { usuario_id: parseInt(usuarioId), nombre, dosis, fecha_inicio: fechaInicio, fecha_fin: fechaFin };

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
    fCancelarMedicamento();
    await fCargarMedicamentos();
    await cargarFicha();
}

async function fEliminarMedicamento(id) {
    if (!confirm("¿Eliminar este medicamento?")) return;
    await fetch(`${API}/medicamentos/${id}`, { method: 'DELETE' });
    await fCargarMedicamentos();
    await cargarFicha();
}