const API = "http://127.0.0.1:8000";

let usuarioActivoId = null;
let reservaActivaId = null;


// --- LOGIN ---
async function iniciarSesion() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const mensajeError = document.getElementById("modal-mensaje-error");

    try {
        const response = await fetch(`${API}/profesionales/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        if (response.ok) {
            const data = await response.json();
            localStorage.setItem("profesional_id", data.profesional_id);
            localStorage.setItem("nombre_profesional", data.nombre);
            window.location.href = "/dashboard";
        } else {
            mensajeError.textContent = "Credenciales incorrectas";
        }
    } catch (error) {
        mensajeError.textContent = "Error de conexión";
    }
}

// --- LÓGICA DASHBOARD  ---

function inicializarInterfaz() {
    const nombre = localStorage.getItem('nombre_profesional');
    if (!nombre && window.location.pathname === '/dashboard') {
        window.location.href = "/";
        return;
    }

    if (document.getElementById('nombre-profesional-top')) {
        document.getElementById('nombre-profesional-top').innerText = nombre;
        document.getElementById('user-photo-top').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=2563eb&color=fff`;
    }

    const fechaEl = document.getElementById('fecha-completa');
    if (fechaEl) {
        const opciones = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        fechaEl.innerText = new Date().toLocaleDateString('es-CL', opciones);
    }
}
async function cargarResumen() {
    if (!document.getElementById('citas-hoy')) return;
    try {
        const response = await fetch(`${API}/dashboard/resumen`);
        const data = await response.json();
        document.getElementById('citas-hoy').innerText = data.citas_hoy;
        document.getElementById('ciclos-activos').innerText = data.ciclos_activos;
        document.getElementById('total-usuarios').innerText = data.total_usuarios;
    } catch (error) {
        console.error("Error cargando resumen", error);
    }
}
async function cargarProximasCitas() {
    const contenedor = document.getElementById('lista-citas');
    if (!contenedor) return;

    try {
        const response = await fetch(`${API}/dashboard/proximas-citas`);
        const citas = await response.json();

        if (citas.length === 0) {
            contenedor.innerHTML = "<div class='sin-citas' style='padding:20px; text-align:center; color:#64748b;'>No hay citas programadas para hoy.</div>";
            return;
        }

        let html = `
            <table class="fce-table">
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">Status</th>
                        <th style="width: 80px;">Hora</th>
                        <th>Usuario</th>
                        <th style="text-align: right;">Acción</th>
                    </tr>
                </thead>
                <tbody>
        `;

        citas.forEach(cita => {
            // Eliminada la validación de hora: siempre abre el modal y siempre usa el estilo azul
            const onclickAccion = `abrirModalAtencion(${cita.reserva_id}, ${cita.usuario_id})`;
            const btnClase = "btn-atencion";
            const btnTexto = "📝 Registrar";
            const colorSemaforo = cita.semaforo || "#cbd5e1"; 

            const fotoUrl = cita.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(cita.nombre)}&background=2563eb&color=fff`;

            html += `
                <tr>
                    <td style="text-align:center;">
                        <span class="semaforo-dot" style="background-color: ${colorSemaforo};"></span>
                    </td>
                    <td><b class="hora-texto">${cita.hora}</b></td>
                    <td>
                        <div class="user-cell">
                            <img src="${fotoUrl}" class="avatar-small" alt="Foto">
                            <div class="usuario-info">
                                <span class="usuario-nombre">${cita.nombre}</span>
                                <span class="usuario-rut">${cita.rut}</span>
                            </div>
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <button class="${btnClase}" onclick="${onclickAccion}">
                            ${btnTexto}
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        contenedor.innerHTML = html;
    } catch (error) {
        console.error("Error cargando agenda:", error);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    inicializarInterfaz();
    cargarResumen();
    cargarProximasCitas();
    cargarProximosDias();
});
async function cargarProximosDias() {
    const contenedor = document.getElementById('lista-proximos-dias');
    if (!contenedor) return;

    try {
        const response = await fetch(`${API}/dashboard/proximos-dias`);
        const dias = await response.json();

        if (dias.length === 0) {
            contenedor.innerHTML = "<div style='padding:20px; text-align:center; color:#64748b;'>No hay citas programadas para los próximos días.</div>";
            return;
        }

        let html = '';

        dias.forEach(dia => {
            html += `
                <div class="dia-card">
                    <div class="dia-header" onclick="toggleDia('dia-${dia.fecha}')">
                        <div class="dia-info">
                            <span class="dia-nombre">${dia.dia_nombre}</span>
                            <span class="dia-badge">${dia.total} cita${dia.total > 1 ? 's' : ''}</span>
                        </div>
                        <span class="dia-flecha" id="flecha-dia-${dia.fecha}">▶</span>
                    </div>
                    <div class="dia-detalle" id="dia-${dia.fecha}" style="display:none;">
                        <table class="fce-table">
                            <thead>
                                <tr>
                                    <th style="width:50px; text-align:center;">Estado</th>
                                    <th style="width:80px;">Hora</th>
                                    <th>Usuario</th>

                                </tr>
                            </thead>
                            <tbody>
                            
                                ${dia.citas.map(c => `
                                    <tr>
                                    <td style="text-align:center;">
                                        <span class="semaforo-dot" style="background-color: ${c.semaforo || '#cbd5e1'};"></span>
                                    </td>
                                    <td><b>${c.hora}</b></td>
                                    <td>
                                        <div class="usuario-info">
                                            <span class="usuario-nombre">${c.nombre}</span>
                                            <span class="usuario-rut">${c.rut}</span>
                                        </div>
                                    </td>
                                    <td style="text-align:right;">
                                        <button class="btn-atencion" onclick="verFichaUsuario(${c.usuario_id})">
                                            📁 Ver Ficha
                                        </button>
                                    </td>
                                </tr>
                                
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        contenedor.innerHTML = html;

    } catch (error) {
        console.error("Error cargando próximos días:", error);
    }
}
//-- crea la flechita y despliegue de los datos de las proximas citas
function toggleDia(id) {
    const detalle = document.getElementById(id);
    const fecha = id.replace('dia-', '');
    const flecha = document.getElementById(`flecha-dia-${fecha}`);
    
    if (detalle.style.display === 'none') {
        detalle.style.display = 'block';
        flecha.textContent = '▼';
    } else {
        detalle.style.display = 'none';
        flecha.textContent = '▶';
    }
}
function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/";
}
// --- LÓGICA DE ATENCIÓN  ---

async function abrirModalAtencion(reservaId, usuarioId) {
    console.log("Abriendo modal para reserva:", reservaId);
    reservaActivaId = reservaId;
    usuarioActivoId = usuarioId;
    // 1. Definir y validar el elemento modal antes del fetch
    const modal = document.getElementById('modal-atencion');
    if (!modal) {
        console.error("Error: No se encontró el elemento 'modal-atencion' en el HTML.");
        return;
    }

    try {
        // 2. Consultar el endpoint
        const res = await fetch(`${API}/usuarios/detalle-atencion/${usuarioId}`);
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        const data = await res.json();

        // 3. Poblar Datos Básicos
        document.getElementById('atencion-nombre-usuario').innerText = data.nombre;
        document.getElementById('atencion-edad').innerText = data.edad;
        document.getElementById('atencion-tutor').innerText = data.nombre_tutor || "No asignado";
        // Diagnósticos con ver más
        const diagnosticos = data.diagnosticos || [];
        const wrapper = document.getElementById('atencion-diagnosticos-wrapper');

        if (diagnosticos.length === 0) {
            wrapper.innerHTML = `<span class="tag">📋 Sin diagnóstico registrado</span>`;
        } else if (diagnosticos.length === 1) {
            wrapper.innerHTML = `<span class="tag">📋 ${diagnosticos[0].descripcion}</span>`;
        } else {
            wrapper.innerHTML = `
                <span class="tag">📋 ${diagnosticos[0].descripcion}</span>
                <div class="lista-diag-extra" style="display:none;">
                    ${diagnosticos.slice(1).map(d => `
                        <span class="tag">📋 ${d.descripcion}</span>
                    `).join('')}
                </div>
                <span class="ver-mas-diag" onclick="toggleDiagnosticos(this)"
                    data-total="${diagnosticos.length - 1}">
                    +${diagnosticos.length - 1} más
                </span>
            `;
        }
        // 4. Foto del usuario
        const fotoElement = document.getElementById('atencion-foto');
        if (fotoElement) {
            fotoElement.src = data.foto_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=2563eb&color=fff`;
        }

        // 5. Lógica de primer ingreso y progreso
        const alertaIngreso = document.getElementById('alerta-primer-ingreso');
        if (alertaIngreso) {
            alertaIngreso.style.display = data.total_sesiones === 0 ? 'block' : 'none';
        }

        const barraProgreso = document.getElementById('atencion-barra-progreso');
        if (barraProgreso) {
            const porcentaje = Math.min((data.total_sesiones / 10) * 100, 100);
            barraProgreso.style.width = `${porcentaje}%`;
        }

        // 6. Indicadores
        let htmlInd = "";
        if (data.indicadores && data.indicadores.length > 0) {
            data.indicadores.forEach(ind => {
                htmlInd += `<li>${ind.cumplido ? '✅' : '⭕'} ${ind.descripcion}</li>`;
            });
        }
        document.getElementById('atencion-lista-indicadores').innerHTML = htmlInd || "<li>Sin objetivos definidos</li>";

        // 7. Finanzas
        const inputMonto = document.getElementById('atencion-monto');
        if (inputMonto) {
            inputMonto.value = data.tarifa_pactada || 35000;
        }
        const avisoTarifa = document.getElementById('aviso-tarifa');
        if (avisoTarifa) {
            avisoTarifa.style.display = data.tarifa_pactada ? 'block' : 'none';
        }

        // 8. Vincular datos al formulario para el envío posterior
        const form = document.getElementById('form-atencion');
        if (form) {
            form.dataset.reservaId = reservaId;
            form.dataset.usuarioId = usuarioId;
        }

        // 9. Mostrar el modal finalmente
        modal.style.display = 'flex';

    } catch (error) {
        console.error("Error al cargar ficha de atención:", error);
        alert("No se pudo cargar la información del usuario.");
    }
}
function verFichaUsuario(usuarioId) {
    window.location.href = `/usuarios/${usuarioId}`;
}
//-- crear el link de + n° más de los diagnosticos del usuario
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
function cerrarModalAtencion() {
    document.getElementById('modal-atencion').style.display = 'none';
    document.getElementById('atencion-actividades').value = '';
    document.getElementById('atencion-monto').value = '';
}
async function finalizarAtencion() {
    const form = document.getElementById('form-atencion');
    const data = {
        reserva_id: parseInt(form.dataset.reservaId),
        usuario_id: parseInt(form.dataset.usuarioId),
        actividades: document.getElementById('atencion-actividades').value,
        monto: parseInt(document.getElementById('atencion-monto').value),
        estado_pago: document.getElementById('atencion-pago-estado').value
    };

    try {
        const response = await fetch(`${API}/sesiones/registrar-atencion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("Atención y cobro registrados correctamente");
            cerrarModalAtencion();
            location.reload();
        } else {
            alert("Error al registrar la atención");
        }
    } catch (error) {
        alert("Error de conexión");
    }
}
//---  LÓGICA DIAGNOSTICOS ---
//Boton -> "Editar Usuario" dentro de boton "Registrar"
async function cargarDiagnosticos() {
    const res = await fetch(`${API}/diagnosticos/usuario/${usuarioActivoId}`);
    const data = await res.json();
    const lista = document.getElementById('lista-diagnosticos');

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
    document.getElementById('diag-descripcion').focus();
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

    if (!descripcion || !tipo) {
        alert("⚠️ Descripción y Tipo son obligatorios");
        return;
    }

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

// --- LÓGICA MEDICAMENTOS ---
//Boton -> "Editar Usuario" dentro de boton "Registrar"
async function cargarMedicamentos() {
    const res = await fetch(`${API}/medicamentos/usuario/${usuarioActivoId}`);
    const data = await res.json();
    const lista = document.getElementById('lista-medicamentos');

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
    document.getElementById('med-nombre').focus();
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

    if (!nombre) {
        alert("⚠️ El nombre del medicamento es obligatorio");
        return;
    }

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



// Dentro de "Sesiones de Hoy" boton "registrar"
function cambiarTab(tab) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    event.target.classList.add('active');
}
async function abrirEditarUsuario() {
    const modal = document.getElementById('modal-editar-usuario');
    if (!modal) return;

    try {
        const res = await fetch(`${API}/usuarios/${usuarioActivoId}`);
        const data = await res.json();

        document.getElementById('edit-nombre').value = data.nombre || '';
        document.getElementById('edit-rut').value = data.rut || '';
        document.getElementById('edit-fecha-nacimiento').value = data.fecha_nacimiento || '';
        document.getElementById('edit-telefono1').value = data.telefono_1 || '';
        document.getElementById('edit-telefono2').value = data.telefono_2 || '';
        document.getElementById('edit-email').value = data.email || '';
        document.getElementById('edit-tutor').value = data.nombre_tutor || '';
        document.getElementById('edit-establecimiento').value = data.establecimiento_educacional || '';
        document.getElementById('edit-tarifa').value = data.tarifa_pactada || '';

        await cargarDiagnosticos();
        await cargarMedicamentos();

        modal.style.display = 'flex';

    } catch (error) {
        console.error("Error cargando usuario:", error);
    }
}
function cerrarEditarUsuario() {
    document.getElementById('modal-editar-usuario').style.display = 'none';
}
async function guardarDatosUsuario() {
    const datos = {
        nombre: document.getElementById('edit-nombre').value,
        fecha_nacimiento: document.getElementById('edit-fecha-nacimiento').value,
        telefono_1: document.getElementById('edit-telefono1').value,
        telefono_2: document.getElementById('edit-telefono2').value,
        email: document.getElementById('edit-email').value,
        nombre_tutor: document.getElementById('edit-tutor').value,
        establecimiento_educacional: document.getElementById('edit-establecimiento').value,
        tarifa_pactada: parseInt(document.getElementById('edit-tarifa').value) || null
    }

    try {
        const res = await fetch(`${API}/usuarios/${usuarioActivoId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        if (res.ok) {
            alert("✅ Datos actualizados correctamente");
            cerrarEditarUsuario();
            // Recargar datos del modal de atención
            await abrirModalAtencion(reservaActivaId, usuarioActivoId);
        } else {
            alert("Error al guardar los datos");
        }
    } catch (error) {
        console.error("Error guardando usuario:", error);
    }
}

