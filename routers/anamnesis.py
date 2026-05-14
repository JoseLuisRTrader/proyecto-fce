from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models import Anamnesis
from schemas import AnamnesisCrear, AnamnesisRespuesta

router = APIRouter(
    prefix="/anamnesis",
    tags=["Anamnesis"]
)

@router.post("/", response_model=AnamnesisRespuesta)
def guardar_anamnesis(datos: AnamnesisCrear, db: Session = Depends(get_db)):
    existente = db.query(Anamnesis).filter(Anamnesis.ciclo_id == datos.ciclo_id).first()
    if existente:
        for campo, valor in datos.dict().items():
            setattr(existente, campo, valor)
        db.commit()
        db.refresh(existente)
        return existente
    nueva = Anamnesis(**datos.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/ciclo/{ciclo_id}", response_model=Optional[AnamnesisRespuesta])
def obtener_anamnesis(ciclo_id: int, db: Session = Depends(get_db)):
    # Devuelve None (200 OK + null) si no existe — "ausencia" no es "error".
    # El frontend valida si el cuerpo es null antes de usar los campos.
    return db.query(Anamnesis).filter(Anamnesis.ciclo_id == ciclo_id).first()