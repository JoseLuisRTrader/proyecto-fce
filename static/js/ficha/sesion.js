// ===========================================
// ficha/sesion.js — Modal sesión normal, inasistencias, flujo Registro
// Requiere: utils.js, ficha/state.js, ficha/core.js, ficha/ciclos.js cargados antes
// Provee:
//   - abrirSesion, registrarSesionCiclo, abrirRegistroFicha → llamados desde HTML/otros módulos
//   - abrirModalInasistencia, registrarInasistenciaCiclo, eliminarSesionDirecta
// ===========================================

// ==========================================
// MODAL SESIÓN NORMAL
// ==========================================

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
        await refrescarFichaPreservandoUI();
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
        await refrescarFichaPreservandoUI();
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
    await refrescarFichaPreservandoUI();
}

async function eliminarInasistencia() {
    if (!confirm("¿Eliminar este registro de inasistencia?")) return;
    
    const res = await fetch(`${API}/sesiones/${sesionInasistenciaId}`, {
        method: 'DELETE'
    });
    
    if (res.ok) {
        alert("✅ Inasistencia eliminada");
        cerrarModalInasistencia();
        await refrescarFichaPreservandoUI();
    } else {
        alert("Error al eliminar");
    }
}

// Elimina directamente una sesión desde la vista completa (soft delete → papelera 30 días)
async function eliminarSesionDirecta(sesionId) {
    if (!confirm("¿Mover esta sesión a la papelera? Podrás recuperarla dentro de 30 días.")) return;
    const res = await fetch(`${API}/sesiones/${sesionId}`, { method: 'DELETE' });
    if (res.ok) {
        // Capturar scroll antes de re-render para mantener al usuario donde estaba.
        // refrescarFichaPreservandoUI ya preserva ciclos abiertos + scroll.
        await refrescarFichaPreservandoUI();
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

