from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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

@router.get("/ciclo/{ciclo_id}", response_model=AnamnesisRespuesta)
def obtener_anamnesis(ciclo_id: int, db: Session = Depends(get_db)):
    anamnesis = db.query(Anamnesis).filter(Anamnesis.ciclo_id == ciclo_id).first()
    if not anamnesis:
        raise HTTPException(status_code=404, detail="Anamnesis no encontrada")
    return anamnesis