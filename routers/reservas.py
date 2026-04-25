from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
import models, schemas

router = APIRouter(
    prefix="/Reservas",
    tags=["Reservas"]
)

@router.post("/reservas", response_model=schemas.ReservaRespuesta)
def crear_reserva(reserva: schemas.ReservaCrear, db: Session = Depends(get_db)):
    # Verificar que el bloque existe y está disponible
    bloque = db.query(models.BloqueHorario).filter(
        models.BloqueHorario.id == reserva.bloque_horario_id
    ).first()
    if not bloque:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    if not bloque.disponible:
        raise HTTPException(status_code=400, detail="Bloque no disponible")

    # Crear la reserva
    nueva_reserva = models.Reserva(**reserva.dict())
    db.add(nueva_reserva)

    # Marcar bloque como no disponible
    bloque.disponible = False
    db.commit()
    db.refresh(nueva_reserva)
    return nueva_reserva

@router.get("/reservas", response_model=list[schemas.ReservaRespuesta])
def listar_reservas(db: Session = Depends(get_db)):
    return db.query(models.Reserva).all()

@router.get("/reservas/{id}", response_model=schemas.ReservaRespuesta)
def obtener_reserva(id: int, db: Session = Depends(get_db)):
    reserva = db.query(models.Reserva).filter(
        models.Reserva.id == id
    ).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    return reserva