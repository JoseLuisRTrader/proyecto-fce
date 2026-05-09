// ===========================================
// registro.js — Lógica exclusiva de Registro
// Requiere: utils.js cargado antes
// ===========================================

let reservaActivaId = null;

// --- CARGAR ESTADÍSTICAS ---
// Carga estadísticas de sesiones del mes actual
async function cargarEstadisticas() {
    try {
        const res = await fetch(`${API}/dashboard/estadisticas-registro`);
        const data = await res.json();
        document.getElementById('stat-sesiones-mes').innerText = data.total_mes;
        document.getElementById('stat-registradas').innerText = data.registradas;
        document.getElementById('stat-pendientes').innerText = data.pendientes;
    } catch (error) {
        console.error("Error cargando estadísticas:", error);
    }
}

// --- CARGAR SESIONES DE HOY Y PENDIENTES ---
// Carga todas las sesiones pendientes incluyendo las de hoy
async function cargarSesiones() {
    try {
        const res = await fetch(`${API}/dashboard/sesiones-pendientes`);
        const sesiones = await res.json();

        const sesionesHoy = sesiones.filter(s => s.es_hoy === true);
        const sesionesAnteriores = sesiones.filter(s => s.es_hoy === false);

        const badgeHoy = document.getElementById('badge-hoy');
        if (badgeHoy) badgeHoy.textContent = `${sesionesHoy.length} sesión${sesionesHoy.length !== 1 ? 'es' : ''}`;

        const badgePend = document.getElementById('badge-pendientes');
        if (badgePend) badgePend.textContent = `${sesionesAnteriores.length} pendiente${sesionesAnteriores.length !== 1 ? 's' : ''}`;

        renderTablasSesiones('lista-sesiones-hoy', sesionesHoy);
        renderTablasSesiones('lista-pendientes', sesionesAnteriores);

    } catch (error) {
        console.error("Error cargando sesiones:", error);
    }
}

// --- RENDERIZAR TABLA DE SESIONES ---
// Genera la tabla HTML para una lista de sesiones
function renderTablasSesiones(contenedorId, sesiones) {
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    if (sesiones.length === 0) {
        contenedor.innerHTML = `
            <div style="padding:20px; text-align:center; color:#64748b;">
                ✅ Sin sesiones pendientes
            </div>
        `;
        return;
    }

    contenedor.innerHTML = `
        <table class="fce-table">
            <thead>
                <tr>
                    <th style="width:50px;"></th>
                    <th style="width:160px;">Fecha</th>
                    <th style="width:80px;">Hora</th>
                    <th>Usuario</th>
                    <th style="text-align:right;">Acción</th>
                </tr>
            </thead>
            <tbody>
                ${sesiones.map(s => `
                    <tr>
                        <td>
                            <img src="${s.foto_url}" class="avatar-small" alt="Foto">
                        </td>
                        <td style="color:#64748b; font-size:0.85rem;">${s.fecha_label}</td>
                        <td><b>${s.hora}</b></td>
                        <td>
                            <div class="usuario-info">
                                <span class="usuario-nombre">${s.nombre}</span>
                                <span class="usuario-rut">${s.rut}</span>
                            </div>
                        </td>
                        <td style="text-align:right;">
                            <button class="btn-atencion" onclick="abrirModalAtencion(${s.reserva_id}, ${s.usuario_id})">
                                📝 Registrar
                            </button>
                            <button class="btn-inasistencia" onclick="registrarInasistencia(${s.reserva_id}, ${s.usuario_id})">
                                ❌ Inasistencia
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// --- MODAL ATENCIÓN ---
// Abre el modal de registro de sesión con datos del usuario
async function abrirModalAtencion(reservaId, usuarioId) {
    reservaActivaId = reservaId;
    usuarioActivoId = usuarioId;

    const modal = document.getElementById('modal-atencion');
    if (!modal) return;

    try {
        const res = await fetch(`${API}/usuarios/detalle-atencion/${usuarioId}`);
        if (!res.ok) throw new Error("Error del servidor");
        const data = await res.json();

        // Detectar primera sesión → redirigir a ficha
        if (data.es_primera_sesion) {
            window.location.href = `/ficha/${usuarioId}?ingreso=true&ciclo=${data.ciclo_activo_id}&reserva=${reservaId}&nuevo_ciclo=${data.es_inicio_nuevo_ciclo}`;
            return;
        }

        // Poblar datos básicos
        document.getElementById('atencion-nombre-usuario').innerText = data.nombre;
        document.getElementById('atencion-edad').innerText = data.edad;
        document.getElementById('atencion-tutor').innerText = data.nombre_tutor || "No asignado";
        document.getElementById('atencion-foto').src = data.foto_url || avatarUrl(data.nombre);

        // Diagnósticos
        const diagnosticos = data.diagnosticos || [];
        const wrapper = document.getElementById('atencion-diagnosticos-wrapper');
        if (diagnosticos.length === 0) {
            wrapper.innerHTML = `<span class="tag">📋 Sin diagnóstico</span>`;
        } else if (diagnosticos.length === 1) {
            wrapper.innerHTML = `<span class="tag">📋 ${diagnosticos[0].descripcion}</span>`;
        } else {
            wrapper.innerHTML = `
                <span class="tag">📋 ${diagnosticos[0].descripcion}</span>
                <div class="lista-diag-extra" style="display:none;">
                    ${diagnosticos.slice(1).map(d => `<span class="tag">📋 ${d.descripcion}</span>`).join('')}
                </div>
                <span class="ver-mas-diag" onclick="toggleDiagnosticos(this)" data-total="${diagnosticos.length - 1}">
                    +${diagnosticos.length - 1} más
                </span>
            `;
        }

        // Progreso del ciclo
        const sesionesCount = document.getElementById('atencion-sesiones-count');
        if (sesionesCount) sesionesCount.textContent = data.sesiones_ciclo_actual || 0;
        const barraProgreso = document.getElementById('atencion-barra-progreso');
        if (barraProgreso) barraProgreso.style.width = `${Math.min(((data.sesiones_ciclo_actual || 0) / 10) * 100, 100)}%`;

        // Indicadores
        let htmlInd = "";
        if (data.indicadores && data.indicadores.length > 0) {
            data.indicadores.forEach(ind => {
                htmlInd += `<li>${ind.cumplido ? '✅' : '⭕'} ${ind.descripcion}</li>`;
            });
        }
        document.getElementById('atencion-lista-indicadores').innerHTML = htmlInd || "<li>Sin objetivos definidos</li>";

        // Cargar sesión existente si hay
        const sesionRes = await fetch(`${API}/sesiones/por-reserva/${reservaId}`);
        if (sesionRes.ok) {
            const sesionExistente = await sesionRes.json();
            document.getElementById('atencion-actividades').value = sesionExistente?.actividades || '';
        } else {
            document.getElementById('atencion-actividades').value = '';
        }

        // Monto
        const inputMonto = document.getElementById('atencion-monto');
        if (inputMonto) inputMonto.value = data.tarifa_pactada || 35000;

        modal.style.display = 'flex';

    } catch (error) {
        console.error("Error:", error);
        alert("No se pudo cargar la información del usuario.");
    }
}

// --- CERRAR MODAL ATENCIÓN ---
function cerrarModalAtencion() {
    document.getElementById('modal-atencion').style.display = 'none';
    document.getElementById('atencion-actividades').value = '';
    document.getElementById('atencion-monto').value = '';
}

// --- FINALIZAR ATENCIÓN ---
// Guarda el registro de la sesión y el cobro
async function finalizarAtencion() {

    const actividades = document.getElementById('atencion-actividades').value.trim();
    console.log('reservaActivaId:', reservaActivaId, 'usuarioActivoId:', usuarioActivoId);
    console.log('actividades:', actividades);

    if (!actividades || actividades.length < 10) {
        alert("⚠️ Debes escribir la evolución de la sesión (mínimo 10 caracteres)");
        document.getElementById('atencion-actividades').focus();
        return;
    }

    const data = {
        reserva_id: reservaActivaId,
        usuario_id: usuarioActivoId,
        actividades,
        monto: parseInt(document.getElementById('atencion-monto').value) || 0,
        estado_pago: document.getElementById('atencion-pago-estado').value
    };

    try {
        const response = await fetch(`${API}/sesiones/registrar-atencion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("✅ Atención registrada correctamente");
            cerrarModalAtencion();
            cargarSesiones();
            cargarEstadisticas();
        } else {
            alert("Error al registrar la atención");
        }
    } catch (error) {
        alert("Error de conexión");
    }
}

// --- REGISTRAR INASISTENCIA ---
// Marca la reserva como inasistencia sin crear sesión clínica
async function registrarInasistencia(reservaId, usuarioId) {
    if (!confirm("¿Confirmar inasistencia? Esto quedará registrado pero no contará como sesión.")) return;

    try {
        const res = await fetch(`${API}/sesiones/registrar-inasistencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reserva_id: reservaId, usuario_id: usuarioId })
        });

        if (res.ok) {
            alert("✅ Inasistencia registrada");
            cargarSesiones();
            cargarEstadisticas();
        } else {
            alert("Error al registrar inasistencia");
        }
    } catch (error) {
        alert("Error de conexión");
    }
}

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarInterfaz();
    cargarEstadisticas();
    cargarSesiones();
});