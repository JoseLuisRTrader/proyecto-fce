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
}

// ==========================================
// HISTORIAL DE CICLOS
// ==========================================

function cambiarVistaHistorial(vista) {
    vistaHistorial = vista;
    document.getElementById('btn-hist-compacta').classList.toggle('activo', vista === 'compacta');
    document.getElementById('btn-hist-completa').classList.toggle('activo', vista === 'completa');
    renderCiclos();
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
        return `
        <div class="sesion-completa-item"
             style="background:${color.bg}; border-left: 3px solid ${color.border};"
             onclick="abrirSesion(${s.id})">
            <div class="sesion-completa-izq">
                <span class="sesion-numero">${s.es_ingreso ? '⭐' : '📝'} Sesión ${s.numero_sesion}</span>
                <span style="color:#94a3b8; font-size:0.75rem;">Ciclo ${s.numCiclo}</span>
                <span class="sesion-fecha">${s.fecha || '—'}</span>
            </div>
            <div class="sesion-completa-der">
                <p class="sesion-actividades">${s.actividades || 'Sin registro'}</p>
            </div>
            <button class="btn-accion-mini" onclick="event.stopPropagation(); ${s.es_inasistencia ? `abrirModalInasistencia(${s.id})` : `abrirSesion(${s.id})`}">
                ${s.es_inasistencia ? 'Ver/Eliminar' : 'Ver/Editar'}
            </button>
        </div>
    `}).join('');
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

            contenedor.innerHTML = sesiones.map(s => `
                <div class="sesion-item" style="cursor:pointer;" onclick="abrirSesion(${s.id})">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <span class="sesion-numero">${s.es_ingreso ? '⭐' : '📝'} Sesión ${s.numero_sesion}</span>
                            <span class="sesion-fecha" style="margin-left:10px;">${s.fecha || '—'}</span>
                        </div>
                        <button class="btn-accion-mini" onclick="event.stopPropagation(); abrirSesion(${s.id})">Ver/Editar</button>
                    </div>
                    <p class="sesion-actividades">${s.actividades || 'Sin registro de actividades'}</p>
                </div>
            `).join('');
            contenedor.innerHTML = sesiones.map(s => {
                const esInasistencia = s.es_inasistencia;
                return `
                    <div class="sesion-item ${esInasistencia ? 'sesion-inasistencia' : ''}" style="cursor:pointer;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div>
                                <span class="sesion-numero">
                                    ${esInasistencia ? '❌ Inasistencia' : (s.es_ingreso ? '⭐' : '📝') + ' Sesión ' + s.numero_sesion}
                                </span>
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
        if (res.ok) anamnesis = await res.json();
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

    // Cargar objetivos del ciclo
    await cargarObjetivosIngreso();

    document.getElementById('modal-ingreso').style.display = 'flex';
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

    if (window.location.search.includes('ingreso=true')) {
        window.location.href = '/dashboard';
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
        window.location.href = '/dashboard';
    } else {
        alert("Error al guardar registro");
    }
}

// OBJETIVOS EN INGRESO
async function cargarObjetivosIngreso() {
    const res = await fetch(`${API}/objetivos/ciclo/${sesionData.ciclo_id}`);
    const objetivos = await res.json();
    const lista = document.getElementById('ing-lista-objetivos');

    if (objetivos.length === 0) {
        lista.innerHTML = `<p style="color:#94a3b8; font-size:0.85rem;">Sin objetivos definidos</p>`;
        return;
    }

    lista.innerHTML = await Promise.all(objetivos.map(async obj => {
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

async function guardarObjetivoIngreso() {
    const tipo = document.getElementById('ing-obj-tipo').value.trim();
    const descripcion = document.getElementById('ing-obj-descripcion').value.trim();
    if (!tipo || !descripcion) { alert("⚠️ Tipo y descripción son obligatorios"); return; }

    const res = await fetch(`${API}/objetivos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: sesionData.ciclo_id, tipo, descripcion })
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
        
        // Guardar datos para crear sesión solo cuando se guarde
        sessionStorage.setItem('ingreso_pendiente', JSON.stringify({ cicloId, reservaId }));
        
        // Abrir modal de ingreso sin crear sesión aún
        await abrirModalIngresoPendiente(cicloId, reservaId);
    }
});

async function abrirModalIngresoPendiente(cicloId, reservaId) {
    sesionActivaId = null;
    sesionData = { 
        ciclo_id: cicloId, 
        ciclo_numero: fichaData.ciclos.length + 1,
        es_ingreso: true,
        actividades: null,
        fecha: null,
        materiales: null,
        compromisos: null,
        indicadores: []
    };

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
    document.getElementById('modal-ingreso').dataset.reservaId = reservaId;
    document.getElementById('modal-ingreso').dataset.cicloId = cicloId;
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