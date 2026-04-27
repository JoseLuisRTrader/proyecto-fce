from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Medicamento
from schemas import MedicamentoCrear, MedicamentoRespuesta
from typing import List

router = APIRouter(
    prefix="/medicamentos",
    tags=["Medicamentos"]
)

@router.post("/", response_model=MedicamentoRespuesta)
def crear_medicamento(datos: MedicamentoCrear, db: Session = Depends(get_db)):
    nuevo = Medicamento(**datos.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/usuario/{usuario_id}", response_model=List[MedicamentoRespuesta])
def listar_medicamentos(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Medicamento).filter(Medicamento.usuario_id == usuario_id).all()

@router.delete("/{medicamento_id}")
def eliminar_medicamento(medicamento_id: int, db: Session = Depends(get_db)):
    med = db.query(Medicamento).filter(Medicamento.id == medicamento_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    db.delete(med)
    db.commit()
    return {"mensaje": "Medicamento eliminado"}

@router.put("/{medicamento_id}", response_model=MedicamentoRespuesta)
def actualizar_medicamento(medicamento_id: int, datos: MedicamentoCrear, db: Session = Depends(get_db)):
    med = db.query(Medicamento).filter(Medicamento.id == medicamento_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicamento no encontrado")
    for campo, valor in datos.dict().items():
        setattr(med, campo, valor)
    db.commit()
    db.refresh(med)
    return med