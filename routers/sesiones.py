from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
import models, schemas

router = APIRouter(
    prefix="/sesiones",
    tags=["Sesiones"]
)



@router.post("/sesiones", response_model=schemas.SesionRespuesta)
def crear_sesion(sesion: schemas.SesionCrear, db: Session = Depends(get_db)):
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id==sesion.ciclo_id).first()

    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    
    if ciclo.estado != "activo":
        raise HTTPException(status_code=400,detail="El ciclo no está activo")
    
    # Verificar que el ciclo existe
    #ciclo = db.query(models.Ciclo).filter(
    #    models.Ciclo.id == sesion.ciclo_id
    #).first()
    #if not ciclo:
    #    raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # Verificar que el ciclo está activo
    #if ciclo.estado != "activo":
    #    raise HTTPException(status_code=400, detail="Ciclo no está activo")

    # Verificar que no supera 12 sesiones
    #if ciclo.numero_sesiones >= 12:
    #    raise HTTPException(status_code=400, detail="Ciclo ya completó 12 sesiones")

    # Crear la sesion
    nueva_sesion = models.Sesion(**sesion.dict())
    db.add(nueva_sesion)

    # Actualizar contador de sesiones del ciclo
    ciclo.numero_sesiones += 1

    # Si llegó a 12 sesiones cerrar el ciclo
    #if ciclo.numero_sesiones == 12:
    #    ciclo.estado = "cerrado"

    db.commit()
    db.refresh(nueva_sesion)
    return nueva_sesion

@router.get("/sesiones", response_model=list[schemas.SesionRespuesta])
def listar_sesiones(db: Session = Depends(get_db)):
    return db.query(models.Sesion).all()

@router.get("/sesiones/{id}", response_model=schemas.SesionRespuesta)
def obtener_sesion(id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(
        models.Sesion.id == id
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return sesion

@router.get("/sesiones/ciclo/{ciclo_id}", response_model=list[schemas.SesionRespuesta])
def sesiones_por_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    return db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id
    ).all()

# routers/sesiones.py
@router.post("/registrar-atencion")
def registrar_atencion(data: dict, db: Session = Depends(get_db)):
    # 1. Crear la Sesión Clínica
    nueva_sesion = models.Sesion(
        ciclo_id=data['ciclo_id'],
        reserva_id=data['reserva_id'],
        actividades=data['actividades'],
        fecha=date.today()
    )
    db.add(nueva_sesion)
    
    # 2. Crear el Registro Financiero (Ingreso)
    nuevo_ingreso = models.Ingreso(
        usuario_id=data['usuario_id'],
        concepto=f"Sesión - {date.today().strftime('%d/%m/%Y')}",
        monto=data['monto'],
        estado=data['estado_pago'],
        metodo_pago=data.get('metodo_pago')
    )
    db.add(nuevo_ingreso)
    
    # 3. Marcar la reserva como 'asistio'
    reserva = db.query(models.Reserva).get(data['reserva_id'])
    if reserva:
        reserva.estado = "asistio"
        
    db.commit()
    return {"status": "success"}

@router.get("/{sesion_id}/detalle")
def obtener_sesion_detalle(sesion_id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    evaluaciones = db.query(models.EvaluacionIndicador).filter(
        models.EvaluacionIndicador.sesion_id == sesion_id
    ).all()

    # Obtener indicadores del ciclo
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == sesion.ciclo_id).first()
    objetivos = db.query(models.Objetivo).filter(
        models.Objetivo.ciclo_id == ciclo.id
    ).all()
    
    indicadores = []
    for obj in objetivos:
        inds = db.query(models.IndicadorLogro).filter(
            models.IndicadorLogro.objetivo_id == obj.id
        ).all()
        for ind in inds:
            eval_ind = next((e for e in evaluaciones if e.indicador_id == ind.id), None)
            indicadores.append({
                "id": ind.id,
                "descripcion": ind.descripcion,
                "objetivo": obj.descripcion,
                "cumplido": eval_ind.cumplido if eval_ind else None,
                "observacion": eval_ind.observacion if eval_ind else None,
                "evaluacion_id": eval_ind.id if eval_ind else None
            })

    return {
        "id": sesion.id,
        "ciclo_id": sesion.ciclo_id,
        "numero_sesion": sesion.numero_sesion,
        "fecha": str(sesion.fecha) if sesion.fecha else None,
        "actividades": sesion.actividades,
        "materiales": sesion.materiales,
        "compromisos": sesion.compromisos,
        "es_ingreso": sesion.es_ingreso,
        "indicadores": indicadores
    }

@router.put("/{sesion_id}")
def actualizar_sesion(sesion_id: int, datos: schemas.SesionActualizar, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(sesion, campo, valor)
    db.commit()
    db.refresh(sesion)
    return {"mensaje": "Sesión actualizada"}