from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
import models, schemas
from datetime import date



router = APIRouter(
    prefix="/usuarios", # Antes estaba con "U" mayúscula, corregido a minúscula
    tags=["Usuarios"]
)

@router.post("/", response_model=schemas.UsuarioRespuesta)
def crear_usuario(usuario: schemas.UsuarioCrear, db: Session = Depends(get_db)):
    db_usuario = db.query(models.Usuario).filter(models.Usuario.rut == usuario.rut).first()
    if db_usuario:
        raise HTTPException(status_code=400, detail="El RUT ya está registrado")
    
    nuevo_usuario = models.Usuario(
        rut=usuario.rut,
        nombre=usuario.nombre,
        email=usuario.email,
        fecha_nacimiento=usuario.fecha_nacimiento,
        telefono_1=usuario.telefono_1,
        nombre_tutor=usuario.nombre_tutor,
        telefono_2=usuario.telefono_2,
        establecimiento_educacional=usuario.establecimiento_educacional,
        tarifa_pactada=usuario.tarifa_pactada
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.get("/", response_model=list[schemas.UsuarioRespuesta]) # <-- Cambiado de "/usuarios" a "/"
def listar_usuarios(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()

@router.get("/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def obtener_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return usuario

@router.get("/detalle-atencion/{usuario_id}")
def obtener_detalle_atencion(usuario_id: int, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Cálculo de edad
    hoy = date.today()
    edad = hoy.year - user.fecha_nacimiento.year - (
        (hoy.month, hoy.day) < (user.fecha_nacimiento.month, user.fecha_nacimiento.day)
    )
    
    # Conteo de sesiones
    total_sesiones = db.query(models.Sesion).join(models.Ciclo).filter(
        models.Ciclo.usuario_id == usuario_id
    ).count()
    
    # Diagnósticos
    diagnosticos = db.query(models.Diagnostico).filter(
    models.Diagnostico.usuario_id == usuario_id
    ).all()

    return {
        "nombre": user.nombre,
        "edad": edad,
        "nombre_tutor": user.nombre_tutor,
        "ultimo_diagnostico": diagnosticos[0].descripcion if diagnosticos else "Sin diagnóstico registrado",
        "diagnosticos": [{"id": d.id, "descripcion": d.descripcion, "tipo": d.tipo} for d in diagnosticos],
        "total_sesiones": total_sesiones,
        "tarifa_pactada": None,
        "indicadores": [],
        "foto_url": None
    }

    # Nombre tutor
    nombre_tutor = user.nombre_tutor or "No asignado"

    return {
        "nombre": user.nombre,
        "edad": edad,
        "nombre_tutor": nombre_tutor,
        "ultimo_diagnostico": diag.descripcion if diag else "Sin diagnóstico registrado",
        "total_sesiones": total_sesiones,
        "tarifa_pactada": None,
        "indicadores": [],
        "foto_url": None
    }

@router.put("/{usuario_id}", response_model=schemas.UsuarioRespuesta)
def actualizar_usuario(usuario_id: int, datos: schemas.UsuarioActualizar, db: Session = Depends(get_db)):
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(usuario, campo, valor)
    db.commit()
    db.refresh(usuario)
    return usuario

