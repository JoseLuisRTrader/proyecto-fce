from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Objetivo
from schemas import ObjetivoCrear, ObjetivoRespuesta
from typing import List

router = APIRouter(
    prefix="/objetivos",
    tags=["Objetivos"]
)

@router.post("/", response_model=ObjetivoRespuesta)
def crear_objetivo(objetivo: ObjetivoCrear, db: Session = Depends(get_db)):
    nuevo = Objetivo(**objetivo.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/", response_model=List[ObjetivoRespuesta])
def listar_objetivos(db: Session = Depends(get_db)):
    return db.query(Objetivo).all()

@router.get("/{objetivo_id}", response_model=ObjetivoRespuesta)
def obtener_objetivo(objetivo_id: int, db: Session = Depends(get_db)):
    objetivo = db.query(Objetivo).filter(Objetivo.id == objetivo_id).first()
    if not objetivo:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    return objetivo

@router.get("/ciclo/{ciclo_id}", response_model=List[ObjetivoRespuesta])
def objetivos_por_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    return db.query(Objetivo).filter(Objetivo.ciclo_id == ciclo_id).all()

@router.delete("/{objetivo_id}")
def eliminar_objetivo(objetivo_id: int, db: Session = Depends(get_db)):
    objetivo = db.query(Objetivo).filter(Objetivo.id == objetivo_id).first()
    if not objetivo:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    db.delete(objetivo)
    db.commit()
    return {"mensaje": "Objetivo eliminado"}
@router.put("/{objetivo_id}", response_model=ObjetivoRespuesta)
def actualizar_objetivo(objetivo_id: int, datos: dict, db: Session = Depends(get_db)):
    objetivo = db.query(Objetivo).filter(Objetivo.id == objetivo_id).first()
    if not objetivo:
        raise HTTPException(status_code=404, detail="Objetivo no encontrado")
    for campo, valor in datos.items():
        if hasattr(objetivo, campo):
            setattr(objetivo, campo, valor)
    db.commit()
    db.refresh(objetivo)
    return objetivo