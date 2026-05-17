from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from datetime import date, timedelta

router = APIRouter(
    prefix="/ciclos",
    tags=["Ciclos"]
)

@router.post("", response_model=schemas.CicloRespuesta)
def crear_ciclo(ciclo: schemas.CicloCrear, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == ciclo.usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    ciclo_activo = db.query(models.Ciclo).filter(
        models.Ciclo.usuario_id == ciclo.usuario_id,
        models.Ciclo.estado == "activo"
    ).first()
    if ciclo_activo:
        raise HTTPException(status_code=400, detail="Usuario ya tiene un ciclo activo")

    nuevo_ciclo = models.Ciclo(**ciclo.dict())
    db.add(nuevo_ciclo)
    db.commit()
    db.refresh(nuevo_ciclo)
    return nuevo_ciclo

@router.get("", response_model=list[schemas.CicloRespuesta])
def listar_ciclos(db: Session = Depends(get_db)):
    return db.query(models.Ciclo).all()

@router.get("/usuario/{usuario_id}", response_model=list[schemas.CicloRespuesta])
def ciclos_por_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(models.Ciclo).filter(models.Ciclo.usuario_id == usuario_id).all()


@router.get("/{id}", response_model=schemas.CicloRespuesta)
def obtener_ciclo(id: int, db: Session = Depends(get_db)):
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo


@router.get("/{ciclo_id}/sesiones")
def obtener_sesiones_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    # Limpiar sesiones con más de 30 días eliminadas
    limite = date.today() - timedelta(days=30)
    db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id,
        models.Sesion.eliminado == True,
        models.Sesion.fecha_eliminacion <= limite
    ).delete()
    db.commit()

    # Obtener sesiones no eliminadas ordenadas por fecha
    sesiones = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id,
        models.Sesion.eliminado != True
    ).order_by(models.Sesion.fecha.asc()).all()

    # Numeración dinámica
    numero = 0
    resultado = []
    for s in sesiones:
        if not s.es_inasistencia:
            numero += 1
        resultado.append({
            "id": s.id,
            "numero_sesion": numero if not s.es_inasistencia else None,
            "fecha": str(s.fecha) if s.fecha else None,
            "actividades": s.actividades,
            "es_ingreso": s.es_ingreso,
            "es_inasistencia": s.es_inasistencia or False,
            "eliminado": s.eliminado or False,
            "recuperado": s.recuperado or False
        })

    return resultado

@router.get("/{ciclo_id}/papelera")
def obtener_papelera_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    # Sesiones eliminadas en los últimos 30 días
    sesiones = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id,
        models.Sesion.eliminado == True
    ).order_by(models.Sesion.fecha_eliminacion.desc()).all()

    hoy = date.today()
    return [
        {
            "id": s.id,
            "numero_sesion": s.numero_sesion,
            "fecha": str(s.fecha) if s.fecha else None,
            "actividades": s.actividades,
            "es_ingreso": s.es_ingreso,
            "fecha_eliminacion": str(s.fecha_eliminacion),
            "dias_restantes": 30 - (hoy - s.fecha_eliminacion).days,
            "motivo_eliminacion": s.motivo_eliminacion
        }
        for s in sesiones
    ]

@router.get("/{ciclo_id}/resumen-eliminacion")
def resumen_eliminacion_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    """
    Devuelve conteos de todo lo que se eliminaría junto con el ciclo,
    y bloqueadores si los hay (ingresos / informes vinculados).
    Usado por el frontend antes del confirm() de la doble confirmación.
    """
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # Conteos de eliminación en cascada (todo se borra hard)
    sesiones_ids = [
        s.id for s in db.query(models.Sesion.id).filter(models.Sesion.ciclo_id == ciclo_id).all()
    ]
    objetivos_ids = [
        o.id for o in db.query(models.Objetivo.id).filter(models.Objetivo.ciclo_id == ciclo_id).all()
    ]
    indicadores_count = 0
    if objetivos_ids:
        indicadores_count = db.query(models.IndicadorLogro).filter(
            models.IndicadorLogro.objetivo_id.in_(objetivos_ids)
        ).count()

    evaluaciones_count = 0
    if sesiones_ids:
        evaluaciones_count = db.query(models.EvaluacionIndicador).filter(
            models.EvaluacionIndicador.sesion_id.in_(sesiones_ids)
        ).count()

    anamnesis_existe = db.query(models.Anamnesis).filter(
        models.Anamnesis.ciclo_id == ciclo_id
    ).first() is not None

    reservas_liberables = 0
    if sesiones_ids:
        reservas_liberables = db.query(models.Sesion).filter(
            models.Sesion.ciclo_id == ciclo_id,
            models.Sesion.reserva_id.isnot(None)
        ).count()

    # Bloqueadores: datos sensibles que requieren acción del profesional ANTES
    ingresos_count = 0
    if sesiones_ids:
        ingresos_count = db.query(models.Ingreso).filter(
            models.Ingreso.sesion_id.in_(sesiones_ids)
        ).count()
    informes_count = db.query(models.Informe).filter(
        models.Informe.ciclo_id == ciclo_id
    ).count()

    bloqueadores = []
    if ingresos_count > 0:
        bloqueadores.append({
            "tipo": "ingresos",
            "count": ingresos_count,
            "mensaje": f"Hay {ingresos_count} cobro{'s' if ingresos_count > 1 else ''} registrado{'s' if ingresos_count > 1 else ''} vinculado{'s' if ingresos_count > 1 else ''} a sesiones de este ciclo. Gestiónalos desde Finanzas antes de eliminar el ciclo."
        })
    if informes_count > 0:
        bloqueadores.append({
            "tipo": "informes",
            "count": informes_count,
            "mensaje": f"Hay {informes_count} informe{'s' if informes_count > 1 else ''} asociado{'s' if informes_count > 1 else ''} a este ciclo. Reasígnalos o elimínalos desde Informes antes de eliminar el ciclo."
        })

    return {
        "ciclo_id": ciclo.id,
        "estado": ciclo.estado,
        "fecha_inicio": str(ciclo.fecha_inicio) if ciclo.fecha_inicio else None,
        "sesiones": len(sesiones_ids),
        "objetivos": len(objetivos_ids),
        "indicadores": indicadores_count,
        "evaluaciones": evaluaciones_count,
        "anamnesis": 1 if anamnesis_existe else 0,
        "reservas_liberables": reservas_liberables,
        "bloqueadores": bloqueadores,
        "puede_eliminar": len(bloqueadores) == 0
    }


@router.delete("/{ciclo_id}/eliminar")
def eliminar_ciclo_completo(ciclo_id: int, db: Session = Depends(get_db)):
    """
    Hard delete del ciclo y todo lo asociado:
    - Indicadores → Objetivos → Anamnesis → Sesiones → Ciclo (orden FK-safe)
    - Evaluaciones de indicadores también
    - Reservas vinculadas: vuelven a estado 'confirmada' (no se eliminan)
    Bloqueado si el ciclo tiene Ingresos o Informes asociados.
    """
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # IDs precalculados para queries en cascada
    sesiones_ids = [
        s.id for s in db.query(models.Sesion.id).filter(models.Sesion.ciclo_id == ciclo_id).all()
    ]
    objetivos_ids = [
        o.id for o in db.query(models.Objetivo.id).filter(models.Objetivo.ciclo_id == ciclo_id).all()
    ]

    # --- Validaciones bloqueantes (datos sensibles) ---
    if sesiones_ids:
        ingresos_count = db.query(models.Ingreso).filter(
            models.Ingreso.sesion_id.in_(sesiones_ids)
        ).count()
        if ingresos_count > 0:
            raise HTTPException(
                status_code=409,
                detail=f"El ciclo tiene {ingresos_count} cobro(s) vinculado(s). Gestiónalos desde Finanzas antes de eliminar el ciclo."
            )

    informes_count = db.query(models.Informe).filter(
        models.Informe.ciclo_id == ciclo_id
    ).count()
    if informes_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"El ciclo tiene {informes_count} informe(s) asociado(s). Reasígnalos o elimínalos desde Informes antes de eliminar el ciclo."
        )

    # --- Conteos para respuesta de éxito ---
    eliminados = {
        "sesiones": len(sesiones_ids),
        "objetivos": len(objetivos_ids),
        "indicadores": 0,
        "evaluaciones": 0,
        "anamnesis": 0,
        "reservas_liberadas": 0
    }

    # --- Liberar reservas (cambiar estado, no eliminar) ---
    if sesiones_ids:
        sesiones_con_reserva = db.query(models.Sesion).filter(
            models.Sesion.ciclo_id == ciclo_id,
            models.Sesion.reserva_id.isnot(None)
        ).all()
        for s in sesiones_con_reserva:
            reserva = db.query(models.Reserva).filter(models.Reserva.id == s.reserva_id).first()
            if reserva:
                reserva.estado = "confirmada"
                eliminados["reservas_liberadas"] += 1

    # --- HARD DELETE en orden FK-safe (hijos antes que padres) ---

    # 1. Evaluaciones de indicadores (FK a sesion_id y indicador_id)
    if sesiones_ids:
        eliminados["evaluaciones"] = db.query(models.EvaluacionIndicador).filter(
            models.EvaluacionIndicador.sesion_id.in_(sesiones_ids)
        ).delete(synchronize_session=False)

    # 2. Indicadores de logro (FK a objetivo_id)
    if objetivos_ids:
        eliminados["indicadores"] = db.query(models.IndicadorLogro).filter(
            models.IndicadorLogro.objetivo_id.in_(objetivos_ids)
        ).delete(synchronize_session=False)

    # 3. Objetivos (FK a ciclo_id)
    db.query(models.Objetivo).filter(
        models.Objetivo.ciclo_id == ciclo_id
    ).delete(synchronize_session=False)

    # 4. Anamnesis (FK a ciclo_id, unique)
    eliminados["anamnesis"] = db.query(models.Anamnesis).filter(
        models.Anamnesis.ciclo_id == ciclo_id
    ).delete(synchronize_session=False)

    # 5. Sesiones (FK a ciclo_id; el FK a reserva_id es nullable, no estorba)
    db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id
    ).delete(synchronize_session=False)

    # 6. Ciclo
    db.delete(ciclo)

    db.commit()

    return {
        "mensaje": "Ciclo eliminado completamente",
        "eliminados": eliminados
    }

@router.put("/{ciclo_id}/reabrir")
def reabrir_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    """
    Reabre un ciclo cerrado, devolviéndolo a estado='activo'.
    Conserva fecha_cierre, motivo_cierre y observacion_cierre como
    historial clínico (trazabilidad: si se cerró por 'abandono' y
    luego se reabre, esa información sigue siendo relevante).

    Bloqueado si:
    - El ciclo no está en estado 'cerrado' (400).
    - El usuario ya tiene otro ciclo activo (409).
    """
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    if ciclo.estado != "cerrado":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden reabrir ciclos cerrados. Estado actual: '{ciclo.estado}'."
        )

    # Validación defensiva: mismo patrón que crear_ciclo
    ciclo_activo_existente = db.query(models.Ciclo).filter(
        models.Ciclo.usuario_id == ciclo.usuario_id,
        models.Ciclo.estado == "activo",
        models.Ciclo.id != ciclo_id
    ).first()
    if ciclo_activo_existente:
        raise HTTPException(
            status_code=409,
            detail="El usuario ya tiene otro ciclo activo. Ciérralo antes de reabrir este."
        )

    ciclo.estado = "activo"
    # NO se limpian fecha_cierre / motivo_cierre / observacion_cierre:
    # se conservan como historial clínico del cierre previo.

    db.commit()
    db.refresh(ciclo)

    return {
        "mensaje": f"Ciclo {ciclo_id} reabierto correctamente",
        "ciclo_id": ciclo.id,
        "estado": ciclo.estado,
        "tenia_cierre_previo": ciclo.fecha_cierre is not None,
        "fecha_cierre_previa": str(ciclo.fecha_cierre) if ciclo.fecha_cierre else None,
        "motivo_cierre_previo": ciclo.motivo_cierre
    }

# ===========================================
# Cierre de ciclo con motivo (Fase 1 ítem 4)
# ===========================================

# Catálogo de motivos válidos (validación defensiva)
MOTIVOS_CIERRE_VALIDOS = {
    "cumplimiento",
    "alta_terapeutica",
    "derivacion",
    "traslado",
    "abandono",
    "otro"
}


@router.put("/{ciclo_id}/cerrar")
def cerrar_ciclo(
    ciclo_id: int,
    datos: schemas.CicloCerrar,
    db: Session = Depends(get_db)
):
    """
    Cierra un ciclo activo con motivo, fecha y observación.
    No elimina datos: el ciclo queda visible como histórico.
    Reabrible posteriormente con PUT /ciclos/{id}/reabrir (ítem 3).
    """
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    if ciclo.estado != "activo":
        raise HTTPException(
            status_code=400,
            detail=f"Solo se pueden cerrar ciclos activos. Estado actual: '{ciclo.estado}'."
        )

    if datos.motivo not in MOTIVOS_CIERRE_VALIDOS:
        raise HTTPException(
            status_code=400,
            detail=f"Motivo inválido. Valores aceptados: {sorted(MOTIVOS_CIERRE_VALIDOS)}"
        )

    ciclo.estado = "cerrado"
    ciclo.fecha_cierre = datos.fecha_cierre
    ciclo.motivo_cierre = datos.motivo
    ciclo.observacion_cierre = datos.observacion

    db.commit()
    db.refresh(ciclo)

    return {
        "mensaje": f"Ciclo {ciclo_id} cerrado correctamente",
        "ciclo_id": ciclo.id,
        "estado": ciclo.estado,
        "motivo": ciclo.motivo_cierre,
        "fecha_cierre": str(ciclo.fecha_cierre),
        "observacion": ciclo.observacion_cierre
    }


@router.patch("/{ciclo_id}/plan")
def actualizar_plan_ciclo(
    ciclo_id: int,
    datos: schemas.CicloActualizarPlan,
    db: Session = Depends(get_db)
):
    """
    Actualiza sesiones_planificadas de un ciclo.
    Acepta None para borrar el plan (volver a 'sin plan definido').
    Solo permitido en ciclos activos.
    """
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    if ciclo.estado != "activo":
        raise HTTPException(
            status_code=400,
            detail="Solo se puede editar el plan de ciclos activos."
        )

    if datos.sesiones_planificadas is not None and datos.sesiones_planificadas < 1:
        raise HTTPException(
            status_code=400,
            detail="sesiones_planificadas debe ser mayor o igual a 1, o null para borrar."
        )

    ciclo.sesiones_planificadas = datos.sesiones_planificadas
    db.commit()
    db.refresh(ciclo)

    return {
        "mensaje": "Plan actualizado",
        "ciclo_id": ciclo.id,
        "sesiones_planificadas": ciclo.sesiones_planificadas
    }


@router.get("/{ciclo_id}/resumen-cierre")
def resumen_cierre_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    """
    Devuelve métricas del ciclo para alimentar el modal de cierre.
    Incluye:
    - Datos básicos: fechas, duración, estado
    - Sesiones: realizadas, inasistencias, planificadas, progreso
    - Estructura clínica: objetivos, indicadores, evaluaciones (para panel futuro)
    """
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # --- Sesiones (no eliminadas) ---
    sesiones_no_borradas = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id,
        models.Sesion.eliminado != True
    ).all()

    sesiones_realizadas = sum(1 for s in sesiones_no_borradas if not s.es_inasistencia)
    inasistencias = sum(1 for s in sesiones_no_borradas if s.es_inasistencia)
    tiene_ingreso = any(s.es_ingreso for s in sesiones_no_borradas)

    # --- Duración ---
    from datetime import date as _date
    hoy = _date.today()
    duracion_dias = None
    if ciclo.fecha_inicio:
        fin = ciclo.fecha_cierre if ciclo.fecha_cierre else hoy
        duracion_dias = (fin - ciclo.fecha_inicio).days

    # --- Progreso (solo si hay plan) ---
    progreso_porcentaje = None
    if ciclo.sesiones_planificadas and ciclo.sesiones_planificadas > 0:
        progreso_porcentaje = round(
            (sesiones_realizadas / ciclo.sesiones_planificadas) * 100, 1
        )

    # --- Estructura clínica (para panel futuro completo) ---
    objetivos = db.query(models.Objetivo).filter(
        models.Objetivo.ciclo_id == ciclo_id
    ).all()
    objetivos_count = len(objetivos)
    objetivos_ids = [o.id for o in objetivos]

    indicadores_count = 0
    evaluaciones_count = 0
    if objetivos_ids:
        indicadores_count = db.query(models.IndicadorLogro).filter(
            models.IndicadorLogro.objetivo_id.in_(objetivos_ids)
        ).count()
        sesiones_ids = [s.id for s in sesiones_no_borradas]
        if sesiones_ids:
            evaluaciones_count = db.query(models.EvaluacionIndicador).filter(
                models.EvaluacionIndicador.sesion_id.in_(sesiones_ids)
            ).count()

    anamnesis_existe = db.query(models.Anamnesis).filter(
        models.Anamnesis.ciclo_id == ciclo_id
    ).first() is not None

    return {
        "ciclo_id": ciclo.id,
        "estado": ciclo.estado,
        "fecha_inicio": str(ciclo.fecha_inicio) if ciclo.fecha_inicio else None,
        "fecha_cierre": str(ciclo.fecha_cierre) if ciclo.fecha_cierre else None,
        "motivo_cierre": ciclo.motivo_cierre,
        "observacion_cierre": ciclo.observacion_cierre,
        "duracion_dias": duracion_dias,
        "tiene_ingreso": tiene_ingreso,
        "tiene_anamnesis": anamnesis_existe,
        # Sesiones
        "sesiones_realizadas": sesiones_realizadas,
        "inasistencias": inasistencias,
        "sesiones_planificadas": ciclo.sesiones_planificadas,
        "progreso_porcentaje": progreso_porcentaje,
        # Estructura clínica (para panel futuro completo)
        "objetivos": objetivos_count,
        "indicadores": indicadores_count,
        "evaluaciones": evaluaciones_count,
        # Sugerencia de motivo según contexto
        "motivo_sugerido": _sugerir_motivo_cierre(
            sesiones_realizadas, ciclo.sesiones_planificadas, inasistencias
        )
    }


def _sugerir_motivo_cierre(realizadas: int, planificadas, inasistencias: int) -> str:
    """
    Heurística simple para sugerir motivo de cierre:
    - Si alcanzó/superó el plan → cumplimiento
    - Si muchas inasistencias relativas → abandono
    - Si no hay plan o caso ambiguo → cumplimiento (más frecuente, se puede cambiar)
    """
    if planificadas and realizadas >= planificadas:
        return "cumplimiento"
    total = realizadas + inasistencias
    if total >= 3 and inasistencias / total >= 0.5:
        return "abandono"
    return "cumplimiento"