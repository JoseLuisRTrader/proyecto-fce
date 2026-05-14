// ===========================================
// ficha_usuario.js — Lógica de Ficha Clínica
// Requiere: utils.js cargado antes
// ===========================================

const usuarioId = window.location.pathname.split('/').pop();
let fichaData = null;
let vistaHistorial = 'compacta';


// ==========================================
// MODAL EDITAR FICHA — usa funciones de utils.js
// ==========================================

function abrirEditarFicha() {
    // Setear usuarioActivoId para que utils.js use el usuario correcto
    usuarioActivoId = parseInt(usuarioId);
    abrirEditarUsuario();
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

    renderCiclos();
    // Verificar sesión pendiente del día y mostrar alerta contextual
    verificarPendienteHoy();
}

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

// ==========================================
// HISTORIAL DE CICLOS
// ==========================================

function cambiarVistaHistorial(vista) {
    vistaHistorial = vista;
    document.getElementById('btn-hist-compacta').classList.toggle('activo', vista === 'compacta');
    document.getElementById('btn-hist-completa').classList.toggle('activo', vista === 'completa');
    const btnPapelera = document.getElementById('btn-hist-papelera');
    if (btnPapelera) btnPapelera.classList.toggle('activo', vista === 'papelera');
    renderCiclos();
}

function renderCiclos() {
    const divCiclos = document.getElementById('ficha-ciclos');

    if (fichaData.ciclos.length === 0) {
        divCiclos.innerHTML = `
            <div style="text-align:center; padding:30px; color:#94a3b8;">
                <div style="font-size:2rem; margin-bottom:8px;">📋</div>
                <p style="font-size:0.85rem; margin-bottom:16px;">Sin ciclos registrados</p>
                <button class="btn-accion-mini"
                        style="background:#2563eb; color:#fff; border-color:#2563eb; padding:8px 16px; font-size:0.85rem;"
                        onclick="abrirRegistroFicha()">
                    ✨ Iniciar primer ciclo
                </button>
            </div>
        `;
        return;
    }

    // Si todos los ciclos están cerrados o eliminados, mostrar botón nuevo ciclo
    const cicloActivo = fichaData.ciclos.find(c => c.estado === 'activo');
    if (!cicloActivo) {
        const divNuevoCiclo = document.createElement('div');
        divNuevoCiclo.style.cssText = 'text-align:center; padding:16px; border-top:1px solid #e2e8f0; margin-top:8px;';
        divNuevoCiclo.innerHTML = `
            <button class="btn-accion-mini"
                    style="background:#2563eb; color:#fff; border-color:#2563eb; padding:8px 16px; font-size:0.85rem;"
                    onclick="abrirRegistroFicha()">
                ✨ Iniciar nuevo ciclo
            </button>
        `;
        // Se agrega después de renderizar los ciclos
        setTimeout(() => {
            const ficha = document.getElementById('ficha-ciclos');
            if (ficha) ficha.appendChild(divNuevoCiclo);
        }, 0);
    }

    if (vistaHistorial === 'compacta') {
        renderCiclosCompacta(divCiclos);
    } else if (vistaHistorial === 'papelera') {
        renderCiclosPapelera(divCiclos);
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
                <div class="ciclo-header">
                    <div class="ciclo-header-izq" onclick="toggleCiclo(${c.id})" style="cursor:pointer; flex:1;">
                        <span class="semaforo-dot" id="semaforo-ciclo-${c.id}" style="background:#94a3b8;"></span>
                        <strong>Ciclo ${numCiclo}</strong>
                        <span style="color:#94a3b8; font-size:0.8rem; margin-left:8px;">${c.fecha_inicio}</span>
                    </div>
                    <div class="ciclo-header-der">
                        <span class="estado-badge" style="background:${estadoColor}20; color:${estadoColor}; font-size:0.75rem;">
                            ${estadoLabel}
                        </span>
                        <span style="color:#64748b; font-size:0.82rem;">${c.numero_sesiones} sesiones</span>
                        <button class="btn-accion-mini" style="background:#dbeafe; color:#2563eb; border-color:#bfdbfe;"
                                onclick="registrarSesionCiclo(${c.id})">📝 Registrar</button>
                        ${c.estado === 'activo' ? `
                        <button class="btn-accion-mini" style="background:#fff1f2; color:#e11d48; border-color:#fecdd3;"
                                onclick="registrarInasistenciaCiclo(${c.id}, ${fichaData.id})">❌ Inasistencia</button>` : ''}
                        <button class="btn-accion-mini" id="btn-eliminar-ciclo-${c.id}"
                                style="background:#fff1f2; color:#e11d48; border-color:#fecdd3;"
                                onclick="toggleModoEliminacion(${c.id})">🗑️ Eliminar</button>
                        <span class="ciclo-flecha" id="flecha-ciclo-${c.id}" onclick="toggleCiclo(${c.id})" style="cursor:pointer;">▶</span>
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
        const numCiclo = fichaData.ciclos.length - fichaData.ciclos.indexOf(ciclo);
        sesiones.forEach(s => {
            todasLasSesiones.push({ ...s, numCiclo });
        });
    }

    todasLasSesiones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    if (todasLasSesiones.length === 0) {
        contenedor.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Sin sesiones registradas</p>`;
        return;
    }

    const coloresCiclos = [
        { bg: 'rgba(37,99,235,0.04)',   border: 'rgba(37,99,235,0.4)'   },  // azul
        { bg: 'rgba(34,197,94,0.04)',   border: 'rgba(34,197,94,0.4)'   },  // verde
        { bg: 'rgba(249,115,22,0.04)',  border: 'rgba(249,115,22,0.4)'  },  // naranja
        { bg: 'rgba(168,85,247,0.04)',  border: 'rgba(168,85,247,0.4)'  },  // morado
        { bg: 'rgba(234,179,8,0.04)',   border: 'rgba(234,179,8,0.4)'   },  // amarillo
        { bg: 'rgba(236,72,153,0.04)',  border: 'rgba(236,72,153,0.4)'  },  // rosa
    ];

    contenedor.innerHTML = todasLasSesiones.map(s => {
        const color = coloresCiclos[(s.numCiclo - 1) % coloresCiclos.length];
        const labelRecuperada = s.recuperado
            ? ` <span style="color:#2563eb; font-size:0.72rem; font-weight:600;">↩️ recuperada</span>`
            : '';
        const labelTipo = s.es_inasistencia
            ? '❌ Inasistencia'
            : `${s.es_ingreso ? '⭐' : '📝'} Sesión ${s.numero_sesion}`;

        return `
        <div class="sesion-completa-item"
             style="background:${color.bg}; border-left: 3px solid ${color.border};">
            <div class="sesion-completa-izq" onclick="${s.es_inasistencia ? `abrirModalInasistencia(${s.id})` : `abrirSesion(${s.id})`}" style="cursor:pointer; flex:1;">
                <span class="sesion-numero">${labelTipo}</span>${labelRecuperada}
                <span style="color:#94a3b8; font-size:0.75rem;">Ciclo ${s.numCiclo}</span>
                <span class="sesion-fecha">${s.fecha || '—'}</span>
            </div>
            <div class="sesion-completa-der" style="flex:2;">
                <p class="sesion-actividades">${s.actividades || 'Sin registro'}</p>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0;">
                <button class="btn-accion-mini"
                        onclick="event.stopPropagation(); ${s.es_inasistencia ? `abrirModalInasistencia(${s.id})` : `abrirSesion(${s.id})`}">
                    ${s.es_inasistencia ? 'Ver/Eliminar' : 'Ver/Editar'}
                </button>
                <button class="btn-accion-mini"
                        style="background:#fff1f2; color:#e11d48; border-color:#fecdd3;"
                        onclick="event.stopPropagation(); eliminarSesionDirecta(${s.id})">
                    🗑️
                </button>
            </div>
        </div>
    `}).join('');
}

// ==========================================
// VISTA PAPELERA — sesiones eliminadas (30 días)
// ==========================================

async function renderCiclosPapelera(contenedor) {
    contenedor.innerHTML = `<p style="color:#94a3b8; text-align:center; padding:20px;">Cargando papelera...</p>`;

    let todasEliminadas = [];

    for (const ciclo of fichaData.ciclos) {
        try {
            const res = await fetch(`${API}/ciclos/${ciclo.id}/papelera`);
            if (!res.ok) continue;
            const eliminadas = await res.json();
            const numCiclo = fichaData.ciclos.length - fichaData.ciclos.indexOf(ciclo);
            eliminadas.forEach(s => todasEliminadas.push({ ...s, numCiclo, cicloId: ciclo.id }));
        } catch (err) {
            console.error(`Error cargando papelera ciclo ${ciclo.id}:`, err);
        }
    }

    if (todasEliminadas.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center; padding:30px; color:#94a3b8;">
                <div style="font-size:2rem; margin-bottom:8px;">🗑️</div>
                <p style="font-size:0.85rem;">La papelera está vacía</p>
                <p style="font-size:0.75rem; color:#cbd5e1;">Las sesiones eliminadas permanecen aquí 30 días</p>
            </div>
        `;
        return;
    }

    // Más recientes primero (menos días restantes = más cerca de expirar arriba)
    todasEliminadas.sort((a, b) => (a.dias_restantes ?? 30) - (b.dias_restantes ?? 30));

    contenedor.innerHTML = todasEliminadas.map(s => {
        const dias = s.dias_restantes ?? 0;
        const colorDias = dias <= 7 ? '#e11d48' : (dias <= 15 ? '#f97316' : '#64748b');
        const tipoIcon = s.es_inasistencia ? '❌' : (s.es_ingreso ? '⭐' : '📝');
        const tipoLabel = s.es_inasistencia
            ? 'Inasistencia'
            : (s.es_ingreso ? 'Ingreso' : `Sesión ${s.numero_sesion || '?'}`);

        return `
        <div class="sesion-item" style="background:#fafafa; border-left:3px solid #e2e8f0;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
                <div style="flex:1; min-width:0;">
                    <span class="sesion-numero">${tipoIcon} ${tipoLabel}</span>
                    <span style="color:#94a3b8; font-size:0.75rem; margin-left:8px;">Ciclo ${s.numCiclo}</span>
                    <span class="sesion-fecha" style="margin-left:8px;">${s.fecha || '—'}</span>
                </div>
                <span style="color:${colorDias}; font-size:0.78rem; font-weight:600;">
                    ⏳ ${dias} día${dias === 1 ? '' : 's'}
                </span>
                <button class="btn-accion-mini"
                        style="background:#dbeafe; color:#2563eb; border-color:#bfdbfe;"
                        onclick="restaurarSesionPapelera(${s.id}, ${s.cicloId})">
                    ↩️ Restaurar
                </button>
            </div>
        </div>
        `;
    }).join('');
}

async function restaurarSesionPapelera(sesionId, cicloId) {
    if (!confirm("¿Restaurar esta sesión desde la papelera?")) return;
    const res = await fetch(`${API}/sesiones/${sesionId}/restaurar`, { method: 'POST' });
    if (!res.ok) {
        alert("Error al restaurar la sesión.");
        return;
    }
    await cargarFicha();
    // Mantener al usuario en la vista papelera tras restaurar
    cambiarVistaHistorial('papelera');
}

function calcularSemaforoCiclo(sesiones) {
    if (!sesiones || sesiones.length === 0) return '#94a3b8';
    const conActividades = sesiones.filter(s => s.actividades).length;
    const porcentaje = conActividades / sesiones.length;
    if (porcentaje >= 0.7) return '#22c55e';
    if (porcentaje >= 0.4) return '#facc15';
    return '#ef4444';
}

async function toggleCiclo(cicloId) {
    const contenedor = document.getElementById(`sesiones-ciclo-${cicloId}`);
    const flecha = document.getElementById(`flecha-ciclo-${cicloId}`);

    if (contenedor.style.display === 'none') {
        window._cicloAbierto = cicloId;  //guardar el cilo abierto para recargarlo después de guardar un ingreso
        contenedor.style.display = 'block';
        flecha.textContent = '▼';
        contenedor.innerHTML = `<p style="color:#94a3b8; font-size:0.82rem; padding:10px;">Cargando sesiones...</p>`;

        try {
            const res = await fetch(`${API}/ciclos/${cicloId}/sesiones`);
            const sesiones = await res.json();
            sesiones.reverse();

            const semaforo = document.getElementById(`semaforo-ciclo-${cicloId}`);
            if (semaforo) semaforo.style.backgroundColor = calcularSemaforoCiclo(sesiones);

            if (sesiones.length === 0) {
                contenedor.innerHTML = `<p style="color:#94a3b8; font-size:0.82rem; padding:10px;">Sin sesiones registradas</p>`;
                return;
            }

            contenedor.innerHTML = sesiones.map(s => {
                const esInasistencia = s.es_inasistencia;
                const labelRecuperada = s.recuperado
                    ? ` <span style="color:#2563eb; font-size:0.72rem; font-weight:600;">↩️ recuperada</span>`
                    : '';
                return `
                    <div class="sesion-item ${esInasistencia ? 'sesion-inasistencia' : ''}" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span class="sesion-numero">
                                    ${esInasistencia ? '❌ Inasistencia' : (s.es_ingreso ? '⭐' : '📝') + ' Sesión ' + s.numero_sesion}
                                </span>${labelRecuperada}
                                <span class="sesion-fecha" style="margin-left:10px;">${s.fecha || '—'}</span>
                            </div>
                            <button class="btn-accion-mini" onclick="event.stopPropagation(); ${esInasistencia ? `abrirModalInasistencia(${s.id})` : `abrirSesion(${s.id})`}">
                                ${esInasistencia ? 'Ver/Eliminar' : 'Ver/Editar'}
                            </button>
                        </div>
                        ${!esInasistencia ? `<p class="sesion-actividades">${s.actividades || 'Sin registro'}</p>` : ''}
                    </div>
                `;
            }).join('');
  
        } catch (error) {
            contenedor.innerHTML = `<p style="color:#dc2626; font-size:0.82rem; padding:10px;">Error cargando sesiones</p>`;
        }
    } else {
        window._cicloAbierto = null;
        contenedor.style.display = 'none';
        flecha.textContent = '▶';
    }
}

function abrirSesion(sesionId) {
    alert(`Ver/Editar sesión ${sesionId} - próximamente`);
}

// ==========================================
// CAMBIAR ESTADO
// ==========================================

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

// MODAL SESIÓN
// ==========================================

let sesionActivaId = null;
let sesionData = null;

function cambiarTabSesion(tab) {
    document.querySelectorAll('#modal-sesion .tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#modal-sesion .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`stab-${tab}`).classList.add('active');
    event.target.classList.add('active');
}

async function abrirSesion(sesionId) {
    sesionActivaId = sesionId;

    if (!fichaData) {
        await cargarFicha();
    }

    try {
        const res = await fetch(`${API}/sesiones/${sesionId}/detalle`);
        if (!res.ok) throw new Error("Error cargando sesión");
        sesionData = await res.json();

        const numeroCiclo = fichaData.ciclos.length - fichaData.ciclos.findIndex(c => c.id === sesionData.ciclo_id);
        sesionData.ciclo_numero = numeroCiclo;

        if (sesionData.es_ingreso) {
            await abrirModalIngreso();
        } else {
            abrirModalSesionNormal();
        }

    } catch (error) {
        console.error("Error abriendo sesión:", error);
        alert("No se pudo cargar la sesión");
    }
}

function abrirModalSesionNormal() {
    const tituloHtml = `
        <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span>${sesionData.es_ingreso ? '⭐' : '📝'}</span>
                <span>Sesión ${sesionData.numero_sesion}</span>
                <span class="estado-badge" style="background:#dbeafe; color:#2563eb; font-size:0.75rem;">
                    Ciclo ${sesionData.ciclo_numero}
                </span>
            </div>
            <div style="display:flex; gap:8px;">
                <span class="tag">👤 ${fichaData.nombre}</span>
                <span class="tag">🎂 ${fichaData.edad} años</span>
                <span class="tag">🪪 ${fichaData.rut}</span>
            </div>
        </div>
    `;
    document.getElementById('sesion-modal-titulo').innerHTML = tituloHtml;
    document.getElementById('sesion-fecha').value = sesionData.fecha || '';
    document.getElementById('sesion-actividades').value = sesionData.actividades || '';
    document.getElementById('sesion-materiales').value = sesionData.materiales || '';
    document.getElementById('sesion-compromisos').value = sesionData.compromisos || '';
    renderIndicadoresSesion(sesionData.indicadores);
    document.getElementById('modal-sesion').style.display = 'flex';
}

async function abrirModalIngreso() {
    // Cargar anamnesis existente si hay
    let anamnesis = null;
    try {
        const res = await fetch(`${API}/anamnesis/ciclo/${sesionData.ciclo_id}`);
        if (res.ok) {
            anamnesis = await res.json();
            if (anamnesis) {
                document.getElementById('ing-motivo').value = anamnesis.motivo_consulta || '';
                document.getElementById('ing-antecedentes').value = anamnesis.antecedentes || '';
                document.getElementById('ing-expectativas').value = anamnesis.expectativas_tutor || '';
                document.getElementById('ing-evaluaciones').value = anamnesis.evaluaciones_aplicadas || '';
                document.getElementById('ing-area-motora').value = anamnesis.area_motora || 'Normal';
                document.getElementById('ing-area-cognitiva').value = anamnesis.area_cognitiva || 'Normal';
                document.getElementById('ing-area-sensorial').value = anamnesis.area_sensorial || 'Normal';
                document.getElementById('ing-area-social').value = anamnesis.area_social || 'Normal';
                document.getElementById('ing-fotografia').checked = anamnesis.tiene_fotografia || false;
            }
        }
    } catch (e) {}

    const tituloHtml = `
        <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span>⭐</span>
                <span>Sesión de Ingreso</span>
                <span class="estado-badge" style="background:#fef9c3; color:#854d0e; font-size:0.75rem;">
                    Ciclo ${sesionData.ciclo_numero}
                </span>
            </div>
            <div style="display:flex; gap:8px;">
                <span class="tag">👤 ${fichaData.nombre}</span>
                <span class="tag">🎂 ${fichaData.edad} años</span>
                <span class="tag">🪪 ${fichaData.rut}</span>
            </div>
        </div>
    `;
    document.getElementById('ingreso-modal-titulo').innerHTML = tituloHtml;

    // Poblar anamnesis si existe
    if (anamnesis) {
        document.getElementById('ing-motivo').value = anamnesis.motivo_consulta || '';
        document.getElementById('ing-antecedentes').value = anamnesis.antecedentes || '';
        document.getElementById('ing-expectativas').value = anamnesis.expectativas_tutor || '';
        document.getElementById('ing-evaluaciones').value = anamnesis.evaluaciones_aplicadas || '';
        document.getElementById('ing-area-motora').value = anamnesis.area_motora || 'Normal';
        document.getElementById('ing-area-cognitiva').value = anamnesis.area_cognitiva || 'Normal';
        document.getElementById('ing-area-sensorial').value = anamnesis.area_sensorial || 'Normal';
        document.getElementById('ing-area-social').value = anamnesis.area_social || 'Normal';
        document.getElementById('ing-fotografia').checked = anamnesis.tiene_fotografia || false;
    }

    // Poblar registro sesión
    document.getElementById('ing-fecha').value = sesionData.fecha || '';
    document.getElementById('ing-actividades').value = sesionData.actividades || '';
    document.getElementById('ing-materiales').value = sesionData.materiales || '';
    document.getElementById('ing-compromisos').value = sesionData.compromisos || '';

    // Setear cicloId en el modal
    const modal = document.getElementById('modal-ingreso');
    modal.dataset.cicloId = sesionData.ciclo_id;
    modal.dataset.reservaId = sesionData.reserva_id || '';

    // Cargar objetivos, diagnósticos y medicamentos
    await cargarObjetivosIngreso();
    await cargarDiagnosticosIngreso();
    await cargarMedicamentosIngreso();

    // Abrir todas las secciones
    ['ing-sec-anamnesis','ing-sec-plan','ing-sec-clinico','ing-sec-registro'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'block';
    });
    document.querySelectorAll('#modal-ingreso .seccion-badge').forEach(b => b.textContent = '−');

    modal.style.display = 'flex';
}

function renderIndicadoresSesion(indicadores) {
    const lista = document.getElementById('sesion-indicadores-lista');

    if (!indicadores || indicadores.length === 0) {
        lista.innerHTML = `
            <div style="text-align:center; padding:30px; color:#94a3b8;">
                <p style="font-size:0.9rem;">No hay indicadores definidos para este ciclo.</p>
                <p style="font-size:0.82rem; margin-top:8px;">Agrega objetivos e indicadores desde la sección de ciclos.</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = indicadores.map(ind => `
        <div class="indicador-eval-item" id="ind-item-${ind.id}">
            <div class="indicador-eval-header">
                <span class="indicador-eval-desc">${ind.descripcion}</span>
                <div class="indicador-eval-btns">
                    <button class="btn-ind ${ind.cumplido === true ? 'activo-verde' : ''}" 
                            onclick="setIndicador(${ind.id}, true)">✅ Cumplido</button>
                    <button class="btn-ind ${ind.cumplido === false ? 'activo-rojo' : ''}"
                            onclick="setIndicador(${ind.id}, false)">⭕ No cumplido</button>
                </div>
            </div>
            <div class="form-group" style="margin-top:8px;">
                <input type="text" id="obs-${ind.id}" 
                       value="${ind.observacion || ''}"
                       placeholder="Observación (opcional)"
                       style="width:100%; padding:8px 12px; border:1px solid #d1d5db; border-radius:8px; font-size:0.85rem;">
            </div>
        </div>
    `).join('');
}

function setIndicador(indicadorId, cumplido) {
    const ind = sesionData.indicadores.find(i => i.id === indicadorId);
    if (ind) ind.cumplido = cumplido;

    const item = document.getElementById(`ind-item-${indicadorId}`);
    item.querySelectorAll('.btn-ind').forEach(b => {
        b.classList.remove('activo-verde', 'activo-rojo');
    });
    const btns = item.querySelectorAll('.btn-ind');
    btns[0].classList.toggle('activo-verde', cumplido === true);
    btns[1].classList.toggle('activo-rojo', cumplido === false);
}

async function guardarSesion() {
    const datos = {
        fecha: document.getElementById('sesion-fecha').value || null,
        actividades: document.getElementById('sesion-actividades').value || null,
        materiales: document.getElementById('sesion-materiales').value || null,
        compromisos: document.getElementById('sesion-compromisos').value || null
    };

    // Crear sesión normal si aún no existe (flujo "Registrar" desde ficha del ciclo activo)
    // Usa POST /sesiones/crear-normal (sesiones 2..N de un ciclo que ya tiene su ingreso)
    if (!sesionActivaId) {
        const cicloId = sesionData?.ciclo_id;
        if (!cicloId) {
            alert("Error: no se pudo determinar el ciclo de la sesión.");
            return;
        }
        const resCrear = await fetch(`${API}/sesiones/crear-normal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciclo_id: cicloId, reserva_id: null })
        });
        if (!resCrear.ok) {
            alert("Error al crear la sesión.");
            return;
        }
        const creada = await resCrear.json();
        sesionActivaId = creada.id;
    }

    const res = await fetch(`${API}/sesiones/${sesionActivaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        alert("✅ Registro guardado correctamente");
        cerrarModalSesion();
        await cargarFicha();
    } else {
        alert("Error al guardar el registro");
    }
}

async function guardarEvaluaciones() {
    const evaluaciones = sesionData.indicadores.map(ind => ({
        indicador_id: ind.id,
        evaluacion_id: ind.evaluacion_id,
        cumplido: ind.cumplido,
        observacion: document.getElementById(`obs-${ind.id}`)?.value || null
    }));

    const res = await fetch(`${API}/indicadores/evaluaciones/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sesion_id: sesionActivaId,
            evaluaciones
        })
    });

    if (res.ok) {
        alert("✅ Evaluaciones guardadas correctamente");
        cerrarModalSesion();
        await cargarFicha();
    } else {
        alert("Error al guardar evaluaciones");
    }
}

function cerrarModalSesion() {
    document.getElementById('modal-sesion').style.display = 'none';
    sesionActivaId = null;
    sesionData = null;
}

// ==========================================
// MODAL INGRESO
// ==========================================

function cambiarTabIngreso(tab) {
    document.querySelectorAll('#modal-ingreso .tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('#modal-ingreso .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`itab-${tab}`).classList.add('active');
    event.target.classList.add('active');
}

function cerrarModalIngreso() {
    document.getElementById('modal-ingreso').style.display = 'none';
    sessionStorage.removeItem('ingreso_pendiente');
    sesionActivaId = null;
    sesionData = null;

    // Volver al origen: registro o dashboard
    if (window.location.search.includes('ingreso=true')) {
        const referrer = document.referrer;
        if (referrer.includes('/registro')) {
            window.location.href = '/registro';
        } else {
            window.location.href = '/registro';
        }
    }
}

async function guardarAnamnesis() {
    const datos = {
        ciclo_id: sesionData.ciclo_id,
        motivo_consulta: document.getElementById('ing-motivo').value || null,
        antecedentes: document.getElementById('ing-antecedentes').value || null,
        expectativas_tutor: document.getElementById('ing-expectativas').value || null,
        evaluaciones_aplicadas: document.getElementById('ing-evaluaciones').value || null,
        area_motora: document.getElementById('ing-area-motora').value,
        area_cognitiva: document.getElementById('ing-area-cognitiva').value,
        area_sensorial: document.getElementById('ing-area-sensorial').value,
        area_social: document.getElementById('ing-area-social').value,
        tiene_fotografia: document.getElementById('ing-fotografia').checked
    };

    const res = await fetch(`${API}/anamnesis/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        alert("✅ Anamnesis guardada correctamente");
    } else {
        alert("Error al guardar anamnesis");
    }
}

async function guardarRegistroIngreso() {
    const datos = {
        fecha: document.getElementById('ing-fecha').value || null,
        actividades: document.getElementById('ing-actividades').value || null,
        materiales: document.getElementById('ing-materiales').value || null,
        compromisos: document.getElementById('ing-compromisos').value || null
    };

    const res = await fetch(`${API}/sesiones/${sesionActivaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        alert("✅ Registro guardado correctamente");
        cerrarModalIngreso();
    } else {
        alert("Error al guardar registro");
    }
}

// OBJETIVOS EN INGRESO
async function cargarObjetivosIngreso() {
    const cicloId = sesionData?.ciclo_id || parseInt(document.getElementById('modal-ingreso').dataset.cicloId);
    if (!cicloId) return;
    const res = await fetch(`${API}/objetivos/ciclo/${cicloId}`);
    const objetivos = await res.json();
    const lista = document.getElementById('ing-lista-objetivos');
    if (!lista) return;

    // Cargar objetivo general si existe
    const objGeneral = objetivos.find(o => o.es_general);
    const campoGeneral = document.getElementById('ing-obj-general');
    if (campoGeneral && objGeneral) {
        campoGeneral.value = objGeneral.descripcion;
    }

    // Solo mostrar objetivos específicos en la lista
    const especificos = objetivos.filter(o => !o.es_general);

    if (especificos.length === 0) {
        lista.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin objetivos específicos definidos</p>`;
        return;
    }

    lista.innerHTML = await Promise.all(especificos.map(async obj => {
        const resInd = await fetch(`${API}/indicadores/objetivo/${obj.id}`);
        const indicadores = await resInd.json();
        return `
            <div class="ciclo-expandible" style="margin-bottom:8px;">
                <div style="padding:10px 14px; background:#f8fafc; border-radius:8px; border:1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="tag" style="margin-right:8px;">${obj.tipo}</span>
                            <strong style="font-size:0.9rem;">${obj.descripcion}</strong>
                        </div>
                        <button class="btn-eliminar" onclick="eliminarObjetivoIngreso(${obj.id})">🗑️</button>
                    </div>
                    <div style="margin-top:8px; padding-left:12px;">
                        ${indicadores.map(ind => `
                            <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid #f1f5f9;">
                                <span style="font-size:0.82rem; color:#374151;">→ ${ind.descripcion}</span>
                                <button class="btn-eliminar" onclick="eliminarIndicadorIngreso(${ind.id})">🗑️</button>
                            </div>
                        `).join('')}
                        <button class="btn-secondary" style="margin-top:8px; font-size:0.8rem; padding:4px 10px;"
                                onclick="agregarIndicadorIngreso(${obj.id})">➕ Indicador</button>
                    </div>
                </div>
            </div>
        `;
    })).then(htmls => htmls.join(''));
}

// Guarda objetivo general del ciclo (se llama desde guardarIngresoCompleto)
async function guardarObjetivoGeneral(cicloId) {
    const descripcion = document.getElementById('ing-obj-general')?.value?.trim();
    if (!descripcion) return;

    // Buscar si ya existe objetivo general
    const res = await fetch(`${API}/objetivos/ciclo/${cicloId}`);
    const objetivos = await res.json();
    const existente = objetivos.find(o => o.es_general);

    if (existente) {
        // Actualizar
        await fetch(`${API}/objetivos/${existente.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ descripcion, es_general: true })
        });
    } else {
        // Crear nuevo
        await fetch(`${API}/objetivos/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciclo_id: cicloId, descripcion, es_general: true, tipo: 'general' })  
        });
    }
}

// Guarda objetivo específico
async function guardarObjetivoIngreso() {
    const tipo = document.getElementById('ing-obj-tipo').value.trim();
    const descripcion = document.getElementById('ing-obj-descripcion').value.trim();
    if (!tipo || !descripcion) { alert("⚠️ Área y descripción son obligatorios"); return; }
    
    const cicloId = sesionData?.ciclo_id || parseInt(document.getElementById('modal-ingreso').dataset.cicloId);
    if (!cicloId) { alert("Error: no se encontró el ciclo"); return; }

    const res = await fetch(`${API}/objetivos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: cicloId, tipo, descripcion, es_general: false })
    });

    if (res.ok) {
        document.getElementById('ing-obj-tipo').value = '';
        document.getElementById('ing-obj-descripcion').value = '';
        await cargarObjetivosIngreso();
    }
}

async function eliminarObjetivoIngreso(id) {
    if (!confirm("¿Eliminar este objetivo?")) return;
    await fetch(`${API}/objetivos/${id}`, { method: 'DELETE' });
    await cargarObjetivosIngreso();
}

async function agregarIndicadorIngreso(objetivoId) {
    const descripcion = prompt("Descripción del indicador:");
    if (!descripcion) return;
    await fetch(`${API}/indicadores/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objetivo_id: objetivoId, descripcion })
    });
    await cargarObjetivosIngreso();
}

async function eliminarIndicadorIngreso(id) {
    if (!confirm("¿Eliminar este indicador?")) return;
    await fetch(`${API}/indicadores/${id}`, { method: 'DELETE' });
    await cargarObjetivosIngreso();
}

// DIAGNÓSTICOS EN INGRESO
async function cargarDiagnosticosIngreso() {
    const res = await fetch(`${API}/diagnosticos/usuario/${fichaData.id}`);
    const data = await res.json();
    const lista = document.getElementById('ing-lista-diagnosticos');
    if (data.length === 0) {
        lista.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin diagnósticos</p>`;
        return;
    }
    lista.innerHTML = data.map(d => `
        <div class="item-lista">
            <div><strong>${d.descripcion}</strong> <span class="tag">${d.tipo}</span></div>
        </div>
    `).join('');
}

async function guardarDiagnosticoIngreso() {
    const descripcion = document.getElementById('ing-diag-desc').value.trim();
    const tipo = document.getElementById('ing-diag-tipo').value.trim();
    if (!descripcion || !tipo) { alert("⚠️ Descripción y tipo son obligatorios"); return; }

    await fetch(`${API}/diagnosticos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_id: fichaData.id, descripcion, tipo, fecha: null })
    });
    document.getElementById('ing-diag-desc').value = '';
    document.getElementById('ing-diag-tipo').value = '';
    await cargarDiagnosticosIngreso();
}

// MEDICAMENTOS EN INGRESO
async function cargarMedicamentosIngreso() {
    const res = await fetch(`${API}/medicamentos/usuario/${fichaData.id}`);
    const data = await res.json();
    const lista = document.getElementById('ing-lista-medicamentos');
    if (data.length === 0) {
        lista.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin medicamentos</p>`;
        return;
    }
    lista.innerHTML = data.map(m => `
        <div class="item-lista">
            <div><strong>${m.nombre}</strong> <span class="tag">${m.dosis || 'Sin dosis'}</span></div>
        </div>
    `).join('');
}

async function guardarMedicamentoIngreso() {
    const nombre = document.getElementById('ing-med-nombre').value.trim();
    if (!nombre) { alert("⚠️ El nombre es obligatorio"); return; }

    await fetch(`${API}/medicamentos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            usuario_id: fichaData.id,
            nombre,
            dosis: document.getElementById('ing-med-dosis').value || null,
            fecha_inicio: null,
            fecha_fin: null
        })
    });
    document.getElementById('ing-med-nombre').value = '';
    document.getElementById('ing-med-dosis').value = '';
    await cargarMedicamentosIngreso();
}

document.addEventListener('DOMContentLoaded', async () => {
    inicializarInterfaz();
    await cargarFicha();

    const params = new URLSearchParams(window.location.search);
    if (params.get('ingreso') === 'true') {
        const cicloId = parseInt(params.get('ciclo'));
        const reservaId = parseInt(params.get('reserva')) || null;
        const nuevoCiclo = params.get('nuevo_ciclo') === 'true';
        
        // Guardar datos para crear sesión solo cuando se guarde
        sessionStorage.setItem('ingreso_pendiente', JSON.stringify({ cicloId, reservaId, nuevoCiclo }));
        
        // Abrir modal de ingreso sin crear sesión aún
        await abrirModalIngresoPendiente(cicloId, reservaId, nuevoCiclo);
    }
});
async function abrirModalIngresoPendiente(cicloId, reservaId, nuevoCiclo = false) {
    // Si es inicio de nuevo ciclo, precargar anamnesis del ciclo anterior
    if (nuevoCiclo && fichaData?.ciclos?.length > 1) {
        const cicloAnterior = fichaData.ciclos[1];
        try {
            const res = await fetch(`${API}/anamnesis/ciclo/${cicloAnterior.id}`);
            if (res.ok) {
                const anamnesis = await res.json();
                if(anamnesis) {
                    document.getElementById('ing-motivo').value = anamnesis.motivo_consulta || '';
                    document.getElementById('ing-antecedentes').value = anamnesis.antecedentes || '';
                    document.getElementById('ing-expectativas').value = anamnesis.expectativas_tutor || '';
                    document.getElementById('ing-evaluaciones').value = anamnesis.evaluaciones_aplicadas || '';
                    document.getElementById('ing-area-motora').value = anamnesis.area_motora || 'Normal';
                    document.getElementById('ing-area-cognitiva').value = anamnesis.area_cognitiva || 'Normal';
                    document.getElementById('ing-area-sensorial').value = anamnesis.area_sensorial || 'Normal';
                    document.getElementById('ing-area-social').value = anamnesis.area_social || 'Normal';
                    document.getElementById('ing-fotografia').checked = anamnesis.tiene_fotografia || false;
                }
                
            }
        } catch (e) {}
    }
    const tituloHtml = `
        <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span>⭐</span>
                <span>Sesión de Ingreso</span>
                <span class="estado-badge" style="background:#fef9c3; color:#854d0e; font-size:0.75rem;">
                    Ciclo ${sesionData?.ciclo_numero || (fichaData?.ciclos?.length || 1)}
                </span>
            </div>
            <div style="display:flex; gap:8px;">
                <span class="tag">👤 ${fichaData?.nombre || ''}</span>
                <span class="tag">🎂 ${fichaData?.edad || ''} años</span>
                <span class="tag">🪪 ${fichaData?.rut || ''}</span>
            </div>
        </div>
    `;
    document.getElementById('ingreso-modal-titulo').innerHTML = tituloHtml;

    // Limpiar campos
    document.getElementById('ing-motivo').value = '';
    document.getElementById('ing-antecedentes').value = '';
    document.getElementById('ing-expectativas').value = '';
    document.getElementById('ing-evaluaciones').value = '';
    document.getElementById('ing-area-motora').value = 'Normal';
    document.getElementById('ing-area-cognitiva').value = 'Normal';
    document.getElementById('ing-area-sensorial').value = 'Normal';
    document.getElementById('ing-area-social').value = 'Normal';
    document.getElementById('ing-fotografia').checked = false;
    document.getElementById('ing-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('ing-actividades').value = '';
    document.getElementById('ing-materiales').value = '';
    document.getElementById('ing-compromisos').value = '';

    await cargarObjetivosIngreso();
    await cargarDiagnosticosIngreso();
    await cargarMedicamentosIngreso();

    document.getElementById('modal-ingreso').style.display = 'flex';
    
    // Guardar reservaId para usar al guardar
    document.getElementById('modal-ingreso').dataset.cicloId = cicloId;
    document.getElementById('modal-ingreso').dataset.reservaId = reservaId;
    await cargarObjetivosIngreso();
}

async function guardarRegistroIngreso() {
    const modal = document.getElementById('modal-ingreso');
    const cicloId = parseInt(modal.dataset.cicloId);
    const reservaId = parseInt(modal.dataset.reservaId) || null;

    // Crear sesión solo ahora que el profesional guarda
    if (!sesionActivaId) {
        const resCrear = await fetch(`${API}/sesiones/crear-ingreso`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ciclo_id: cicloId, reserva_id: reservaId })
        });
        const creada = await resCrear.json();
        sesionActivaId = creada.id;
    }

    const datos = {
        fecha: document.getElementById('ing-fecha').value || null,
        actividades: document.getElementById('ing-actividades').value || null,
        materiales: document.getElementById('ing-materiales').value || null,
        compromisos: document.getElementById('ing-compromisos').value || null
    };

    const res = await fetch(`${API}/sesiones/${sesionActivaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    });

    if (res.ok) {
        sessionStorage.removeItem('ingreso_pendiente');
        alert("✅ Registro guardado correctamente");
        cerrarModalIngreso();
        await cargarFicha();
    } else {
        alert("Error al guardar registro");
    }
}

let sesionInasistenciaId = null;

function abrirModalInasistencia(sesionId) {
    sesionInasistenciaId = sesionId;
    document.getElementById('modal-inasistencia').style.display = 'flex';
}

function cerrarModalInasistencia() {
    document.getElementById('modal-inasistencia').style.display = 'none';
    sesionInasistenciaId = null;
}

// Registra inasistencia desde la ficha del usuario (Opción C):
// - Si hay reserva confirmada del usuario para hoy → la vincula y marca como nsp
// - Si no hay reserva → crea inasistencia libre sin reserva_id
async function registrarInasistenciaCiclo(cicloId, usuarioId) {
    if (!confirm("¿Registrar inasistencia para hoy?")) return;

    const res = await fetch(`${API}/sesiones/crear-inasistencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: cicloId, usuario_id: usuarioId })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "Error al registrar inasistencia");
        return;
    }

    alert("✅ Inasistencia registrada");
    await cargarFicha();
}

async function eliminarInasistencia() {
    if (!confirm("¿Eliminar este registro de inasistencia?")) return;
    
    const res = await fetch(`${API}/sesiones/${sesionInasistenciaId}`, {
        method: 'DELETE'
    });
    
    if (res.ok) {
        alert("✅ Inasistencia eliminada");
        cerrarModalInasistencia();
        await cargarFicha();
    } else {
        alert("Error al eliminar");
    }
}

// Elimina directamente una sesión desde la vista completa (soft delete → papelera 30 días)
async function eliminarSesionDirecta(sesionId) {
    if (!confirm("¿Mover esta sesión a la papelera? Podrás recuperarla dentro de 30 días.")) return;
    const res = await fetch(`${API}/sesiones/${sesionId}`, { method: 'DELETE' });
    if (res.ok) {
        await cargarFicha();
        cambiarVistaHistorial('completa');
    } else {
        alert("Error al eliminar la sesión");
    }
}

async function convertirEnSesion() {
    const sesionId = sesionInasistenciaId; // guardar antes de cerrar modal
    
    const res = await fetch(`${API}/sesiones/${sesionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            es_inasistencia: false,
            actividades: null
        })
    });
    
    if (res.ok) {
        cerrarModalInasistencia();
        await abrirSesion(sesionId);
    } else {
        alert("Error al convertir sesión");
    }
}
// ===========================================
// GUARDAR INGRESO COMPLETO
// Guarda anamnesis, objetivo general, sesión en un solo paso
// ===========================================
async function guardarIngresoCompleto() {
    const modal = document.getElementById('modal-ingreso');
    const cicloId = parseInt(modal.dataset.cicloId);
    const reservaId = parseInt(modal.dataset.reservaId) || null;

    if (!cicloId) {
        alert("Error: no se encontró el ciclo");
        return;
    }

    try {
        // 1. Guardar anamnesis
        await fetch(`${API}/anamnesis/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ciclo_id: cicloId,
                motivo_consulta: document.getElementById('ing-motivo').value || null,
                antecedentes: document.getElementById('ing-antecedentes').value || null,
                expectativas_tutor: document.getElementById('ing-expectativas').value || null,
                evaluaciones_aplicadas: document.getElementById('ing-evaluaciones').value || null,
                area_motora: document.getElementById('ing-area-motora').value,
                area_cognitiva: document.getElementById('ing-area-cognitiva').value,
                area_sensorial: document.getElementById('ing-area-sensorial').value,
                area_social: document.getElementById('ing-area-social').value,
                tiene_fotografia: document.getElementById('ing-fotografia').checked
            })
        });

        // 2. Guardar objetivo general
        await guardarObjetivoGeneral(cicloId);

        // 3. Crear sesión si no existe
        if (!sesionActivaId) {
            const resCrear = await fetch(`${API}/sesiones/crear-ingreso`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ciclo_id: cicloId, reserva_id: reservaId })
            });
            const creada = await resCrear.json();
            sesionActivaId = creada.id;
        }

        // 4. Guardar registro de sesión
        await fetch(`${API}/sesiones/${sesionActivaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha: document.getElementById('ing-fecha').value || null,
                actividades: document.getElementById('ing-actividades').value || null,
                materiales: document.getElementById('ing-materiales').value || null,
                compromisos: document.getElementById('ing-compromisos').value || null
            })
        });

        sessionStorage.removeItem('ingreso_pendiente');
        alert("✅ Ingreso guardado correctamente");
        cerrarModalIngreso();
        await cargarFicha();
        // Si el ciclo estaba abierto en el historial, reabrirlo
        if (window._cicloAbierto) {
            await toggleCiclo(window._cicloAbierto);
        }

    } catch (error) {
        console.error("Error guardando ingreso:", error);
        alert("Error al guardar el ingreso");
    }
}

// --- BOTÓN REGISTRAR EN FICHA ---
// Detecta el tipo de sesión y abre el modal correspondiente
async function abrirRegistroFicha() {
    try {
        const res = await fetch(`${API}/usuarios/detalle-atencion/${usuarioId}?crear_ciclo=true`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (data.es_primera_sesion) {
            // Caso 1 o 2: modal de ingreso
            const cicloId = data.ciclo_activo_id;
            
            // Buscar reserva de hoy si existe
            let reservaId = data.sesion_id_activa || null;

            sesionActivaId = null;
            sesionData = {
                ciclo_id: cicloId,
                ciclo_numero: fichaData.ciclos.length || 1,
                es_ingreso: true,
                actividades: null,
                fecha: null,
                materiales: null,
                compromisos: null,
                indicadores: []
            };

            const modal = document.getElementById('modal-ingreso');
            modal.dataset.cicloId = cicloId;
            modal.dataset.reservaId = reservaId || '';

            // Título del modal
            document.getElementById('ingreso-modal-titulo').innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>⭐</span>
                        <span>Sesión de Ingreso</span>
                        <span class="estado-badge" style="background:#fef9c3; color:#854d0e; font-size:0.75rem;">
                            Ciclo ${fichaData.ciclos.length || 1}
                        </span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <span class="tag">👤 ${fichaData.nombre}</span>
                        <span class="tag">🎂 ${fichaData.edad} años</span>
                        <span class="tag">🪪 ${fichaData.rut}</span>
                    </div>
                </div>
            `;

            document.getElementById('ing-fecha').value = new Date().toISOString().split('T')[0];
            await cargarObjetivosIngreso();
            await cargarDiagnosticosIngreso();
            await cargarMedicamentosIngreso();

            // Cargar anamnesis si existe
            try {
                const resAnam = await fetch(`${API}/anamnesis/ciclo/${cicloId}`);
                if (resAnam.ok) {
                    const anamnesis = await resAnam.json();
                    if (anamnesis) {
                        document.getElementById('ing-motivo').value = anamnesis.motivo_consulta || '';
                        document.getElementById('ing-antecedentes').value = anamnesis.antecedentes || '';
                        document.getElementById('ing-expectativas').value = anamnesis.expectativas_tutor || '';
                        document.getElementById('ing-evaluaciones').value = anamnesis.evaluaciones_aplicadas || '';
                        document.getElementById('ing-area-motora').value = anamnesis.area_motora || 'Normal';
                        document.getElementById('ing-area-cognitiva').value = anamnesis.area_cognitiva || 'Normal';
                        document.getElementById('ing-area-sensorial').value = anamnesis.area_sensorial || 'Normal';
                        document.getElementById('ing-area-social').value = anamnesis.area_social || 'Normal';
                        document.getElementById('ing-fotografia').checked = anamnesis.tiene_fotografia || false;
                    }
                }
            } catch (e) {}

            modal.style.display = 'flex';

        } else {
            // Caso 3: modal de registro normal
            // Buscar sesión existente de hoy si hay
            let sesionExistente = null;
            if (data.sesion_id_activa) {
                const resSesion = await fetch(`${API}/sesiones/${data.sesion_id_activa}/detalle`);
                if (resSesion.ok) sesionExistente = await resSesion.json();
            }

            // Abrir modal de sesión normal
            sesionActivaId = data.sesion_id_activa || null;
            sesionData = sesionExistente || {
                ciclo_id: data.ciclo_activo_id,
                ciclo_numero: fichaData.ciclos.length,
                es_ingreso: false,
                actividades: null,
                indicadores: []
            };

            const modal = document.getElementById('modal-sesion');
            document.getElementById('sesion-modal-titulo').innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>📝 Sesión ${data.sesiones_ciclo_actual + 1}</span>
                        <span class="estado-badge" style="background:#dbeafe; color:#2563eb; font-size:0.75rem;">
                            Ciclo ${fichaData.ciclos.length}
                        </span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <span class="tag">👤 ${fichaData.nombre}</span>
                        <span class="tag">🎂 ${fichaData.edad} años</span>
                        <span class="tag">🪪 ${fichaData.rut}</span>
                    </div>
                </div>
            `;
            document.getElementById('sesion-fecha').value = sesionExistente?.fecha || new Date().toISOString().split('T')[0];
            document.getElementById('sesion-actividades').value = sesionExistente?.actividades || '';
            document.getElementById('sesion-materiales').value = sesionExistente?.materiales || '';
            document.getElementById('sesion-compromisos').value = sesionExistente?.compromisos || '';
            renderIndicadoresSesion(sesionExistente?.indicadores || []);
            modal.style.display = 'flex';
        }

    } catch (error) {
        console.error("Error abriendo registro:", error);
        alert("No se pudo cargar la información del usuario.");
    }
}
// ===========================================
// REGISTRAR SESIÓN DESDE CICLO
// ===========================================

// Registra una nueva sesión para el ciclo especificado
async function registrarSesionCiclo(cicloId) {
    try {
        const res = await fetch(`${API}/usuarios/detalle-atencion/${usuarioId}?crear_ciclo=true`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        // Verificar que el ciclo seleccionado es el activo
        if (data.ciclo_activo_id !== cicloId) {
            alert("⚠️ Solo puedes registrar sesiones en el ciclo activo.");
            return;
        }

        if (data.es_primera_sesion) {
            // Modal de ingreso
            const modal = document.getElementById('modal-ingreso');
            modal.dataset.cicloId = cicloId;
            modal.dataset.reservaId = '';
            sesionActivaId = null;
            sesionData = {
                ciclo_id: cicloId,
                ciclo_numero: fichaData.ciclos.length,
                es_ingreso: true,
                actividades: null, fecha: null, materiales: null, compromisos: null, indicadores: []
            };
            document.getElementById('ingreso-modal-titulo').innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>⭐ Sesión de Ingreso</span>
                        <span class="estado-badge" style="background:#fef9c3; color:#854d0e; font-size:0.75rem;">
                            Ciclo ${fichaData.ciclos.length}
                        </span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <span class="tag">👤 ${fichaData.nombre}</span>
                        <span class="tag">🎂 ${fichaData.edad} años</span>
                    </div>
                </div>`;
            document.getElementById('ing-fecha').value = new Date().toISOString().split('T')[0];
            await cargarObjetivosIngreso();
            await cargarDiagnosticosIngreso();
            await cargarMedicamentosIngreso();
            try {
                const resAnam = await fetch(`${API}/anamnesis/ciclo/${cicloId}`);
                if (resAnam.ok) {
                    const a = await resAnam.json();
                    if (a) {
                        document.getElementById('ing-motivo').value = a.motivo_consulta || '';
                        document.getElementById('ing-antecedentes').value = a.antecedentes || '';
                        document.getElementById('ing-expectativas').value = a.expectativas_tutor || '';
                        document.getElementById('ing-evaluaciones').value = a.evaluaciones_aplicadas || '';
                        document.getElementById('ing-area-motora').value = a.area_motora || 'Normal';
                        document.getElementById('ing-area-cognitiva').value = a.area_cognitiva || 'Normal';
                        document.getElementById('ing-area-sensorial').value = a.area_sensorial || 'Normal';
                        document.getElementById('ing-area-social').value = a.area_social || 'Normal';
                    }
                }
            } catch (e) {}
            modal.style.display = 'flex';
        } else {
            // Modal de sesión normal
            sesionActivaId = null;
            sesionData = {
                ciclo_id: cicloId,
                ciclo_numero: fichaData.ciclos.length,
                es_ingreso: false,
                actividades: null, indicadores: data.indicadores || []
            };
            const modal = document.getElementById('modal-sesion');
            document.getElementById('sesion-modal-titulo').innerHTML = `
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span>📝 Sesión ${data.sesiones_ciclo_actual + 1}</span>
                        <span class="estado-badge" style="background:#dbeafe; color:#2563eb; font-size:0.75rem;">
                            Ciclo ${fichaData.ciclos.length}
                        </span>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <span class="tag">👤 ${fichaData.nombre}</span>
                        <span class="tag">🎂 ${fichaData.edad} años</span>
                    </div>
                </div>`;
            document.getElementById('sesion-fecha').value = new Date().toISOString().split('T')[0];
            document.getElementById('sesion-actividades').value = '';
            document.getElementById('sesion-materiales').value = '';
            document.getElementById('sesion-compromisos').value = '';
            renderIndicadoresSesion(data.indicadores || []);
            modal.style.display = 'flex';
        }
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo cargar la información del usuario.");
    }
}

// ===========================================
// MODO ELIMINACIÓN CON CHECKBOXES
// ===========================================

let modoEliminacionActivo = {};

// Activa/desactiva el modo de selección para eliminar sesiones
async function toggleModoEliminacion(cicloId) {
    const contenedor = document.getElementById(`sesiones-ciclo-${cicloId}`);
    const btn = document.getElementById(`btn-eliminar-ciclo-${cicloId}`);

    // Si el ciclo está cerrado, abrir primero
    if (contenedor.style.display === 'none') {
        await toggleCiclo(cicloId);
    }

    if (modoEliminacionActivo[cicloId]) {
        // Desactivar modo eliminación
        modoEliminacionActivo[cicloId] = false;
        btn.textContent = '🗑️ Eliminar';
        btn.style.background = '#fff1f2';
        await toggleCiclo(cicloId);
        await toggleCiclo(cicloId);
    } else {
        // Activar modo eliminación
        modoEliminacionActivo[cicloId] = true;
        btn.textContent = '❌ Cancelar';
        btn.style.background = '#fee2e2';
        renderModoEliminacion(cicloId);
    }
}

// Renderiza las sesiones con checkboxes para selección
async function renderModoEliminacion(cicloId) {
    const contenedor = document.getElementById(`sesiones-ciclo-${cicloId}`);
    const res = await fetch(`${API}/ciclos/${cicloId}/sesiones`);
    const sesiones = await res.json();
    sesiones.reverse();

    if (sesiones.length === 0) {
        contenedor.innerHTML = `<p style="color:#94a3b8; padding:10px;">Sin sesiones para eliminar</p>`;
        return;
    }

    contenedor.innerHTML = `
        <div style="padding:8px 12px; background:#fff7ed; border-bottom:1px solid #fed7aa; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.82rem; color:#9a3412;">Selecciona las sesiones a eliminar</span>
            <div style="display:flex; gap:8px;">
                <button class="btn-accion-mini" style="background:#dcfce7; color:#16a34a; border-color:#86efac;"
                        onclick="confirmarEliminacion(${cicloId})">✅ Confirmar</button>
            </div>
        </div>
        ${sesiones.map(s => {
            const esInasistencia = s.es_inasistencia;
            const esIngreso = s.es_ingreso;
            const bloqueado = esIngreso;
            return `
                <div class="sesion-item ${esInasistencia ? 'sesion-inasistencia' : ''} ${bloqueado ? 'sesion-bloqueada' : ''}"
                     style="display:flex; align-items:center; gap:10px; opacity:${bloqueado ? '0.5' : '1'}">
                    <input type="checkbox" 
                           id="chk-sesion-${s.id}"
                           data-es-ingreso="${esIngreso}"
                           ${bloqueado ? 'disabled title="El ingreso no puede eliminarse individualmente"' : ''}
                           style="width:16px; height:16px; cursor:${bloqueado ? 'not-allowed' : 'pointer'};">
                    <div style="flex:1;">
                        <span class="sesion-numero">
                            ${esInasistencia ? '❌ Inasistencia' : (esIngreso ? '⭐ Ingreso' : '📝 Sesión ' + s.numero_sesion)}
                            ${esIngreso ? '<span style="font-size:0.7rem; color:#ef4444; margin-left:4px;">(elimina todo el ciclo)</span>' : ''}
                        </span>
                        <span class="sesion-fecha" style="margin-left:8px;">${s.fecha || '—'}</span>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// Confirma la eliminación de sesiones seleccionadas
async function confirmarEliminacion(cicloId) {
    const checkboxes = document.querySelectorAll(`#sesiones-ciclo-${cicloId} input[type="checkbox"]:checked`);
    
    if (checkboxes.length === 0) {
        alert("⚠️ No has seleccionado ninguna sesión.");
        return;
    }

    const ids = Array.from(checkboxes).map(c => parseInt(c.id.replace('chk-sesion-', '')));
    const tieneIngreso = Array.from(checkboxes).some(c => c.dataset.esIngreso === 'true');

    if (tieneIngreso) {
        // Advertencia especial para ingreso
        const confirmado = confirm(
            "⚠️ Has seleccionado la sesión de INGRESO.\n\n" +
            "Esto eliminará el CICLO COMPLETO y TODAS sus sesiones.\n\n" +
            "¿Confirmas la eliminación del ciclo completo?"
        );
        if (!confirmado) return;
        await eliminarCicloCompleto(cicloId);
    } else {
        const confirmado = confirm(`¿Eliminar ${ids.length} sesión${ids.length > 1 ? 'es' : ''}?\n\nPodrás recuperarlas desde la papelera dentro de 30 días.`);
        if (!confirmado) return;

        for (const id of ids) {
            await fetch(`${API}/sesiones/${id}`, { method: 'DELETE' });
        }
        alert("✅ Sesiones eliminadas. Puedes recuperarlas desde la papelera.");
    }

    modoEliminacionActivo[cicloId] = false;
    const btn = document.getElementById(`btn-eliminar-ciclo-${cicloId}`);
    if (btn) { btn.textContent = '🗑️ Eliminar'; btn.style.background = '#fff1f2'; }
    await cargarFicha();
    await toggleCiclo(cicloId);
}

// Elimina el ciclo completo y todas sus sesiones
async function eliminarCicloCompleto(cicloId) {
    const res = await fetch(`${API}/ciclos/${cicloId}/eliminar`, { method: 'DELETE' });
    if (res.ok) {
        alert("✅ Ciclo eliminado completamente.");
        await cargarFicha();
    } else {
        alert("Error al eliminar el ciclo.");
    }
}

// ===========================================
// PAPELERA — Ver y restaurar sesiones eliminadas
// ===========================================

// Muestra la papelera del ciclo
async function verPapelera(cicloId) {
    const res = await fetch(`${API}/ciclos/${cicloId}/papelera`);
    const sesiones = await res.json();

    if (sesiones.length === 0) {
        alert("La papelera está vacía para este ciclo.");
        return;
    }

    // Mostrar en modal simple
    const lista = sesiones.map(s => 
        `Sesión ${s.numero_sesion || '?'} · ${s.fecha || '?'} · Eliminada hace ${30 - s.dias_restantes} días (${s.dias_restantes} días restantes)`
    ).join('\n');

    const restaurar = confirm(
        `🗑️ Papelera del ciclo:\n\n${lista}\n\n¿Deseas restaurar todas las sesiones eliminadas?`
    );

    if (restaurar) {
        for (const s of sesiones) {
            await fetch(`${API}/sesiones/${s.id}/restaurar`, { method: 'POST' });
        }
        alert("✅ Sesiones restauradas correctamente.");
        await cargarFicha();
        await toggleCiclo(cicloId);
    }
}