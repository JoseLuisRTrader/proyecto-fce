from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, get_db
import models, schemas
from datetime import date

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
    reserva_id = data['reserva_id']
    usuario_id = data['usuario_id']

    # Buscar sesión existente para esta reserva
    sesion = db.query(models.Sesion).filter(
        models.Sesion.reserva_id == reserva_id
    ).first()

    if sesion:
        # Actualizar sesión existente
        sesion.actividades = data.get('actividades')
        sesion.fecha = date.today()
    else:
        # Buscar ciclo activo del usuario
        ciclo = db.query(models.Ciclo).filter(
            models.Ciclo.usuario_id == usuario_id,
            models.Ciclo.estado == "activo"
        ).first()

        if not ciclo:
            raise HTTPException(status_code=404, detail="No hay ciclo activo")

        sesion = models.Sesion(
            ciclo_id=ciclo.id,
            reserva_id=reserva_id,
            actividades=data.get('actividades'),
            fecha=date.today(),
            numero_sesion=ciclo.numero_sesiones + 1,
            es_ingreso=ciclo.numero_sesiones == 0
        )
        db.add(sesion)
        ciclo.numero_sesiones += 1

    # Crear ingreso financiero
    nuevo_ingreso = models.Ingreso(
        usuario_id=usuario_id,
        concepto=f"Sesión - {date.today().strftime('%d/%m/%Y')}",
        monto=data.get('monto', 0),
        estado=data.get('estado_pago', 'pendiente'),
        metodo_pago=data.get('metodo_pago'),
        sesion_id=sesion.id if sesion.id else None
    )
    db.add(nuevo_ingreso)

    # Marcar reserva como asistida
    reserva = db.query(models.Reserva).filter(
        models.Reserva.id == reserva_id
    ).first()
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
    
    # Si se convierte de inasistencia a sesión normal
    if datos.es_inasistencia == False and sesion.es_inasistencia == True:
        ciclo = db.query(models.Ciclo).filter(
            models.Ciclo.id == sesion.ciclo_id
        ).first()
        if ciclo:
            ciclo.numero_sesiones += 1
            sesion.numero_sesion = ciclo.numero_sesiones
        
        # Restaurar reserva a asistio
        if sesion.reserva_id:
            reserva = db.query(models.Reserva).filter(
                models.Reserva.id == sesion.reserva_id
            ).first()
            if reserva:
                reserva.estado = "asistio"

    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(sesion, campo, valor)
    
    db.commit()
    db.refresh(sesion)
    return {"mensaje": "Sesión actualizada"}

@router.post("/crear-ingreso")
def crear_sesion_ingreso(datos: dict, db: Session = Depends(get_db)):
    ciclo_id = datos.get("ciclo_id")
    reserva_id = datos.get("reserva_id")
    
    # Verificar si ya existe sesión de ingreso
    existente = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id,
        models.Sesion.es_ingreso == True
    ).first()
    
    if existente:
        return {"id": existente.id, "creada": False}
    
    nueva = models.Sesion(
        ciclo_id=ciclo_id,
        reserva_id=reserva_id,
        fecha=date.today(),
        numero_sesion=1,
        es_ingreso=True
    )
    db.add(nueva)
    
    # Actualizar contador del ciclo
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if ciclo:
        ciclo.numero_sesiones += 1
    
    db.commit()
    db.refresh(nueva)
    return {"id": nueva.id, "creada": True}

@router.get("/por-reserva/{reserva_id}")
def obtener_sesion_por_reserva(reserva_id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(
        models.Sesion.reserva_id == reserva_id
    ).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sin sesión registrada")
    return {
        "id": sesion.id,
        "actividades": sesion.actividades,
        "materiales": sesion.materiales,
        "compromisos": sesion.compromisos,
        "fecha": str(sesion.fecha) if sesion.fecha else None
    }

@router.post("/registrar-inasistencia")
def registrar_inasistencia(datos: dict, db: Session = Depends(get_db)):

    reserva_id = datos.get("reserva_id")
    usuario_id = datos.get("usuario_id")
    
    reserva = db.query(models.Reserva).filter(
        models.Reserva.id == reserva_id
    ).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    reserva.estado = "nsp"

    # Buscar o crear ciclo activo
    ciclo = db.query(models.Ciclo).filter(
        models.Ciclo.usuario_id == usuario_id,
        models.Ciclo.estado == "activo"
    ).first()

    # Si no tiene ciclo, crear uno
    if not ciclo:
        ciclo = models.Ciclo(
            usuario_id=usuario_id,
            profesional_id=1,
            fecha_inicio=date.today(),
            numero_sesiones=0,
            estado="activo"
        )
        db.add(ciclo)
        db.flush()

    # Verificar que no exista ya una sesión para esta reserva
    sesion_existente = db.query(models.Sesion).filter(
        models.Sesion.reserva_id == reserva_id
    ).first()

    if not sesion_existente:
        sesion = models.Sesion(
            ciclo_id=ciclo.id,
            reserva_id=reserva_id,
            fecha=date.today(),
            numero_sesion=None,  # No cuenta como sesión del ciclo
            actividades="Inasistencia",
            es_ingreso=False,
            es_inasistencia=True  # ← marca especial
        )
        db.add(sesion)
        # NO incrementar ciclo.numero_sesiones

    db.commit()
    return {"status": "success", "mensaje": "Inasistencia registrada"}
    reserva_id = datos.get("reserva_id")
    usuario_id = datos.get("usuario_id")
    
    reserva = db.query(models.Reserva).filter(
        models.Reserva.id == reserva_id
    ).first()
    
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Marcar reserva como inasistencia
    reserva.estado = "nsp"

    # Buscar ciclo activo del usuario
    ciclo = db.query(models.Ciclo).filter(
        models.Ciclo.usuario_id == usuario_id,
        models.Ciclo.estado == "activo"
    ).first()

    if ciclo:
        # Verificar si ya existe sesión para esta reserva
        sesion_existente = db.query(models.Sesion).filter(
            models.Sesion.reserva_id == reserva_id
        ).first()

        if not sesion_existente:
            # Crear sesión de inasistencia
            sesion = models.Sesion(
                ciclo_id=ciclo.id,
                reserva_id=reserva_id,
                fecha=date.today(),
                numero_sesion=ciclo.numero_sesiones + 1,
                actividades="⚠️ Inasistencia - Usuario no se presentó (NSP)",
                es_ingreso=False
            )
            db.add(sesion)
            # No suma al contador de sesiones clínicas
    
    db.commit()
    return {"status": "success", "mensaje": "Inasistencia registrada"}
    reserva_id = datos.get("reserva_id")
    
    # Marcar reserva como inasistencia
    reserva = db.query(models.Reserva).filter(
        models.Reserva.id == reserva_id
    ).first()
    
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    reserva.estado = "nsp"  # No Se Presentó
    db.commit()
    
    return {"status": "success", "mensaje": "Inasistencia registrada"}

@router.delete("/{sesion_id}")
def eliminar_sesion(sesion_id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    
    # Si era inasistencia, restaurar reserva a confirmada
    if sesion.es_inasistencia and sesion.reserva_id:
        reserva = db.query(models.Reserva).filter(
            models.Reserva.id == sesion.reserva_id
        ).first()
        if reserva:
            reserva.estado = "confirmada"
    
    # Si tenía número de sesión, decrementar ciclo
    if not sesion.es_inasistencia and sesion.ciclo_id:
        ciclo = db.query(models.Ciclo).filter(
            models.Ciclo.id == sesion.ciclo_id
        ).first()
        if ciclo and ciclo.numero_sesiones > 0:
            ciclo.numero_sesiones -= 1
    
    db.delete(sesion)
    db.commit()
    return {"mensaje": "Sesión eliminada"}