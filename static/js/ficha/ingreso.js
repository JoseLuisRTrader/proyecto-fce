// ===========================================
// ficha/ingreso.js — Modal de Ingreso completo (anamnesis + plan + clínico + sesión)
// Requiere: utils.js, ficha/state.js, ficha/core.js, ficha/ciclos.js cargados antes
// Provee: abrirModalIngreso, abrirModalIngresoPendiente, guardarIngresoCompleto, ...
// ===========================================
// ===========================================
// Helper F3: gestión del input "sesiones planificadas"
// - precargarSesionesPlanificadas: lee el plan actual del ciclo (si existe)
//   desde fichaData.ciclos y lo pone en el input. Si no hay plan, vacío.
// - guardarSesionesPlanificadas: envía PATCH /ciclos/{id}/plan con el valor
//   del input. Vacío → envía null (limpia el plan). Solo PATCHea si cambió.
// ===========================================
function precargarSesionesPlanificadas(cicloId) {
    const input = document.getElementById('ing-sesiones-planificadas');
    if (!input) return;

    const ciclo = (fichaData && fichaData.ciclos)
        ? fichaData.ciclos.find(c => c.id === cicloId)
        : null;
    const plan = ciclo ? ciclo.sesiones_planificadas : null;

    input.value = (plan !== null && plan !== undefined) ? plan : '';
    // Guardar valor original para detectar si cambió al guardar
    input.dataset.valorOriginal = input.value;
}

async function guardarSesionesPlanificadas(cicloId) {
    const input = document.getElementById('ing-sesiones-planificadas');
    if (!input) return;

    const valorActual = input.value.trim();
    const valorOriginal = (input.dataset.valorOriginal || '').trim();

    // No cambió → no hacer PATCH innecesario
    if (valorActual === valorOriginal) return;

    let sesionesPlanificadas;
    if (valorActual === '') {
        sesionesPlanificadas = null;  // limpiar el plan
    } else {
        const n = parseInt(valorActual, 10);
        if (isNaN(n) || n < 1) {
            // Valor inválido: avisar y no enviar (no bloquea el resto del ingreso)
            alert("⚠️ Sesiones planificadas debe ser un número mayor o igual a 1. No se guardó ese campo.");
            return;
        }
        sesionesPlanificadas = n;
    }

    try {
        await fetch(`${API}/ciclos/${cicloId}/plan`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesiones_planificadas: sesionesPlanificadas })
        });
    } catch (e) {
        console.error("Error guardando sesiones planificadas:", e);
        // No interrumpe el flujo de ingreso: es un dato secundario
    }
}
// ==========================================
// MODAL INGRESO
// ==========================================

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
    precargarSesionesPlanificadas(sesionData.ciclo_id);
    modal.style.display = 'flex';
}

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
    precargarSesionesPlanificadas(cicloId);

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
            body: JSON.stringify({ ciclo_id: cicloId || null, reserva_id: reservaId, usuario_id: parseInt(usuarioId) })
        });
        const creadaIng = await resCrear.json();
        // Si el backend creó/resolvió el ciclo, sincronizar el dataset
        if (creadaIng && creadaIng.ciclo_id) {
            document.getElementById('modal-ingreso').dataset.cicloId = creadaIng.ciclo_id;
        }
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
        await refrescarFichaPreservandoUI();
    } else {
        alert("Error al guardar registro");
    }
}

// sesionInasistenciaId → declarada en ficha/state.js

// ===========================================
// GUARDAR INGRESO COMPLETO
// Guarda anamnesis, objetivo general, sesión en un solo paso
// ===========================================
async function guardarIngresoCompleto() {
    const modal = document.getElementById('modal-ingreso');
    let cicloId = parseInt(modal.dataset.cicloId) || null;
    const reservaId = parseInt(modal.dataset.reservaId) || null;

    try {
        // 1. Crear/resolver la sesión de ingreso PRIMERO.
        //    El backend crea el ciclo si no existe (flujo lazy: el ciclo
        //    nace recién al guardar, nunca al abrir el modal).
        if (!sesionActivaId) {
            const resCrear = await fetch(`${API}/sesiones/crear-ingreso`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ciclo_id: cicloId,
                    reserva_id: reservaId,
                    usuario_id: parseInt(usuarioId)
                })
            });
            if (!resCrear.ok) {
                const err = await resCrear.json().catch(() => ({}));
                alert(`❌ ${err.detail || 'No se pudo crear la sesión de ingreso.'}`);
                return;
            }
            const creada = await resCrear.json();
            sesionActivaId = creada.id;
            if (creada.ciclo_id) {
                cicloId = creada.ciclo_id;
                modal.dataset.cicloId = creada.ciclo_id;
            }
        }

        // Validación defensiva: a esta altura el ciclo DEBE existir
        if (!cicloId) {
            alert("Error: no se pudo determinar el ciclo del ingreso.");
            return;
        }

        // 2. Guardar anamnesis (ya con cicloId real)
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

        // 3. Guardar objetivo general
        await guardarObjetivoGeneral(cicloId);

        // 3b. Guardar sesiones planificadas (plan terapéutico) — F3
        await guardarSesionesPlanificadas(cicloId);

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
        // refrescarFichaPreservandoUI re-expande automáticamente los ciclos
        // que estaban abiertos (el Set window._ciclosAbiertos ya los tiene).
        await refrescarFichaPreservandoUI();

    } catch (error) {
        console.error("Error guardando ingreso:", error);
        alert("Error al guardar el ingreso");
    }
}

// --- BOTÓN REGISTRAR EN FICHA ---
// Detecta el tipo de sesión y abre el modal correspondiente
