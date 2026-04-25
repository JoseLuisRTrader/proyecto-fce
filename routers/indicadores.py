from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import IndicadorLogro, EvaluacionIndicador
from schemas import IndicadorLogroCrear, IndicadorLogroRespuesta, EvaluacionIndicadorCrear, EvaluacionIndicadorRespuesta
from typing import List

router = APIRouter(
    prefix="/indicadores",
    tags=["Indicadores"]
)

@router.post("/", response_model=IndicadorLogroRespuesta)
def crear_indicador(indicador: IndicadorLogroCrear, db: Session = Depends(get_db)):
    nuevo = IndicadorLogro(**indicador.dict())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo

@router.get("/", response_model=List[IndicadorLogroRespuesta])
def listar_indicadores(db: Session = Depends(get_db)):
    return db.query(IndicadorLogro).all()

@router.get("/{indicador_id}", response_model=IndicadorLogroRespuesta)
def obtener_indicador(indicador_id: int, db: Session = Depends(get_db)):
    indicador = db.query(IndicadorLogro).filter(IndicadorLogro.id == indicador_id).first()
    if not indicador:
        raise HTTPException(status_code=404, detail="Indicador no encontrado")
    return indicador

@router.get("/objetivo/{objetivo_id}", response_model=List[IndicadorLogroRespuesta])
def indicadores_por_objetivo(objetivo_id: int, db: Session = Depends(get_db)):
    return db.query(IndicadorLogro).filter(IndicadorLogro.objetivo_id == objetivo_id).all()

@router.post("/evaluaciones/", response_model=EvaluacionIndicadorRespuesta)
def crear_evaluacion(evaluacion: EvaluacionIndicadorCrear, db: Session = Depends(get_db)):
    nueva = EvaluacionIndicador(**evaluacion.dict())
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.get("/evaluaciones/sesion/{sesion_id}", response_model=List[EvaluacionIndicadorRespuesta])
def evaluaciones_por_sesion(sesion_id: int, db: Session = Depends(get_db)):
    return db.query(EvaluacionIndicador).filter(EvaluacionIndicador.sesion_id == sesion_id).all()

@router.delete("/{indicador_id}")
def eliminar_indicador(indicador_id: int, db: Session = Depends(get_db)):
    indicador = db.query(IndicadorLogro).filter(IndicadorLogro.id == indicador_id).first()
    if not indicador:
        raise HTTPException(status_code=404, detail="Indicador no encontrado")
    db.delete(indicador)
    db.commit()
    return {"mensaje": "Indicador eliminado"}