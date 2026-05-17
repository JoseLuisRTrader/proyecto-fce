from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from datetime import date

router = APIRouter(
    prefix="/sesiones",
    tags=["Sesiones"]
)

@router.post("/sesiones", response_model=schemas.SesionRespuesta)
def crear_sesion(sesion: schemas.SesionCrear, db: Session = Depends(get_db)):
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == sesion.ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    if ciclo.estado != "activo":
        raise HTTPException(status_code=400, detail="El ciclo no está activo")
    nueva_sesion = models.Sesion(**sesion.dict())
    db.add(nueva_sesion)
    ciclo.numero_sesiones += 1
    db.commit()
    db.refresh(nueva_sesion)
    return nueva_sesion

@router.get("/sesiones", response_model=list[schemas.SesionRespuesta])
def listar_sesiones(db: Session = Depends(get_db)):
    return db.query(models.Sesion).all()

@router.get("/sesiones/{id}", response_model=schemas.SesionRespuesta)
def obtener_sesion(id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    return sesion

@router.get("/sesiones/ciclo/{ciclo_id}", response_model=list[schemas.SesionRespuesta])
def sesiones_por_ciclo(ciclo_id: int, db: Session = Depends(get_db)):
    return db.query(models.Sesion).filter(models.Sesion.ciclo_id == ciclo_id).all()

@router.post("/registrar-atencion")
def registrar_atencion(data: dict, db: Session = Depends(get_db)):
    reserva_id = data['reserva_id']
    usuario_id = data['usuario_id']
    sesion = db.query(models.Sesion).filter(models.Sesion.reserva_id == reserva_id).first()
    if sesion:
        sesion.actividades = data.get('actividades')
        sesion.fecha = date.today()
    else:
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
            es_ingreso=ciclo.numero_sesiones == 0,
            es_inasistencia=False,
            eliminado=False
        )
        db.add(sesion)
        ciclo.numero_sesiones += 1
    nuevo_ingreso = models.Ingreso(
        usuario_id=usuario_id,
        concepto=f"Sesión - {date.today().strftime('%d/%m/%Y')}",
        monto=data.get('monto', 0),
        estado=data.get('estado_pago', 'pendiente'),
        metodo_pago=data.get('metodo_pago'),
        sesion_id=sesion.id if sesion.id else None
    )
    db.add(nuevo_ingreso)
    reserva = db.query(models.Reserva).filter(models.Reserva.id == reserva_id).first()
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
    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == sesion.ciclo_id).first()
    objetivos = db.query(models.Objetivo).filter(
        models.Objetivo.ciclo_id == ciclo.id,
        models.Objetivo.es_general == False
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
        "es_inasistencia": sesion.es_inasistencia or False,
        "recuperado": sesion.recuperado or False,
        "indicadores": indicadores
    }


@router.put("/{sesion_id}")
def actualizar_sesion(sesion_id: int, datos: schemas.SesionActualizar, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    for campo, valor in datos.dict(exclude_unset=True).items():
        setattr(sesion, campo, valor)
    # Limpia la marca temporal "recuperada" al guardar cambios (Opción C2)
    if sesion.recuperado:
        sesion.recuperado = False
    db.commit()
    db.refresh(sesion)
    return {"mensaje": "Sesión actualizada"}

@router.post("/crear-ingreso")
def crear_sesion_ingreso(datos: dict, db: Session = Depends(get_db)):
    ciclo_id = datos.get("ciclo_id")
    reserva_id = datos.get("reserva_id")
    usuario_id = datos.get("usuario_id")  # nuevo: para crear ciclo si hace falta

    # Resolver el ciclo. Si no se pasó ciclo_id (o es inválido),
    # crear uno nuevo activo para el usuario. Esto evita ciclos
    # fantasma: el ciclo nace SOLO cuando se guarda el ingreso.
    ciclo = None
    if ciclo_id:
        ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()

    if not ciclo:
        if not usuario_id:
            raise HTTPException(
                status_code=400,
                detail="Se requiere ciclo_id o usuario_id para crear el ingreso."
            )
        # Defensa: no crear un segundo ciclo activo en paralelo
        ciclo_activo = db.query(models.Ciclo).filter(
            models.Ciclo.usuario_id == usuario_id,
            models.Ciclo.estado == "activo"
        ).first()
        if ciclo_activo:
            ciclo = ciclo_activo
        else:
            ciclo = models.Ciclo(
                usuario_id=usuario_id,
                profesional_id=1,
                fecha_inicio=date.today(),
                numero_sesiones=0,
                estado="activo"
            )
            db.add(ciclo)
            db.flush()  # para obtener ciclo.id sin commitear todavía

    # Si ya hay sesión de ingreso para este ciclo, devolverla (idempotente)
    existente = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo.id,
        models.Sesion.es_ingreso == True,
        models.Sesion.eliminado != True
    ).first()
    if existente:
        return {"id": existente.id, "creada": False, "ciclo_id": ciclo.id}

    nueva = models.Sesion(
        ciclo_id=ciclo.id,
        reserva_id=reserva_id,
        fecha=date.today(),
        numero_sesion=1,
        es_ingreso=True,
        es_inasistencia=False,
        eliminado=False
    )
    db.add(nueva)
    ciclo.numero_sesiones += 1
    db.commit()
    db.refresh(nueva)
    return {"id": nueva.id, "creada": True, "ciclo_id": ciclo.id}


@router.post("/crear-normal")
def crear_sesion_normal(datos: dict, db: Session = Depends(get_db)):
    """
    Crea una sesión normal (no ingreso) en un ciclo activo.
    Usado por el botón "Registrar" de un ciclo activo en la ficha del usuario,
    cuando ya existe la sesión de ingreso y se está agregando una sesión 2..N.
    """
    ciclo_id = datos.get("ciclo_id")
    reserva_id = datos.get("reserva_id")

    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    if ciclo.estado != "activo":
        raise HTTPException(status_code=400, detail="El ciclo no está activo")

    # numero_sesion referencial: siguiente en la secuencia del ciclo
    # (el número visible se calcula dinámicamente en GET /ciclos/{id}/sesiones)
    nueva = models.Sesion(
        ciclo_id=ciclo_id,
        reserva_id=reserva_id,
        fecha=date.today(),
        numero_sesion=ciclo.numero_sesiones + 1,
        es_ingreso=False,
        es_inasistencia=False,
        eliminado=False
    )
    db.add(nueva)
    ciclo.numero_sesiones += 1
    db.commit()
    db.refresh(nueva)
    return {"id": nueva.id, "creada": True}

@router.post("/crear-inasistencia")
def crear_inasistencia(datos: dict, db: Session = Depends(get_db)):
    """
    Registra inasistencia desde la ficha del usuario (Opción C):
    - Si hay reserva confirmada del usuario para hoy → la vincula y marca nsp
    - Si no hay reserva → crea inasistencia libre sin reserva_id
    """
    ciclo_id = datos.get("ciclo_id")
    usuario_id = datos.get("usuario_id")

    ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == ciclo_id).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    if ciclo.estado != "activo":
        raise HTTPException(status_code=400, detail="El ciclo no está activo")

    # Verificar si ya existe inasistencia hoy para este ciclo
    existente = db.query(models.Sesion).filter(
        models.Sesion.ciclo_id == ciclo_id,
        models.Sesion.fecha == date.today(),
        models.Sesion.es_inasistencia == True,
        models.Sesion.eliminado != True
    ).first()
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una inasistencia registrada para hoy")

    # Caso A: buscar reserva confirmada del usuario para hoy
    reserva = db.query(models.Reserva)\
        .join(models.BloqueHorario, models.Reserva.bloque_horario_id == models.BloqueHorario.id)\
        .filter(
            models.Reserva.usuario_id == usuario_id,
            models.Reserva.estado == "confirmada",
            models.BloqueHorario.fecha == date.today()
        ).first()

    reserva_id = None
    if reserva:
        reserva.estado = "nsp"
        reserva_id = reserva.id

    # Crear sesión de inasistencia (con o sin reserva_id)
    nueva = models.Sesion(
        ciclo_id=ciclo_id,
        reserva_id=reserva_id,
        fecha=date.today(),
        numero_sesion=None,
        actividades="Inasistencia",
        es_ingreso=False,
        es_inasistencia=True,
        eliminado=False
    )
    db.add(nueva)
    db.commit()
    db.refresh(nueva)
    return {"id": nueva.id, "creada": True, "reserva_vinculada": reserva_id is not None}

@router.get("/por-reserva/{reserva_id}")
def obtener_sesion_por_reserva(reserva_id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(
        models.Sesion.reserva_id == reserva_id
    ).first()
    if not sesion:
        return None  # "ausencia" no es "error" — el frontend ya maneja el caso vacío
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
    reserva = db.query(models.Reserva).filter(models.Reserva.id == reserva_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.estado = "nsp"
    ciclo = db.query(models.Ciclo).filter(
        models.Ciclo.usuario_id == usuario_id,
        models.Ciclo.estado == "activo"
    ).first()
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
    sesion_existente = db.query(models.Sesion).filter(
        models.Sesion.reserva_id == reserva_id
    ).first()
    if not sesion_existente:
        sesion = models.Sesion(
            ciclo_id=ciclo.id,
            reserva_id=reserva_id,
            fecha=date.today(),
            numero_sesion=None,
            actividades="Inasistencia",
            es_ingreso=False,
            es_inasistencia=True,
            eliminado=False
        )
        db.add(sesion)
    db.commit()
    return {"status": "success", "mensaje": "Inasistencia registrada"}

@router.delete("/{sesion_id}")
def eliminar_sesion(sesion_id: int, motivo: str = "eliminado por usuario", db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    sesion.eliminado = True
    sesion.fecha_eliminacion = date.today()
    sesion.motivo_eliminacion = motivo
    if not sesion.es_inasistencia:
        ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == sesion.ciclo_id).first()
        if ciclo and ciclo.numero_sesiones > 0:
            ciclo.numero_sesiones -= 1
    if sesion.reserva_id:
        reserva = db.query(models.Reserva).filter(models.Reserva.id == sesion.reserva_id).first()
        if reserva:
            reserva.estado = "confirmada"
    db.commit()
    return {"mensaje": "Sesión eliminada (papelera 30 días)"}

@router.post("/{sesion_id}/restaurar")
def restaurar_sesion(sesion_id: int, db: Session = Depends(get_db)):
    sesion = db.query(models.Sesion).filter(models.Sesion.id == sesion_id).first()
    if not sesion:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    sesion.eliminado = False
    sesion.fecha_eliminacion = None
    sesion.motivo_eliminacion = None
    sesion.recuperado = True
    if not sesion.es_inasistencia:
        ciclo = db.query(models.Ciclo).filter(models.Ciclo.id == sesion.ciclo_id).first()
        if ciclo:
            ciclo.numero_sesiones += 1
    if sesion.reserva_id:
        reserva = db.query(models.Reserva).filter(models.Reserva.id == sesion.reserva_id).first()
        if reserva:
            reserva.estado = "asistio"
    db.commit()
    return {"mensaje": "Sesión restaurada correctamente"}