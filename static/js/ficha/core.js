// ===========================================
// ficha/core.js — Carga inicial, render ficha, estado
// Requiere: utils.js, ficha/state.js cargados antes
// Provee: cargarFicha (usado por refrescarVistaUsuario de utils.js)
// ===========================================

// --- MODAL EDITAR FICHA — usa funciones de utils.js ---
function abrirEditarFicha() {
    // Setear usuarioActivoId para que utils.js use el usuario correcto
    usuarioActivoId = parseInt(usuarioId);
    abrirEditarUsuario();
}

// --- CARGA Y RENDER DE LA FICHA ---
async function cargarFicha() {
    try {
        const res = await fetch(`${API}/usuarios/${usuarioId}/ficha`);
        if (!res.ok) throw new Error("No encontrado");
        fichaData = await res.json();
        await renderFicha();
    } catch (error) {
        console.error("Error cargando ficha:", error);
    }
}

async function renderFicha() {
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

    await renderCiclos();  // definido en ficha/ciclos.js
    verificarPendienteHoy();
}

// --- ALERTA CONTEXTUAL DE PENDIENTES ---
async function verificarPendienteHoy() {
    const contenedor = document.getElementById('ficha-alerta-pendiente');
    if (!contenedor) return;

    try {
        // Consultar detalle-atencion SIN crear ciclo — solo para saber
        // si hay reserva de hoy con sesion_id_activa
        const res = await fetch(`${API}/usuarios/detalle-atencion/${usuarioId}`);
        if (!res.ok) return;
        const data = await res.json();

        // Consultar pendientes del dashboard y filtrar por este usuario
        const resPend = await fetch(`${API}/dashboard/sesiones-pendientes`);
        if (!resPend.ok) return;
        const pendientes = await resPend.json();

        const hoy = new Date().toISOString().split('T')[0];
        const pendientesUsuario = pendientes.filter(p => p.usuario_id === parseInt(usuarioId));
        const pendientesHoy = pendientesUsuario.filter(p => p.fecha === hoy);
        const pendientesAnteriores = pendientesUsuario.filter(p => p.fecha < hoy);

        if (pendientesHoy.length === 0 && pendientesAnteriores.length === 0) {
            contenedor.innerHTML = '';
            return;
        }

        let mensaje = '';
        let color = '';
        if (pendientesHoy.length > 0 && pendientesAnteriores.length > 0) {
            mensaje = `⚠️ <strong>Sesión de hoy pendiente</strong> y ${pendientesAnteriores.length} sesión${pendientesAnteriores.length > 1 ? 'es' : ''} anterior${pendientesAnteriores.length > 1 ? 'es' : ''} sin registrar`;
            color = { bg: '#fef9c3', border: '#fde047', texto: '#854d0e' };
        } else if (pendientesHoy.length > 0) {
            mensaje = `⚠️ <strong>Sesión de hoy pendiente de registro</strong>`;
            color = { bg: '#fef9c3', border: '#fde047', texto: '#854d0e' };
        } else {
            mensaje = `🕐 <strong>${pendientesAnteriores.length} sesión${pendientesAnteriores.length > 1 ? 'es anteriores' : ' anterior'} sin registrar</strong>`;
            color = { bg: '#fff7ed', border: '#fed7aa', texto: '#9a3412' };
        }

        contenedor.innerHTML = `
            <div style="
                background:${color.bg}; border:1px solid ${color.border};
                border-radius:8px; padding:10px 14px;
                display:flex; align-items:center; justify-content:space-between;
                gap:10px; margin-bottom:12px;">
                <span style="font-size:0.85rem; color:${color.texto};">${mensaje}</span>
                <button class="btn-accion-mini"
                        style="background:${color.texto}; color:#fff; border-color:${color.texto}; white-space:nowrap;"
                        onclick="abrirRegistroFicha()">
                    📝 Registrar
                </button>
            </div>
        `;
    } catch (e) {}
}

// --- CAMBIO DE ESTADO DEL USUARIO ---
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
    await refrescarFichaPreservandoUI();
}

// --- ARRANQUE ---
// Único DOMContentLoaded de toda la ficha.
// Si la URL trae ?ingreso=true, abre el modal de ingreso tras cargar la ficha.
document.addEventListener('DOMContentLoaded', async () => {
    inicializarInterfaz();  // definido en utils.js
    await cargarFicha();

    const params = new URLSearchParams(window.location.search);
    if (params.get('ingreso') === 'true') {
        const cicloId = parseInt(params.get('ciclo'));
        const reservaId = parseInt(params.get('reserva')) || null;
        const nuevoCiclo = params.get('nuevo_ciclo') === 'true';

        sessionStorage.setItem('ingreso_pendiente', JSON.stringify({ cicloId, reservaId, nuevoCiclo }));

        // abrirModalIngresoPendiente definido en ficha/ingreso.js
        await abrirModalIngresoPendiente(cicloId, reservaId, nuevoCiclo);
    }
});