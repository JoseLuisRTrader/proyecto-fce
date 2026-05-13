from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from datetime import date, timedelta

router = APIRouter(
    prefix="/ciclos",
    tags=["Ciclos"]
)

@router.post("/ciclos", response_model=schemas.CicloRespuesta)
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

@router.get("/ciclos", response_model=list[schemas.CicloRespuesta])
def listar_ciclos(db: Session = Depends(get_db)):
    return db.query(models.Ciclo).all()

@router.get("/ciclos/{id}", response_model=schemas.CicloRespuesta)
def obtener_ciclo(id: int, db: Session = Depends(get_db)):
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo

@router.get("/ciclos/usuario/{usuario_id}", response_model=list[schemas.CicloRespuesta])
def ciclos_por_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(models.Ciclo).filter(models.Ciclo.usuario_id == usuario_id).all()

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

@router.delete("/{ciclo_id}/eliminar")
def eliminar_ciclo_completo(ciclo_id: int, db: Session = Depends(get_db)):
    from datetime import timedelta
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # Soft delete de todas las sesiones del ciclo
    sesiones = db.query(models.Sesion).filter(models.Sesion.ciclo_id == ciclo_id).all()
    for s in sesiones:
        s.eliminado = True
        s.fecha_eliminacion = date.today()
        s.motivo_eliminacion = "ciclo eliminado completo"
        if s.reserva_id:
            reserva = db.query(models.Reserva).filter(models.Reserva.id == s.reserva_id).first()
            if reserva:
                reserva.estado = "confirmada"

    # Marcar ciclo como eliminado
    ciclo.estado = "eliminado"
    ciclo.numero_sesiones = 0
    db.commit()
    return {"mensaje": "Ciclo eliminado completamente"}