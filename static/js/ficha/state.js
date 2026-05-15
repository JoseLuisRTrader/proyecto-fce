// ===========================================
// ficha/state.js — Estado global compartido + helpers de UI
// CARGAR PRIMERO, antes de los demás módulos de ficha
// ===========================================

// --- Identificador del usuario activo (extraído de la URL) ---
const usuarioId = window.location.pathname.split('/').pop();

// --- Datos completos de la ficha cargados desde el backend ---
let fichaData = null;

// --- Vista actual del historial: 'compacta' | 'completa' | 'papelera' ---
let vistaHistorial = 'compacta';

// --- Sesión activa en modales (sesión normal o ingreso) ---
let sesionActivaId = null;
let sesionData = null;

// --- Inasistencia activa en el modal de inasistencia ---
let sesionInasistenciaId = null;

// --- Modo eliminación masiva por ciclo (mapa cicloId → bool) ---
let modoEliminacionActivo = {};

// --- Estado UI preservable entre refrescos ---
// Set de cicloIds actualmente expandidos en el historial.
// Se asigna sobre window para sobrevivir entre módulos.
window._ciclosAbiertos = window._ciclosAbiertos || new Set();

// ===========================================
// HELPERS DE PRESERVACIÓN DE UI
// Capturan/restauran lo que el usuario tenía a la vista antes de un refresh.
// Patrón: en vez de llamar await cargarFicha() directo, usar
// await refrescarFichaPreservandoUI() para que el usuario no pierda contexto.
// ===========================================

// Captura el estado visible actual (scroll, ciclos abiertos, vista)
function capturarEstadoUI() {
    return {
        scrollY: window.scrollY,
        ciclosAbiertos: new Set(window._ciclosAbiertos), // copia defensiva
        vista: vistaHistorial,
    };
}

// Restaura el estado capturado tras un refresh.
// Tolerante: si algo desapareció (ej. ciclo eliminado), lo omite sin error.
async function restaurarEstadoUI(snapshot) {
    if (!snapshot) return;

    // 1. Re-expandir los ciclos que estaban abiertos.
    // toggleCiclo está definido en ciclos.js y hace fetch+render.
    for (const cicloId of snapshot.ciclosAbiertos) {
        const flecha = document.getElementById(`flecha-ciclo-${cicloId}`);
        if (!flecha) {
            // El ciclo ya no existe (fue eliminado). Limpiar del Set global.
            window._ciclosAbiertos.delete(cicloId);
            continue;
        }
        // Solo expandir si está cerrado actualmente
        const contenedor = document.getElementById(`sesiones-ciclo-${cicloId}`);
        if (contenedor && contenedor.style.display === 'none') {
            try { await toggleCiclo(cicloId); } catch (e) {}
        }
    }

    // 2. Restaurar scroll. Clamp al alto real del documento por si encoge.
    requestAnimationFrame(() => {
        const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        window.scrollTo(0, Math.min(snapshot.scrollY, maxScroll));
    });
}

// Refresca la ficha completa pero preserva la UI visible.
// Usar SIEMPRE en lugar de cargarFicha() cuando el usuario ya está en la página.
// (Excepción: la carga inicial en core.js#DOMContentLoaded usa cargarFicha directo).
async function refrescarFichaPreservandoUI() {
    const snapshot = capturarEstadoUI();
    await cargarFicha(); // definido en core.js
    await restaurarEstadoUI(snapshot);
}
