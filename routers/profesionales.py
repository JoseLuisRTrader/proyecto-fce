from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter(
    prefix="/profesionales",
    tags=["Profesionales"]
)

@router.post("/", response_model=schemas.ProfesionalRespuesta)
def crear_profesional(profesional: schemas.ProfesionalCrear, db: Session = Depends(get_db)):
    db_profesional = db.query(models.Profesional).filter(
        models.Profesional.email == profesional.email
    ).first()
    if db_profesional:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    nuevo_profesional = models.Profesional(**profesional.dict())
    db.add(nuevo_profesional)
    db.commit()
    db.refresh(nuevo_profesional)
    return nuevo_profesional

@router.get("/", response_model=list[schemas.ProfesionalRespuesta])
def listar_profesionales(db: Session = Depends(get_db)):
    return db.query(models.Profesional).all()

@router.get("/{id}", response_model=schemas.ProfesionalRespuesta)
def obtener_profesional(id: int, db: Session = Depends(get_db)):
    profesional = db.query(models.Profesional).filter(
        models.Profesional.id == id
    ).first()
    if not profesional:
        raise HTTPException(status_code=404, detail="Profesional no encontrado")
    return profesional

@router.post("/login")
def login(datos: schemas.LoginSchema, db: Session = Depends(get_db)):
    profesional = db.query(models.Profesional).filter(
        models.Profesional.email == datos.email
    ).first()
    if not profesional or profesional.password != datos.password:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {
        "mensaje": "Login exitoso",
        "profesional_id": profesional.id,
        "nombre": profesional.nombre
    }

