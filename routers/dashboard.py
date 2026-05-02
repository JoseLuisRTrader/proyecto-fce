from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from datetime import date, timedelta

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

@router.get("/resumen")
def obtener_resumen(db: Session = Depends(get_db)):
    # Contamos cuántas reservas hay para el día de hoy
    hoy = date.today()
    citas_hoy = db.query(models.Reserva).join(models.BloqueHorario).filter(
        models.BloqueHorario.fecha == hoy
    ).count()

    # Contamos ciclos que no estén cerrados
    ciclos_activos = db.query(models.Ciclo).filter(models.Ciclo.estado == "activo").count()

    # Contamos cuántos usuarios (usuarios) hay registrados en total
    total_usuarios = db.query(models.Usuario).count()

    return {
        "citas_hoy": citas_hoy,
        "ciclos_activos": ciclos_activos,
        "total_usuarios": total_usuarios
    }

@router.get("/proximas-citas")
def obtener_citas_dia(db: Session = Depends(get_db)):
    hoy = date.today()
    
    citas = db.query(
        models.Reserva.id.label("reserva_id"),
        models.Usuario.id.label("usuario_id"),
        models.Usuario.nombre.label("nombre_usuario"),
        models.Usuario.rut,
        models.Usuario.foto_url,
        models.BloqueHorario.hora_inicio.label("hora"),
        models.Reserva.estado
    ).join(models.Usuario, models.Reserva.usuario_id == models.Usuario.id)\
     .join(models.BloqueHorario, models.Reserva.bloque_horario_id == models.BloqueHorario.id)\
     .filter(models.BloqueHorario.fecha == hoy)\
     .order_by(models.BloqueHorario.hora_inicio.asc())\
     .all()

    resultado = []
    for c in citas:
        color_semaforo = "green" if c.reserva_id % 2 == 0 else "yellow"

        # Verificar si ya tiene sesión registrada hoy
        sesion = db.query(models.Sesion).filter(
            models.Sesion.reserva_id == c.reserva_id
        ).first()

        tiene_registro = sesion is not None and sesion.actividades is not None

        resultado.append({
            "reserva_id": c.reserva_id,
            "usuario_id": c.usuario_id,
            "nombre": c.nombre_usuario,
            "rut": c.rut,
            "hora": c.hora,
            "estado": c.estado,
            "semaforo": color_semaforo,
            "foto_url": c.foto_url or f"https://ui-avatars.com/api/?name={c.nombre_usuario.replace(' ', '+')}&background=2563eb&color=fff",
            "tiene_registro": tiene_registro
        })
        
    return resultado

import locale
@router.get("/proximos-dias")
def obtener_proximos_dias(db: Session = Depends(get_db)):
    hoy = date.today()
    resultado = []

    for i in range(1, 8):  # mañana hasta 7 días adelante
        dia = hoy + timedelta(days=i)

        citas = db.query(
            models.Reserva.id.label("reserva_id"),
            models.Usuario.id.label("usuario_id"),
            models.Usuario.nombre.label("nombre"),
            models.Usuario.rut,
            models.BloqueHorario.hora_inicio.label("hora")
        ).join(models.Usuario, models.Reserva.usuario_id == models.Usuario.id)\
         .join(models.BloqueHorario, models.Reserva.bloque_horario_id == models.BloqueHorario.id)\
         .filter(models.BloqueHorario.fecha == dia)\
         .order_by(models.BloqueHorario.hora_inicio.asc())\
         .all()

        dias_semana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

        if citas:
            nombre_dia = f"{dias_semana[dia.weekday()]} {dia.day} de {meses[dia.month - 1]}"
            resultado.append({
                "fecha": dia.isoformat(),
                "dia_nombre": nombre_dia,
                "total": len(citas),
                "citas": [
                    {
                        "reserva_id": c.reserva_id,
                        "usuario_id": c.usuario_id,
                        "nombre": c.nombre,
                        "rut": c.rut,
                        "hora": c.hora,
                        "semaforo": "#22c55e" if c.reserva_id % 2 == 0 else "#facc15"

                    } for c in citas
                ]
    })

    return resultado