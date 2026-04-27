from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Diagnostico
from schemas import DiagnosticoCrear, DiagnosticoRespuesta
from typing import List

router = APIRouter(
    prefix="/diagnosticos",
    tags=["Diagnósticos"]
)

@router.post("/", response_model=DiagnosticoRespuesta)
def crear_diagnostico(datos: DiagnosticoCrear, db: Session = Depends(get_db)):
    nuevo = Diagnostico(**datos.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/usuario/{usuario_id}", response_model=List[DiagnosticoRespuesta])
def listar_diagnosticos(usuario_id: int, db: Session = Depends(get_db)):
    return db.query(Diagnostico).filter(Diagnostico.usuario_id == usuario_id).all()

@router.delete("/{diagnostico_id}")
def eliminar_diagnostico(diagnostico_id: int, db: Session = Depends(get_db)):
    diag = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    db.delete(diag)
    db.commit()
    return {"mensaje": "Diagnóstico eliminado"}

@router.put("/{diagnostico_id}", response_model=DiagnosticoRespuesta)
def actualizar_diagnostico(diagnostico_id: int, datos: DiagnosticoCrear, db: Session = Depends(get_db)):
    diag = db.query(Diagnostico).filter(Diagnostico.id == diagnostico_id).first()
    if not diag:
        raise HTTPException(status_code=404, detail="Diagnóstico no encontrado")
    for campo, valor in datos.dict().items():
        setattr(diag, campo, valor)
    db.commit()
    db.refresh(diag)
    return diag