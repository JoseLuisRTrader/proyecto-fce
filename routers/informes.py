from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Informe
from schemas import InformeCrear, InformeRespuesta
from typing import List

router = APIRouter(
    prefix="/informes",
    tags=["Informes"]
)

@router.post("/", response_model=InformeRespuesta)
def crear_informe(informe: InformeCrear, db: Session = Depends(get_db)):
    nuevo = Informe(**informe.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/", response_model=List[InformeRespuesta])
def listar_informes(db: Session = Depends(get_db)):
    return db.query(Informe).all()

@router.get("/{informe_id}", response_model=InformeRespuesta)
def obtener_informe(informe_id: int, db: Session = Depends(get_db)):
    informe = db.query(Informe).filter(Informe.id == informe_id).first()
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    return informe

@router.get("/ciclo/{ciclo_id}", response_model=List[InformeRespuesta])
def informes_por_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    return db.query(Informe).filter(Informe.ciclo_id == ciclo_id).all()

@router.get("/profesional/{profesional_id}", response_model=List[InformeRespuesta])
def informes_por_profesional(profesional_id: int, db: Session = Depends(get_db)):
    return db.query(Informe).filter(Informe.profesional_id == profesional_id).all()

@router.delete("/{informe_id}")
def eliminar_informe(informe_id: int, db: Session = Depends(get_db)):
    informe = db.query(Informe).filter(Informe.id == informe_id).first()
    if not informe:
        raise HTTPException(status_code=404, detail="Informe no encontrado")
    db.delete(informe)
    db.commit()
    return {"mensaje": "Informe eliminado"}