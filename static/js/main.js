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

// --- RESUMEN DASHBOARD ---
// Carga tarjetas de resumen: citas hoy, ciclos activos, total usuarios
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

// --- ALERTA DE PENDIENTES ---
// Muestra cuántas sesiones están pendientes de registro
async function cargarAlertaPendientes() {
    const contenedor = document.getElementById('alerta-pendientes');
    if (!contenedor) return;
    try {
        const response = await fetch(`${API}/dashboard/pendientes`);
        const data = await response.json();
        if (data.total > 0) {
            contenedor.innerHTML = `
                <div class="alerta-pendientes-banner">
                    ⚠️ Tienes <strong>${data.total}</strong> registro${data.total > 1 ? 's' : ''} pendiente${data.total > 1 ? 's' : ''} de sesiones anteriores.
                    <a href="/registro" class="link-ver-pendientes">Ver todos →</a>
                </div>
            `;
        }
    } catch (error) {
        console.error("Error cargando pendientes", error);
    }
}

// --- PRÓXIMOS DÍAS ---
// Carga las citas de los próximos 10 días en formato desplegable
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
                                    <th style="text-align:right;">Acción</th>
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

// --- TOGGLE DESPLEGABLE DÍAS ---
// Abre y cierra el detalle de citas por día
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

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    inicializarInterfaz();
    cargarResumen();
    cargarAlertaPendientes();
    cargarProximosDias();
});