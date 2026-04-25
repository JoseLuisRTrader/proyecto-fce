const API = "http://127.0.0.1:8000";

// --- LOGIN ---
async function iniciarSesion() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const mensajeError = document.getElementById("mensaje-error");

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

// --- DASHBOARD LOGIC ---

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
        document.getElementById('total-pacientes').innerText = data.total_pacientes;
    } catch (error) {
        console.error("Error cargando resumen", error);
    }
}

/*
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

        const ahora = new Date();
        const horaActual = ahora.getHours().toString().padStart(2, '0') + ":" + 
                           ahora.getMinutes().toString().padStart(2, '0');

        let html = `
            <table class="fce-table">
                <thead>
                    <tr>
                        <th style="width: 50px; text-align: center;">Status</th>
                        <th style="width: 80px;">Hora</th>
                        <th>Paciente</th>
                        <th style="text-align: right;">Acción</th>
                    </tr>
                </thead>
                <tbody>
        `;

        citas.forEach(cita => {
            const yaPaso = cita.hora <= horaActual;
            
            // ASIGNACIÓN DE ACCIÓN: Si ya pasó la hora, el botón abre el Modal de Atención Financiero
            const onclickAccion = yaPaso 
                ? `abrirModalAtencion(${cita.reserva_id}, ${cita.usuario_id})` 
                : `alert('La ficha estará disponible a la hora de la cita')`;
            
            const btnClase = yaPaso ? "btn-atencion" : "btn-ver";
            const btnTexto = yaPaso ? "📝 Registrar" : "📁 Ver Ficha";
            const colorSemaforo = cita.semaforo || "#cbd5e1"; 

            html += `
                <tr class="${yaPaso ? 'fila-resaltada' : ''}">
                    <td style="text-align:center;">
                        <span class="semaforo-dot" style="background-color: ${colorSemaforo};"></span>
                    </td>
                    <td><b class="hora-texto">${cita.hora}</b></td>
                    <td>
                        <div class="paciente-container">
                            <span class="paciente-nombre">${cita.nombre}</span>
                            <span class="paciente-rut">${cita.rut}</span>
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
}*/
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
                        <th>Paciente</th>
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
                            <div class="paciente-info">
                                <span class="paciente-nombre">${cita.nombre}</span>
                                <span class="paciente-rut">${cita.rut}</span>
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
// --- LÓGICA FINANCIERA Y DE ATENCIÓN ---

async function abrirModalAtencion(reservaId, pacienteId) {
    console.log("Abriendo modal para reserva:", reservaId);
    
    // 1. Definir y validar el elemento modal antes del fetch
    const modal = document.getElementById('modal-atencion');
    if (!modal) {
        console.error("Error: No se encontró el elemento 'modal-atencion' en el HTML.");
        return;
    }

    try {
        // 2. Consultar el endpoint
        const res = await fetch(`${API}/usuarios/detalle-atencion/${pacienteId}`);
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        const data = await res.json();

        // 3. Poblar Datos Básicos
        document.getElementById('atencion-nombre-paciente').innerText = data.nombre;
        document.getElementById('atencion-edad').innerText = data.edad;
        document.getElementById('atencion-tutor').innerText = data.nombre_tutor || "No asignado";
        document.getElementById('atencion-diagnostico').innerText = data.ultimo_diagnostico || "Sin diagnóstico registrado";

        // 4. Foto del Paciente
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
            form.dataset.pacienteId = pacienteId;
        }

        // 9. Mostrar el modal finalmente
        modal.style.display = 'flex';

    } catch (error) {
        console.error("Error al cargar ficha de atención:", error);
        alert("No se pudo cargar la información del paciente.");
    }
}

function cerrarModalAtencion() {
    document.getElementById('modal-atencion').style.display = 'none';
    document.getElementById('form-atencion').reset();
}

async function finalizarAtencion() {
    const form = document.getElementById('form-atencion');
    const data = {
        reserva_id: parseInt(form.dataset.reservaId),
        usuario_id: parseInt(form.dataset.pacienteId),
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

// --- OTROS MODALES ---

function abrirModalPaciente() {
    document.getElementById('modal-paciente').style.display = 'flex';
}

function cerrarModalPaciente() {
    document.getElementById('modal-paciente').style.display = 'none';
    document.getElementById('form-paciente').reset();
}

async function guardarPaciente(event) {
    if(event) event.preventDefault();
    const profesionalId = localStorage.getItem('profesional_id');
    const datos = {
        rut: document.getElementById('paciente-rut').value,
        nombre: document.getElementById('paciente-nombre').value,
        email: document.getElementById('paciente-email').value,
        password: document.getElementById('paciente-password').value,
        profesional_id: parseInt(profesionalId)
    };

    try {
        const response = await fetch(`${API}/usuarios/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos)
        });

        if (response.ok) {
            alert("Paciente registrado con éxito");
            cerrarModalPaciente();
            cargarResumen();
            cargarProximasCitas(); 
        }
    } catch (error) {
        console.error("Error guardando paciente");
    }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = "/";
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarInterfaz();
    cargarResumen();
    cargarProximasCitas();
});