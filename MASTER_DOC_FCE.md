# MASTER_DOC — FCE Project
> Documentación técnica para continuidad de desarrollo
> Generado: Mayo 2026 · **Última actualización: Fase 1 ítems 3 y 4 completos**

---

## 1. Estado Actual del Proyecto

**Estado general:** En desarrollo activo. Estable para uso clínico básico. Fase 0 completada.

**Último punto funcional alcanzado:**
- Fase 0 completa, Fase 1 ítems 1, 1.1, 1.2, 2, 3 y 4 completas
- Vista completa con header de ciclo activo (Registrar + Inasistencia)
- ficha_usuario.js refactorizado en 5 módulos bajo static/js/ficha/
- Preservación de UI (scroll + ciclos abiertos) entre refrescos
- Eliminación de ciclo completo con doble confirmación + bloqueo por cobros/informes
- Reabrir ciclo cerrado (conserva historial de cierre como trazabilidad)
- Cierre de ciclo con motivo + plan terapéutico (sesiones planificadas,
  progreso X/Y, sugerencia de cierre al completar plan, ver cierre en lectura)
- Creación de ciclo lazy: el ciclo nace al guardar el ingreso, no al abrir
  el modal (elimina ciclos fantasma)

**Componentes terminados:**
- Login con JWT simple (localStorage)
- Dashboard: resumen, alerta pendientes, próximos días
- Página Registro: sesiones hoy + pendientes + estadísticas + inasistencias
- Módulo Usuarios: tabla/cards/compacta, filtros, nuevo usuario, foto, editar
- Ficha Usuario: header sticky, datos personales, historial ciclos (compacta/completa/papelera)
- Modal Ingreso: anamnesis, plan terapéutico, clínico, registro sesión
- Modal Sesión normal: registro + indicadores
- Modal Inasistencia: ver/eliminar/convertir
- Modal Editar Usuario: compartido entre ficha y lista (utils.js como fuente única)
- utils.js: funciones compartidas (API, ESTADOS, diagnósticos, medicamentos, editar usuario, refrescarVistaUsuario)
- Vista Papelera: toggle 3 botones, días restantes, restauración individual
- Soft delete completo: etiqueta ↩️ recuperada (Opción C2, limpia al guardar)
- Inasistencia desde ficha: Opción C (con reserva vincula, sin reserva crea libre)
- Alerta pendientes: contextual por fecha (hoy vs anteriores vs sin pendiente)
- Botón ✨ Iniciar primer/nuevo ciclo cuando no hay ciclo activo
- Vista completa: botón 🗑️ eliminar por sesión + label correcto de inasistencias
- Reabrir ciclo cerrado: opción "🔓 Reabrir ciclo" en menú ⠇ (Fase 1, ítem 3)
- Cierre de ciclo: modal con resumen + motivo + plan terapéutico (Fase 1, ítem 4)
- Plan terapéutico: campo sesiones_planificadas, progreso X/Y en compacta,
  "Sesión N de M" en modal registro, input en modal ingreso
- Ver cierre de ciclo en modo lectura (reusa modal de cierre, menú ⠇)

**Componentes parciales:**
- Sección informes en ficha: definido, NO implementado (Fase 3)
- Modal cerrar ciclo: panel resumen básico; panel clínico completo
  (objetivos + indicadores + evolución) pendiente (deuda de diseño post-MVP)
- CSS modal cerrar ciclo: funcional pero a compactar en reestructuración
  general de modales (decisión consciente, postergado)

**Componentes no iniciados:**
- Agenda, Finanzas, Deploy, Pre-informe automático

---

## 2. Objetivo del Sistema

**Problema:** Sistema de Ficha Clínica Electrónica (FCE) para profesional de Terapia Ocupacional independiente.

**Casos de uso principales:**
1. Registro de sesiones clínicas diarias
2. Gestión de ciclos de tratamiento por usuario
3. Seguimiento de objetivos e indicadores de logro
4. Historial clínico completo por usuario
5. Registro financiero de cobros por sesión
6. Generación de informes clínicos (pendiente)

**Usuario objetivo actual:** Único profesional (Terapeuta Ocupacional), propietario del sistema.

**Horizonte multiprofesional/SaaS:** Lejano (>6 meses). Solo guardrail activo: no introducir nuevos profesional_id=1 hardcodeados.

---

## 3. Arquitectura General

**Patrón:** MVC simplificado, monolito, REST API + HTML vanilla.

```
Browser → FastAPI (templates Jinja2) → HTML
Browser → FastAPI (REST API) → SQLite
```

**Estructura:**
```
proyecto_fce/
  main.py, models.py, schemas.py, database.py, crear_bd.py, seed_master_v2.py, fce.db
  routers/
    usuarios.py, profesionales.py, ciclos.py, sesiones.py, objetivos.py
    indicadores.py, anamnesis.py, diagnosticos.py, medicamentos.py
    dashboard.py, finanzas.py, informes.py, bloques_horario.py, reservas.py
  static/
  css/style.css
  js/
    utils.js                ← funciones compartidas (cargar PRIMERO)
    main.js, registro.js, usuarios.js
    ficha_usuario.js        ← placeholder (eliminable, ~14 líneas)
    ficha/
      state.js              ← estado global + helpers de preservación UI
      core.js               ← carga, render, alerta pendientes, cambio estado
      ciclos.js             ← historial 3 vistas, papelera, eliminación masiva, menú ⠇
      sesion.js             ← modal sesión normal, inasistencias, flujo registro
      ingreso.js            ← modal ingreso completo
  fotos/
  templates/
    _menu.html, login.html, dashboard.html, registro.html, usuarios.html, ficha_usuario.html
    partials/
      _modal_editar_ficha.html  ← modal compartido ficha + lista usuarios
      _modal_ingreso.html, _modal_sesion.html, _modal_inasistencia.html
      _modal_atencion.html, _modal_registro.html, _modal_estado.html, _modal_usuario.html
```

---

## 4. Stack Tecnológico

| Tecnología | Propósito | Estado |
|-----------|-----------|--------|
| Python 3.9 | Backend | Activo |
| FastAPI | API REST + Templates | Activo |
| SQLAlchemy | ORM | Activo |
| SQLite | Base de datos | Activo |
| Jinja2 | Templates HTML | Activo |
| HTML/CSS/JS vanilla | Frontend | Activo |
| Pydantic v2 | Validación | Activo |
| uvicorn | Servidor ASGI | Activo |

**Descartados:** React, Vue, Angular, PostgreSQL, Docker, Django.

---

## 5. Modelos de Datos

```python
class Sesion:
    id, ciclo_id, reserva_id (nullable), fecha, numero_sesion
    actividades, materiales, compromisos
    es_ingreso: bool, es_inasistencia: bool
    eliminado: bool, fecha_eliminacion, motivo_eliminacion
    fecha_creacion: DateTime (default=datetime.now)   # orden estable
    recuperado: bool (default=False)                   # marca temporal post-restauración

# Ciclo: añadido sesiones_planificadas (Integer, nullable) — plan terapéutico
#   null = sin plan definido; usado por progreso X/Y y sugerencia de cierre
class Ciclo:
    id, usuario_id, profesional_id, fecha_inicio
    numero_sesiones (contador, sincronizado en crear/eliminar/restaurar)
    sesiones_planificadas: Integer nullable     # meta del plan (ítem 4)
    estado: 'activo' | 'cerrado'
    fecha_cierre, motivo_cierre, observacion_cierre (nullable)

# Resto sin cambios relevantes recientes:
# Profesional, Usuario, BloqueHorario, Reserva
# Anamnesis, Objetivo, IndicadorLogro, EvaluacionIndicador
# Diagnostico, Medicamento, Ingreso, Gasto, Informe
```

---

## 6. Lógica de Negocio Crítica

### detalle-atencion y creación de ciclo
```
GET /usuarios/detalle-atencion/{id}?crear_ciclo=bool
  → SOLO CONSULTA en todos los casos. NUNCA crea ciclo.
  → El parámetro crear_ciclo se mantiene por compatibilidad de firma
    pero a partir del ítem 4 ya NO persiste nada (anti-fantasma).

Creación de ciclo (LAZY — ítem 4):
  → El ciclo se crea recién al guardar el ingreso:
    POST /sesiones/crear-ingreso { usuario_id, ciclo_id?, reserva_id? }
  → Si no llega ciclo_id válido y no hay ciclo activo del usuario,
    crear-ingreso crea el ciclo en la misma transacción que la sesión
    de ingreso. Si ya hay activo, lo reutiliza (no duplica).
  → Cerrar el modal de ingreso sin guardar = NO se crea nada.
  → guardarIngresoCompleto reordenado: crear-ingreso es el paso 1,
    devuelve ciclo_id real; anamnesis/objetivo/plan usan ese id después.

Flujos que consultan detalle-atencion (sin efecto de creación):
  - abrirRegistroFicha(), registrarSesionCiclo()
  - verificarPendienteHoy() y cualquier validación de estado
```

### Estado del usuario
```
Estado = campo visual/estadístico. NO tiene efectos sobre ciclos.
Cambiar estado NUNCA crea ciclo.
Botón Estado: SOLO dentro de la ficha. No en tabla/cards/compacta.
```

### Alerta contextual de pendientes
```
verificarPendienteHoy():
  GET /dashboard/sesiones-pendientes → filtra por usuario_id

  Pendientes HOY    → banner amarillo ⚠️
  Pendientes ANTES  → banner naranja 🕐
  Ambos             → banner amarillo combinado
  Solo futuros      → sin banner
  Ninguno           → sin banner
```

### Inasistencia desde ficha (Opción C)
```
POST /sesiones/crear-inasistencia {ciclo_id, usuario_id}
  Caso A: reserva confirmada hoy → vincula, marca nsp
  Caso B: sin reserva → crea libre sin reserva_id
  Validación: doble inasistencia mismo día → 400
  Solo en ciclos activos.
```

### Sesiones pendientes — detección dual
```
GET /dashboard/sesiones-pendientes:
  Caso A: sesión vinculada por reserva_id con actividades
  Caso B: sesión del usuario en misma fecha sin reserva_id (registrada desde ficha)
  → si Caso B detectado → no aparece en pendientes aunque reserva sea "confirmada"
```

### Soft delete y recuperación
```
Eliminar → eliminado=True, fecha_eliminacion=hoy (30 días en papelera)
Restaurar → recuperado=True, etiqueta ↩️ recuperada visible
Limpiar etiqueta → al hacer PUT /sesiones/{id} (guardar cambios) → recuperado=False
```

---

## 7. APIs y Contratos

```
# Usuarios
GET  /usuarios/detalle-atencion/{id}?crear_ciclo=bool

# Sesiones
POST /sesiones/crear-ingreso        → es_ingreso=True, numero_sesion=1
                                       acepta usuario_id: crea ciclo lazy
                                       si no existe (anti-fantasma, ítem 4)
POST /sesiones/crear-normal         → es_ingreso=False, sesiones 2..N
POST /sesiones/crear-inasistencia   → Opción C
PUT  /sesiones/{id}                 → limpia recuperado si True
DELETE /sesiones/{id}               → soft delete
POST /sesiones/{id}/restaurar       → recuperado=True
GET  /sesiones/por-reserva/{id}     → 200+null (no 404)

# Anamnesis
GET  /anamnesis/ciclo/{id}          → 200+null (no 404)

# Dashboard
GET /dashboard/sesiones-pendientes  → detección dual Caso A + Caso B

# Ciclos (Fase 1 ítems 2, 3, 4 — IMPLEMENTADOS)
GET    /ciclos                      → CicloRespuesta (campos cierre incl.)
GET    /ciclos/{id}                 → idem
GET    /ciclos/usuario/{id}         → lista del usuario
POST   /ciclos                      → crear
GET    /ciclos/{id}/resumen-eliminacion → conteos + bloqueadores (ítem 2)
DELETE /ciclos/{id}/eliminar        → hard delete FK-safe (ítem 2)
PUT    /ciclos/{id}/reabrir         → estado=activo, conserva cierre (ítem 3)
PUT    /ciclos/{id}/cerrar          → motivo + fecha + observación (ítem 4)
PATCH  /ciclos/{id}/plan            → sesiones_planificadas (null=borrar)
GET    /ciclos/{id}/resumen-cierre  → resumen + motivo/fecha/observación +
                                       motivo_sugerido (heurística)
# Nota: prefijo limpio /ciclos/... (doble /ciclos/ciclos eliminado, ítem 4)
```

---

## 8. Decisiones Arquitectónicas

| Decisión | Motivo |
|---------|--------|
| utils.js módulo compartido | Fuente única: editar usuario, diag, med, refrescarVistaUsuario |
| Soft delete 30 días | Seguridad clínica |
| Numeración dinámica por fecha | Flexibilidad ante eliminaciones y restauraciones |
| Ciclo solo se crea al Registrar | Estado ≠ inicio tratamiento |
| detalle-atencion con crear_ciclo param | Separar consulta de efecto secundario |
| Alerta pendientes por fecha | UX contextual sin botón fijo |
| Inasistencia Opción C | Independiente de existencia de reserva |
| Modal editar compartido (ficha + lista) | refrescarVistaUsuario detecta contexto |
| Estado usuario solo visual | No acoplado a ciclos ni modales |
| Etiqueta recuperada C2 | Autolimpia al guardar, persiste hasta acción explícita |
| 200+null en vez de 404 para recursos opcionales | "Ausencia" no es "error" |

---

## 9. Pendientes Prioritarios

### Fase 1 — Próxima sesión

### Fase 1 — En curso

1.   ✅ Vista completa con header de ciclo (Fase 1 ítem 1)
1.1. ✅ Refactor de ficha_usuario.js en 5 módulos (Fase 1.1)
1.2. ✅ Preservación de UI entre refrescos (Fase 1.2)
2.   ✅ Eliminar ciclo completo (Fase 1 ítem 2) — menú ⠇ + doble confirmación + bloqueo por cobros/informes
3.   Reabrir ciclo cerrado ← SIGUIENTE
4.   Cierre de ciclo con motivo
5.   Papelera condicional (esconder si vacía)
### Fase 2 — Mejoras estructurales
6. Loading states en fetch (evitar doble-click en guardarIngresoCompleto)
7. Sistema de invalidación de estado en utils.js
8. Centralizar profesional_id en config.py
9. Consolidar registrarSesionCiclo() y abrirRegistroFicha()
10. Diagnósticos/medicamentos modal ingreso → reutilizar utils.js

### Fase 3 — Features nuevas
11. Pre-informe automático al cerrar ciclo
12. Sección informes en ficha
13. Agenda, Finanzas, Deploy

### Fase 4 — SaaS multi-centro (>6 meses)

---

## 10. Riesgos y Deuda Técnica

**Activos:**
- ficha_usuario.js ~1700 líneas → frágil. Siempre `node --check` post-edición.
- Sin autenticación real → localhost only
- Sin migrations → `rm fce.db && python crear_bd.py && python seed_master_v2.py` ante cambios de schema
- profesional_id=1 hardcoded en crear-inasistencia y registrar-inasistencia (no agregar más)

**Deuda técnica:**
- Diagnósticos/medicamentos en modal ingreso no reutilizan utils.js completamente
- Sin loading states → riesgo doble-click en guardarIngresoCompleto (4 requests)
- CSS con clases duplicadas del modal ingreso
- registrarSesionCiclo() y abrirRegistroFicha() con lógica similar
- Vistas compacta/completa/papelera en evaluación estética (prioridad: funcionalidad)
- Menú contextual ⠇: no se reposiciona al redimensionar ventana con el menú abierto.
  Fix de ~5 líneas (resize listener) cuando moleste.

---

## 11. Historial de Cambios Relevantes

1-10. [Cambios previos a Fase 0 — ver versiones anteriores del MASTER_DOC]
11. Campos fecha_creacion + recuperado en Sesion
12. POST /sesiones/crear-normal (fix PUT /sesiones/null)
13. Vista Papelera frontend completa
14. Etiqueta ↩️ recuperada Opción C2
15. Bug 7: editarUsuario → abrirEditarUsuario en utils.js, modal incluido en usuarios.html
16. Bug 1: anamnesis 404 → 200+null
17. Bug 5: dashboard detección dual Caso A + Caso B + código muerto eliminado
18. Bug 6: POST /sesiones/crear-inasistencia Opción C + botón en ficha
19. Bug 2: detalle-atencion con crear_ciclo=bool, estado desacoplado de ciclos
20. Bug 4: botón Estado eliminado de tabla/cards/compacta
21. Bug 4: alerta contextual verificarPendienteHoy() (hoy/anteriores/ninguno)
22. Bug 4: botón ✨ Iniciar primer/nuevo ciclo cuando no hay ciclo activo
23. Bug 3: vista completa con 🗑️ eliminarSesionDirecta + label inasistencias correcto
24. **Fase 0 completada y comiteada a GitHub**
25. Fase 1 ítem 1: vista completa con header de ciclo activo (Registrar + Inasistencia)
26. Fase 1.1: refactor de ficha_usuario.js (1686 líneas) en 5 módulos bajo
    static/js/ficha/ (state, core, ciclos, sesion, ingreso). Eliminadas
    funciones duplicadas (abrirSesion stub, guardarRegistroIngreso v1).
27. Fase 1.2: preservación de UI entre refrescos.
    - Helper refrescarFichaPreservandoUI() en state.js (11 callsites migrados)
    - Set window._ciclosAbiertos para re-expandir ciclos tras refresh
    - cambiarVistaHistorial async + minHeight inteligente para evitar
      parpadeo y saltos de scroll cuando el contenido nuevo es más corto
28. Fase 1 ítem 2: eliminar ciclo completo (hard delete con cascada FK-safe).
    - GET /ciclos/{id}/resumen-eliminacion (conteos + bloqueadores)
    - DELETE /ciclos/{id}/eliminar reescrito: hard delete real
    - Bloqueo si hay ingresos vinculados (409) o informes asociados (409)
    - Reservas vinculadas vuelven a estado "confirmada"
    - Frontend: menú contextual ⠇ con position:fixed, doble confirmación
      (confirm con detalles + prompt escribir "ELIMINAR CICLO N")
29. Fase 1 ítem 3: reabrir ciclo cerrado.
    - PUT /ciclos/{id}/reabrir (valida estado='cerrado' + sin ciclo activo
      paralelo del mismo usuario, 409)
    - Conserva fecha_cierre/motivo_cierre/observacion_cierre como historial
      clínico (decisión: trazabilidad, análogo a Opción C2)
    - Menú ⠇ renderiza opciones condicionalmente según estado del ciclo
30. Fase 1 ítem 4: cierre de ciclo con motivo + plan terapéutico.
    - Modelo: campo sesiones_planificadas (Integer, nullable) → recrear BD
    - Schemas: CicloCerrar, CicloActualizarPlan; CicloRespuesta ampliado
      con sesiones_planificadas/fecha_cierre/motivo_cierre/observacion_cierre
    - Endpoints: PUT /ciclos/{id}/cerrar, PATCH /ciclos/{id}/plan,
      GET /ciclos/{id}/resumen-cierre (resumen + motivo/fecha/observación)
    - Catálogo motivos: cumplimiento, alta_terapeutica, derivacion,
      traslado, abandono, otro
    - F1: progreso X/Y en vista compacta (helper formatearProgresoCiclo)
    - F2: "Sesión N de M · quedan X" en header del modal de registro
    - F3: input sesiones planificadas en modal de ingreso (PATCH al guardar)
    - F4: modal _modal_cerrar_ciclo.html + opción "📋 Cerrar ciclo" en
      menú ⠇ (solo activos) + sugerencia de cierre al completar plan
    - Tema 3: "👁 Ver cierre" en menú ⠇ (solo cerrados), reusa modal en
      modo lectura; reset de modo en abrirModalCerrarCiclo
    - Anti-fantasma: ciclo se crea lazy en POST /sesiones/crear-ingreso
      (acepta usuario_id); detalle-atencion?crear_ciclo ya NO persiste.
      guardarIngresoCompleto reordenado: crear-ingreso primero
    - Fix: detalle-atencion contaba sesiones en papelera (eliminado!=True)
    - Limpieza: doble prefijo /ciclos/ciclos eliminado en routers/ciclos.py
    - UX: ciclo cerrado en compacta solo muestra ⠇ + flecha (sin Registrar/
      Inasistencia/Eliminar — para editar hay que reabrir)
    - Seed: sesiones_planificadas con escenarios variados (Grupo B/C)

---

## 12. NEXT_SESSION_BOOTSTRAP

```markdown
# FCE Project — Bootstrap nuevo chat

## Stack
Python 3.9 + FastAPI + SQLAlchemy + SQLite | HTML/CSS/JS vanilla + Jinja2
Dev: Mac M1 | uvicorn main:app --reload | venv
Credenciales: correo@correo.cl / 1234

## Estado
- FASE 0 COMPLETA (bugs 1-7, comiteados a GitHub)
- FASE 1 ÍTEMS 1, 1.1, 1.2, 2, 3, 4 COMPLETOS:
  - Vista completa con header de ciclo activo (Registrar + Inasistencia)
  - Refactor de ficha_usuario.js → 5 módulos en static/js/ficha/
    (state, core, ciclos, sesion, ingreso)
  - Preservación de UI: scroll + ciclos abiertos + minHeight inteligente
    Helper refrescarFichaPreservandoUI() en state.js
  - Eliminación de ciclo completo: hard delete + cascada FK-safe +
    bloqueo por cobros/informes + doble confirmación
  - Reabrir ciclo cerrado (ítem 3): conserva historial de cierre
  - Cierre de ciclo con motivo + plan terapéutico (ítem 4): modal con
    resumen, sesiones_planificadas, progreso X/Y, "Sesión N de M",
    sugerencia al completar plan, ver cierre en modo lectura
  - Anti-fantasma: ciclo se crea lazy al guardar ingreso, no al abrir modal
  - Menú ⠇ condicional por estado: activo → Cerrar/Eliminar;
    cerrado → Ver cierre/Reabrir/Eliminar ciclo completo

## FASE 1 — Próxima sesión (en orden)

5. Papelera condicional (esconder botón si está vacía)
   → ~10 líneas: condicionar visibilidad del botón "🗑️ Papelera"
     según si hay alguna sesión con eliminado=True para algún ciclo del usuario

## Deuda de diseño post-MVP (cuando se retome, ítem dedicado)

- Modal cerrar ciclo — panel clínico completo: además del resumen básico
  actual, mostrar plan terapéutico, evaluación del objetivo general y
  específicos, evolución de indicadores. Backend resumen-cierre ya devuelve
  objetivos/indicadores/evaluaciones (counts) listos para ampliar.
- De ahí se alimenta el pre-informe automático por ciclo cerrado (Fase 3)
- Compactar/reestructurar CSS de modales (incluye _modal_cerrar_ciclo)

## Archivos clave a tener presente al iniciar

- /static/js/ficha/state.js   (estado global, helpers)
- /static/js/ficha/core.js    (carga inicial, render ficha)
- /static/js/ficha/ciclos.js  (historial, menú ⠇, cierre/reabrir/ver) ← más tocado
- /static/js/ficha/ingreso.js (guardarIngresoCompleto, crear-ingreso lazy)
- /routers/ciclos.py          (cerrar/reabrir/plan/resumen-cierre/eliminar)
- /routers/sesiones.py        (crear-ingreso con creación lazy de ciclo)
- /routers/usuarios.py        (detalle-atencion ya NO crea ciclo)
- /templates/partials/_modal_cerrar_ciclo.html (modo cerrar + modo lectura)

## Advertencias críticas (mantener)

- Cada módulo de ficha/ <520 líneas: si crece mucho, redistribuir
  (ciclos.js ya supera esto tras ítem 4: candidato a redistribuir)
- node --check después de CADA edición a ficha/*.js
  (silencio = OK; usar `&& echo OK` para confirmación visible)
- utils.js carga PRIMERO, después state.js, después el resto en orden
- detalle-atencion SIN ?crear_ciclo=true NO crea ciclo (solo consulta)
  IMPORTANTE: tras ítem 4, detalle-atencion NUNCA crea ciclo (ni con
  crear_ciclo=true). El ciclo se crea en POST /sesiones/crear-ingreso
  (que ahora acepta usuario_id y lo crea lazy si no existe)
- Al cambiar models.py → recrear BD completa
- No agregar nuevos profesional_id=1 hardcodeados
- refrescarFichaPreservandoUI() en lugar de cargarFicha() cuando
  el usuario ya está en la página
- Subir versiones ?v=N en ficha_usuario.html ante cambios de JS
- Hard delete real en /ciclos/{id}/eliminar: orden FK-safe estricto
  (evaluaciones → indicadores → objetivos → anamnesis → sesiones → ciclo)
- Endpoints/queries que cuentan sesiones SIEMPRE filtran eliminado != True
  (papelera no debe contar como sesión realizada)
- Modal _modal_cerrar_ciclo se usa en 2 modos (cerrar/ver): el reset a
  modo edición ocurre en abrirModalCerrarCiclo, NO en cerrarModal
- ciclo_id ≠ usuario_id: al consultar la BD verificar con cuál se filtra
  (fuente recurrente de confusión en validaciones)

## NO replantear

- Stack completo (FastAPI/SQLAlchemy/SQLite/Jinja2/vanilla JS)
- Soft delete 30 días de sesiones individuales | Numeración dinámica | utils.js central
- Opción C inasistencias | Opción C2 etiqueta recuperada
- crear_ciclo param en detalle-atencion
- Estado usuario = solo visual
- 200+null para recursos opcionales (anamnesis, por-reserva)
- Hard delete real (Camino B) para eliminación de ciclo
- Bloqueo defensivo: ciclo con cobros o informes NO se elimina
- Menú contextual ⠇ es el lugar para acciones administrativas del ciclo
- Reabrir conserva motivo/fecha/observación de cierre (trazabilidad)
- Ciclo se crea lazy al guardar ingreso (NUNCA al abrir modal/consultar)
- Plan terapéutico: sesiones_planificadas nullable; vacío = "sin plan"
- Sugerencia de cierre: solo al guardar sesión que cruza el umbral del
  plan; cancelarla no reaparece (no spamea). NO cierre automático
- Ciclo cerrado en compacta: solo lectura (⠇ + flecha). Para editar
  sesiones → reabrir primero
- Horizonte SaaS/multiprofesional: LEJANO (>6 meses)

## Deuda técnica menor (no urgente)

- Menú ⠇ no se reposiciona al redimensionar ventana con menú abierto
- ficha_usuario.js queda como placeholder de 14 líneas (eliminable a futuro)
- Diagnósticos/medicamentos en modal ingreso no reutilizan utils.js completamente