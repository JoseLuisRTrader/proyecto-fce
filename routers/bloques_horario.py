from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
import models, schemas

router = APIRouter(
    prefix="/bloques_horario",
    tags=["Bloques_horario"]
)

@router.post("/bloques", response_model=schemas.BloqueHorarioRespuesta)
def crear_bloque(bloque: schemas.BloqueHorarioCrear, db: Session = Depends(get_db)):
    nuevo_bloque = models.BloqueHorario(**bloque.dict())
    db.add(nuevo_bloque)
    db.commit()
    db.refresh(nuevo_bloque)
    return nuevo_bloque

@router.get("/bloques", response_model=list[schemas.BloqueHorarioRespuesta])
def listar_bloques(db: Session = Depends(get_db)):
    return db.query(models.BloqueHorario).all()

@router.get("/bloques/disponibles", response_model=list[schemas.BloqueHorarioRespuesta])
def bloques_disponibles(db: Session = Depends(get_db)):
    return db.query(models.BloqueHorario).filter(
        models.BloqueHorario.disponible == True
    ).all()