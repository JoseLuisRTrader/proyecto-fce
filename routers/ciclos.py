from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
import models, schemas

router = APIRouter(
    prefix="/ciclos",
    tags=["Ciclos"]
)

@router.post("/ciclos", response_model=schemas.CicloRespuesta)
def crear_ciclo(ciclo: schemas.CicloCrear, db: Session = Depends(get_db)):
    # Verificar que el usuario existe
    usuario = db.query(models.Usuario).filter(
        models.Usuario.id == ciclo.usuario_id
    ).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Verificar que el profesional existe
    profesional = db.query(models.Profesional).filter(
        models.Profesional.id == ciclo.profesional_id
    ).first()
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")

    # Verificar que no hay ciclo activo para este usuario
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
    ciclo = db.query(models.Ciclo).filter(
        models.Ciclo.id == id
    ).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo

@router.get("/ciclos/usuario/{usuario_id}", response_model=list[schemas.CicloRespuesta])
def ciclos_por_usuario(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(models.Ciclo).filter(
        models.Ciclo.usuario_id == usuario_id
    ).all()

@router.get("/{ciclo_id}/sesiones")
def obtener_sesiones_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    sesiones = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id
    ).order_by(models.Sesion.numero_sesion.asc()).all()
    
    return [
        {
            "id": s.id,
            "numero_sesion": s.numero_sesion,
            "fecha": str(s.fecha) if s.fecha else None,
            "actividades": s.actividades,
            "es_ingreso": s.es_ingreso
        } for s in sesiones
    ]