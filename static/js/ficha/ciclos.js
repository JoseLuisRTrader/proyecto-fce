// ===========================================
// ficha/ciclos.js — Historial de ciclos + Papelera + Eliminación masiva
// Requiere: utils.js, ficha/state.js, ficha/core.js cargados antes
// Provee: renderCiclos (usado desde core.js#renderFicha),
//         cambiarVistaHistorial, toggleCiclo (usado desde HTML y otros módulos)
// ===========================================
// ===========================================
// Helper: formato de progreso de sesiones del ciclo
// Sin plan:        "5 sesiones"
// Con plan:        "5/12 sesiones"
// Plan completo:   "12/12 sesiones ✓"
// Plan excedido:   "13/12 sesiones ⚠️"
// ===========================================
function formatearProgresoCiclo(ciclo) {
    const realizadas = ciclo.numero_sesiones || 0;
    const plan = ciclo.sesiones_planificadas;

    if (!plan) {
        return `${realizadas} sesiones`;
    }
    if (realizadas > plan) {
        return `${realizadas}/${plan} sesiones ⚠️`;
    }
    if (realizadas === plan) {
        return `${realizadas}/${plan} sesiones ✓`;
    }
    return `${realizadas}/${plan} sesiones`;
}

// ==========================================
// HISTORIAL DE CICLOS
// ==========================================
async function cambiarVistaHistorial(vista) {
    // Capturar estado UI antes de re-renderizar.
    const snapshot = capturarEstadoUI();

    // Reservar la altura del contenedor durante TODA la transición.
    // Mantener el documento alto evita que el navegador clampe el scroll
    // del usuario mientras renderizamos y expandimos ciclos.
    const divCiclos = document.getElementById('ficha-ciclos');
    const alturaPrevia = divCiclos ? divCiclos.offsetHeight : 0;
    if (divCiclos && alturaPrevia > 0) {
        divCiclos.style.minHeight = alturaPrevia + 'px';
    }

    vistaHistorial = vista;
    document.getElementById('btn-hist-compacta').classList.toggle('activo', vista === 'compacta');
    document.getElementById('btn-hist-completa').classList.toggle('activo', vista === 'completa');
    const btnPapelera = document.getElementById('btn-hist-papelera');
    if (btnPapelera) btnPapelera.classList.toggle('activo', vista === 'papelera');

    // Renderizar nuevo contenido y, si es compacta, re-expandir ciclos del Set.
    // Todo ocurre con el minHeight aplicado, así que el documento no encoge.
    await renderCiclos();
    if (vista === 'compacta') {
        await restaurarEstadoUI(snapshot);
    }

    // Punto único de finalización tras un frame de pintado.
    // Aquí decidimos si soltar minHeight y aplicamos el scroll definitivo.
    requestAnimationFrame(() => {
        if (!divCiclos) return;

        // Medir altura natural del contenido nuevo (sin minHeight).
        divCiclos.style.minHeight = '';
        const alturaNatural = divCiclos.offsetHeight;

        if (alturaNatural < alturaPrevia) {
            // Contenido más corto: mantener reserva para sostener el scroll
            // del usuario sin saltos hacia el final del documento.
            divCiclos.style.minHeight = alturaPrevia + 'px';
        }

        // Aplicar scroll DESPUÉS de decidir altura, clamped al máximo real.
        // (En vista compacta, restaurarEstadoUI ya intentó hacer scroll antes;
        // este scroll final fija la posición correcta tras decidir minHeight.)
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.min(snapshot.scrollY, maxScroll));
    });
}

async function renderCiclos() {
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

    // Esperar el render para garantizar DOM con altura final
    // (renderCiclosCompleta y renderCiclosPapelera son async).
    if (vistaHistorial === 'compacta') {
        renderCiclosCompacta(divCiclos);
    } else if (vistaHistorial === 'papelera') {
        await renderCiclosPapelera(divCiclos);
    } else {
        await renderCiclosCompleta(divCiclos);
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
                        <span style="color:#64748b; font-size:0.82rem;">${formatearProgresoCiclo(c)}</span>
                        ${c.estado === 'activo' ? `
                        <button class="btn-accion-mini" style="background:#dbeafe; color:#2563eb; border-color:#bfdbfe;"
                                onclick="registrarSesionCiclo(${c.id})">📝 Registrar</button>
                        <button class="btn-accion-mini" style="background:#fff1f2; color:#e11d48; border-color:#fecdd3;"
                                onclick="registrarInasistenciaCiclo(${c.id}, ${fichaData.id})">❌ Inasistencia</button>` : ''}
                        ${c.estado === 'activo' ? `
                        <button class="btn-accion-mini" id="btn-eliminar-ciclo-${c.id}"
                                style="background:#fff1f2; color:#e11d48; border-color:#fecdd3;"
                                onclick="toggleModoEliminacion(${c.id})">🗑️ Eliminar</button>` : ''}
                        <button class="btn-accion-mini btn-menu-ciclo"
                                onclick="abrirMenuCiclo(event, ${c.id}, ${numCiclo})"
                                title="Más opciones">⠇</button>
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
    await refrescarFichaPreservandoUI();
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
        // Registrar el ciclo como abierto en el Set para preservación entre refrescos.
        // window._cicloAbierto (singular) se mantiene por compatibilidad: lo usa
        // guardarIngresoCompleto para reabrir tras guardar.
        window._ciclosAbiertos.add(cicloId);
        window._cicloAbierto = cicloId;
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
        // Desregistrar del Set al colapsar.
        window._ciclosAbiertos.delete(cicloId);
        window._cicloAbierto = null;
        contenedor.style.display = 'none';
        flecha.textContent = '▶';
    }
}

// ===========================================
// MODO ELIMINACIÓN CON CHECKBOXES
// ===========================================

// modoEliminacionActivo → declarado en ficha/state.js

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
    // refrescarFichaPreservandoUI re-expande automáticamente los ciclos que
    // estaban abiertos (incluido el actual si lo estaba), gracias al Set global.
    await refrescarFichaPreservandoUI();
}

// Elimina el ciclo completo y todas sus sesiones
async function eliminarCicloCompleto(cicloId) {
    const res = await fetch(`${API}/ciclos/${cicloId}/eliminar`, { method: 'DELETE' });
    if (res.ok) {
        alert("✅ Ciclo eliminado completamente.");
        // El ciclo ya no existe; el helper omitirá re-expandirlo (Set tolerante).
        await refrescarFichaPreservandoUI();
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
        await refrescarFichaPreservandoUI();
    }
}

// ===========================================
// MENÚ CONTEXTUAL DEL CICLO (⠇)
// Pensado para crecer: hoy solo "Eliminar ciclo", a futuro
// agregar "Reabrir ciclo" (Fase 1 ítem 3), "Cerrar ciclo" (ítem 4),
// "Ver informe" (Fase 3), etc.
// ===========================================

function abrirMenuCiclo(event, cicloId, numeroCiclo) {
    event.stopPropagation();

    // Cerrar cualquier menú abierto previo
    const existente = document.getElementById('menu-ciclo-popup');
    if (existente) { existente.remove(); return; }

    // Buscar el ciclo en fichaData para decidir qué opciones mostrar
    const ciclo = fichaData.ciclos.find(c => c.id === cicloId);
    const estado = ciclo ? ciclo.estado : null;

    // Construir opciones según estado
    const opciones = [];
    if (estado === 'activo') {
        opciones.push(`
            <div class="menu-ciclo-opcion"
                 onclick="abrirModalCerrarCiclo(${cicloId}, ${numeroCiclo})">
                📋 Cerrar ciclo
            </div>
        `);
    }
    if (estado === 'cerrado') {
        opciones.push(`
            <div class="menu-ciclo-opcion"
                 onclick="abrirModalVerCierre(${cicloId}, ${numeroCiclo})">
                👁 Ver cierre
            </div>
        `);
        opciones.push(`
            <div class="menu-ciclo-opcion"
                 onclick="solicitarReabrirCiclo(${cicloId}, ${numeroCiclo})">
                🔓 Reabrir ciclo
            </div>
        `);
    }
    opciones.push(`
        <div class="menu-ciclo-opcion menu-ciclo-peligro"
             onclick="solicitarEliminacionCicloCompleto(${cicloId}, ${numeroCiclo})">
            ⛔ Eliminar ciclo completo
        </div>
    `);

    const menu = document.createElement('div');
    menu.id = 'menu-ciclo-popup';
    menu.className = 'menu-ciclo-popup';
    menu.innerHTML = opciones.join('');
    document.body.appendChild(menu);

    // Posicionar con position:fixed (mismo patrón que ítem 2)
    const rectBoton = event.target.getBoundingClientRect();
    const anchoMenu = menu.offsetWidth;
    const altoMenu = menu.offsetHeight;
    const margen = 8;

    let left = rectBoton.right - anchoMenu;
    if (left < margen) left = margen;
    if (left + anchoMenu > window.innerWidth - margen) {
        left = window.innerWidth - anchoMenu - margen;
    }

    let top = rectBoton.bottom + 4;
    if (top + altoMenu > window.innerHeight - margen) {
        top = rectBoton.top - altoMenu - 4;
    }

    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;

    setTimeout(() => {
        document.addEventListener('click', () => {
            const m = document.getElementById('menu-ciclo-popup');
            if (m) m.remove();
        }, { once: true });
    }, 0);
}

// Pide al backend resumen + bloqueadores, muestra primer confirm() con detalles,
// luego segundo prompt() pidiendo escribir 'ELIMINAR CICLO N'.
async function solicitarEliminacionCicloCompleto(cicloId, numeroCiclo) {
    // Cerrar el menú contextual
    const m = document.getElementById('menu-ciclo-popup');
    if (m) m.remove();

    // 1. Consultar resumen al backend
    let resumen;
    try {
        const res = await fetch(`${API}/ciclos/${cicloId}/resumen-eliminacion`);
        if (!res.ok) throw new Error("No se pudo consultar el ciclo");
        resumen = await res.json();
    } catch (e) {
        alert("❌ No se pudo consultar el ciclo. Intenta de nuevo.");
        return;
    }

    // 2. Si hay bloqueadores, mostrarlos y abortar
    if (!resumen.puede_eliminar) {
        const msgs = resumen.bloqueadores.map(b => `• ${b.mensaje}`).join('\n\n');
        alert(`⛔ No se puede eliminar el ciclo ${numeroCiclo}:\n\n${msgs}`);
        return;
    }

    // 3. Primer confirm: detalles de lo que se eliminará
    const estadoLabel = resumen.estado === 'activo' ? 'Activo' : (resumen.estado === 'cerrado' ? 'Cerrado' : resumen.estado);
    const detalles = [
        `Ciclo ${numeroCiclo} (${estadoLabel})${resumen.fecha_inicio ? ' iniciado el ' + resumen.fecha_inicio : ''}`,
        resumen.anamnesis ? `Anamnesis del ciclo` : null,
        resumen.objetivos > 0 ? `${resumen.objetivos} objetivo${resumen.objetivos > 1 ? 's' : ''}` : null,
        resumen.indicadores > 0 ? `${resumen.indicadores} indicador${resumen.indicadores > 1 ? 'es' : ''}` : null,
        resumen.sesiones > 0 ? `${resumen.sesiones} sesion${resumen.sesiones > 1 ? 'es' : ''} (incluye inasistencias)` : null,
        resumen.evaluaciones > 0 ? `${resumen.evaluaciones} evaluación${resumen.evaluaciones > 1 ? 'es' : ''} de indicadores` : null,
        resumen.reservas_liberables > 0 ? `${resumen.reservas_liberables} reserva${resumen.reservas_liberables > 1 ? 's' : ''} se liberará${resumen.reservas_liberables > 1 ? 'n' : ''} (volverán a "confirmada")` : null
    ].filter(Boolean);

    const mensaje1 = `⚠️ ELIMINAR CICLO COMPLETO\n\nSe eliminará permanentemente:\n• ${detalles.join('\n• ')}\n\nEsta acción NO se puede deshacer.\n\n¿Continuar al paso de confirmación?`;
    if (!confirm(mensaje1)) return;

    // 4. Segundo paso: pedir escribir exactamente "ELIMINAR CICLO N"
    const palabraEsperada = `ELIMINAR CICLO ${numeroCiclo}`;
    const ingresado = prompt(`Para confirmar la eliminación, escribe exactamente:\n\n${palabraEsperada}`);
    if (ingresado === null) return; // canceló
    if (ingresado.trim() !== palabraEsperada) {
        alert("❌ Texto de confirmación incorrecto. Eliminación cancelada.");
        return;
    }

    // 5. Ejecutar eliminación
    try {
        const res = await fetch(`${API}/ciclos/${cicloId}/eliminar`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(`❌ ${err.detail || 'Error al eliminar el ciclo.'}`);
            return;
        }
        const data = await res.json();
        const e = data.eliminados || {};
        const resumenExito = [
            `Ciclo ${numeroCiclo} eliminado correctamente.`,
            e.sesiones ? `${e.sesiones} sesion${e.sesiones > 1 ? 'es' : ''}` : null,
            e.anamnesis ? `1 anamnesis` : null,
            e.objetivos ? `${e.objetivos} objetivo${e.objetivos > 1 ? 's' : ''}` : null,
            e.indicadores ? `${e.indicadores} indicador${e.indicadores > 1 ? 'es' : ''}` : null,
            e.reservas_liberadas ? `${e.reservas_liberadas} reserva${e.reservas_liberadas > 1 ? 's' : ''} liberada${e.reservas_liberadas > 1 ? 's' : ''}` : null
        ].filter(Boolean);
        alert(`✅ ${resumenExito.join('\n')}`);

        // El ciclo ya no existe en el Set tras refresh; el helper es tolerante.
        await refrescarFichaPreservandoUI();
    } catch (e) {
        alert("❌ Error de conexión al eliminar el ciclo.");
    }
}

// Reabrir ciclo cerrado: confirmación simple + llamada al backend.
// No requiere prompt() porque la acción es completamente reversible
// (basta con cerrar de nuevo el ciclo desde la opción "📋 Cerrar ciclo"
// que se implementará en el ítem 4).
async function solicitarReabrirCiclo(cicloId, numeroCiclo) {
    // Cerrar el menú contextual
    const m = document.getElementById('menu-ciclo-popup');
    if (m) m.remove();

    const ciclo = fichaData.ciclos.find(c => c.id === cicloId);
    if (!ciclo) {
        alert("❌ No se encontró el ciclo. Recarga la página.");
        return;
    }

    // Construir mensaje contextual
    const partes = [
        `🔓 REABRIR CICLO ${numeroCiclo}`,
        '',
        'El ciclo volverá a estado "Activo" y podrás registrar sesiones nuevamente.'
    ];

    if (ciclo.fecha_cierre || ciclo.motivo_cierre) {
        partes.push('');
        partes.push('La información del cierre previo se conservará como historial clínico:');
        if (ciclo.fecha_cierre)  partes.push(`• Fecha de cierre: ${ciclo.fecha_cierre}`);
        if (ciclo.motivo_cierre) partes.push(`• Motivo: ${ciclo.motivo_cierre}`);
    }

    partes.push('');
    partes.push('¿Confirmar reapertura?');

    if (!confirm(partes.join('\n'))) return;

    try {
        const res = await fetch(`${API}/ciclos/${cicloId}/reabrir`, { method: 'PUT' });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(`❌ ${err.detail || 'Error al reabrir el ciclo.'}`);
            return;
        }

        const data = await res.json();
        const mensaje = data.tenia_cierre_previo
            ? `✅ Ciclo ${numeroCiclo} reabierto.\n\nCierre previo conservado como historial (${data.fecha_cierre_previa}).`
            : `✅ Ciclo ${numeroCiclo} reabierto correctamente.`;
        alert(mensaje);

        await refrescarFichaPreservandoUI();
    } catch (e) {
        alert("❌ Error de conexión al reabrir el ciclo.");
    }
}
// ===========================================
// F4 — CIERRE DE CICLO CON MOTIVO
// ===========================================

// Abre el modal de cierre y carga el panel-resumen desde el backend.
async function abrirModalCerrarCiclo(cicloId, numeroCiclo) {
    // Cerrar el menú contextual si está abierto
    const m = document.getElementById('menu-ciclo-popup');
    if (m) m.remove();

    const modal = document.getElementById('modal-cerrar-ciclo');
    modal.dataset.cicloId = cicloId;
    modal.dataset.numeroCiclo = numeroCiclo;
    modal.dataset.modoLectura = 'false';

    // Restaurar modo edición (por si el modal quedó en modo lectura antes)
    document.querySelectorAll('input[name="cerrar-motivo"]').forEach(r => r.disabled = false);
    document.getElementById('cerrar-ciclo-fecha').disabled = false;
    document.getElementById('cerrar-ciclo-observacion').disabled = false;
    restaurarBotonesModalCierre();

    document.getElementById('cerrar-ciclo-titulo').textContent = `📋 Cerrar ciclo ${numeroCiclo}`;
    // Reset de campos
    document.querySelectorAll('input[name="cerrar-motivo"]').forEach(r => r.checked = false);
    document.querySelectorAll('.cerrar-ciclo-sugerido').forEach(s => s.style.display = 'none');
    document.getElementById('cerrar-ciclo-observacion').value = '';
    document.getElementById('cerrar-ciclo-fecha').value = new Date().toISOString().split('T')[0];
    document.getElementById('cerrar-ciclo-resumen-datos').innerHTML =
        '<p style="color:#94a3b8; font-size:0.85rem;">Cargando resumen…</p>';

    modal.style.display = 'flex';

    // Cargar resumen del ciclo
    try {
        const res = await fetch(`${API}/ciclos/${cicloId}/resumen-cierre`);
        if (!res.ok) throw new Error("Error cargando resumen");
        const r = await res.json();
        renderResumenCierre(r);

        // Preseleccionar motivo sugerido (Decisión 1: opción A)
        if (r.motivo_sugerido) {
            const radio = document.querySelector(
                `input[name="cerrar-motivo"][value="${r.motivo_sugerido}"]`
            );
            if (radio) radio.checked = true;
            const badge = document.querySelector(
                `.cerrar-ciclo-sugerido[data-motivo="${r.motivo_sugerido}"]`
            );
            if (badge) badge.style.display = 'inline-block';
        }
    } catch (e) {
        document.getElementById('cerrar-ciclo-resumen-datos').innerHTML =
            '<p style="color:#dc2626; font-size:0.85rem;">No se pudo cargar el resumen. Podés cerrar el ciclo igualmente.</p>';
    }
}

// Pinta el panel-resumen con los datos del backend.
function renderResumenCierre(r) {
    const fila = (label, valor) => `
        <div style="display:flex; justify-content:space-between; padding:3px 0;">
            <span style="color:#64748b;">${label}</span>
            <b style="color:#1e293b;">${valor}</b>
        </div>`;

    let progreso = '—';
    if (r.sesiones_planificadas) {
        const pct = r.progreso_porcentaje != null ? ` (${r.progreso_porcentaje}%)` : '';
        progreso = `${r.sesiones_realizadas}/${r.sesiones_planificadas}${pct}`;
    } else {
        progreso = `${r.sesiones_realizadas} (sin plan definido)`;
    }

    const dur = r.duracion_dias != null ? `${r.duracion_dias} días` : '—';

    document.getElementById('cerrar-ciclo-resumen-datos').innerHTML =
        fila('Iniciado', r.fecha_inicio || '—') +
        fila('Duración', dur) +
        fila('Sesiones realizadas', r.sesiones_realizadas) +
        fila('Sesiones planificadas', r.sesiones_planificadas != null ? r.sesiones_planificadas : 'No definido') +
        fila('Inasistencias', r.inasistencias) +
        fila('Progreso', progreso);
}

// Restaura los botones del modal a su estado de modo-cierre (edición).
// Necesario porque el modo lectura oculta "Cerrar ciclo" y renombra "Cancelar".
function restaurarBotonesModalCierre() {
    const modal = document.getElementById('modal-cerrar-ciclo');
    const botones = modal.querySelectorAll('.modal-content > div:last-child button');
    if (botones.length >= 2) {
        botones[0].textContent = 'Cancelar';
        botones[1].style.display = '';
    }
}

// ===========================================
// Tema 3 — Ver cierre de ciclo (modo solo lectura)
// Reutiliza el modal de cierre, deshabilitado, mostrando los
// datos guardados del cierre (motivo, fecha, observación).
// ===========================================
async function abrirModalVerCierre(cicloId, numeroCiclo) {
    const m = document.getElementById('menu-ciclo-popup');
    if (m) m.remove();

    const modal = document.getElementById('modal-cerrar-ciclo');
    modal.dataset.cicloId = cicloId;
    modal.dataset.numeroCiclo = numeroCiclo;
    modal.dataset.modoLectura = 'true';

    document.getElementById('cerrar-ciclo-titulo').textContent =
        `📋 Cierre del ciclo ${numeroCiclo}`;

    // Reset visual + restaurar a editable primero (limpia estado previo)
    document.querySelectorAll('input[name="cerrar-motivo"]').forEach(r => {
        r.checked = false;
        r.disabled = false;
    });
    document.querySelectorAll('.cerrar-ciclo-sugerido').forEach(s => s.style.display = 'none');
    document.getElementById('cerrar-ciclo-fecha').disabled = false;
    document.getElementById('cerrar-ciclo-observacion').disabled = false;
    document.getElementById('cerrar-ciclo-observacion').value = '';
    document.getElementById('cerrar-ciclo-fecha').value = '';
    document.getElementById('cerrar-ciclo-resumen-datos').innerHTML =
        '<p style="color:#94a3b8; font-size:0.85rem;">Cargando…</p>';
    restaurarBotonesModalCierre();

    modal.style.display = 'flex';

    try {
        const res = await fetch(`${API}/ciclos/${cicloId}/resumen-cierre`);
        if (!res.ok) throw new Error("Error cargando cierre");
        const r = await res.json();
        renderResumenCierre(r);  // reutiliza el helper de F4b

        if (r.motivo_cierre) {
            const radio = document.querySelector(
                `input[name="cerrar-motivo"][value="${r.motivo_cierre}"]`
            );
            if (radio) radio.checked = true;
        }
        if (r.fecha_cierre) {
            document.getElementById('cerrar-ciclo-fecha').value = r.fecha_cierre;
        }
        document.getElementById('cerrar-ciclo-observacion').value =
            r.observacion_cierre || '';
    } catch (e) {
        document.getElementById('cerrar-ciclo-resumen-datos').innerHTML =
            '<p style="color:#dc2626; font-size:0.85rem;">No se pudo cargar la información del cierre.</p>';
    }

    // Modo lectura: deshabilitar controles (después de poblarlos)
    document.querySelectorAll('input[name="cerrar-motivo"]').forEach(r => r.disabled = true);
    document.getElementById('cerrar-ciclo-fecha').disabled = true;
    document.getElementById('cerrar-ciclo-observacion').disabled = true;

    // Botones: "Cancelar" pasa a "Cerrar", ocultar "Cerrar ciclo"
    const botones = modal.querySelectorAll('.modal-content > div:last-child button');
    if (botones.length >= 2) {
        botones[0].textContent = 'Cerrar';
        botones[1].style.display = 'none';
    }
}

function cerrarModalCerrarCiclo() {
    const modal = document.getElementById('modal-cerrar-ciclo');
    modal.style.display = 'none';
    modal.dataset.cicloId = '';
    modal.dataset.numeroCiclo = '';
}

// Envía el PUT /ciclos/{id}/cerrar. Sin confirm extra (Decisión 2: opción A).
async function confirmarCerrarCiclo() {
    const modal = document.getElementById('modal-cerrar-ciclo');
    const cicloId = parseInt(modal.dataset.cicloId);
    const numeroCiclo = modal.dataset.numeroCiclo;

    const motivoRadio = document.querySelector('input[name="cerrar-motivo"]:checked');
    const fecha = document.getElementById('cerrar-ciclo-fecha').value;
    const observacion = document.getElementById('cerrar-ciclo-observacion').value.trim();

    // Validaciones mínimas
    if (!motivoRadio) {
        alert("⚠️ Seleccioná un motivo de cierre.");
        return;
    }
    if (!fecha) {
        alert("⚠️ Indicá la fecha de cierre.");
        return;
    }

    try {
        const res = await fetch(`${API}/ciclos/${cicloId}/cerrar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                motivo: motivoRadio.value,
                fecha_cierre: fecha,
                observacion: observacion || null
            })
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            alert(`❌ ${err.detail || 'No se pudo cerrar el ciclo.'}`);
            return;
        }

        alert(`✅ Ciclo ${numeroCiclo} cerrado correctamente.`);
        cerrarModalCerrarCiclo();
        await refrescarFichaPreservandoUI();
    } catch (e) {
        alert("❌ Error de conexión al cerrar el ciclo.");
    }
}