from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
import models
from datetime import date

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

    # Contamos cuántos pacientes (usuarios) hay registrados en total
    total_pacientes = db.query(models.Usuario).count()

    return {
        "citas_hoy": citas_hoy,
        "ciclos_activos": ciclos_activos,
        "total_pacientes": total_pacientes
    }

@router.get("/proximas-citas")
def obtener_citas_dia(db: Session = Depends(get_db)):
    hoy = date.today()
    
    # Unimos Reservas con Usuarios para el nombre y con Bloques para la hora
    citas = db.query(
        models.Reserva.id.label("reserva_id"),
        models.Usuario.id.label("usuario_id"),
        models.Usuario.nombre.label("nombre_paciente"),
        models.Usuario.rut,
        models.BloqueHorario.hora_inicio.label("hora"),
        models.Reserva.estado
    ).join(models.Usuario, models.Reserva.usuario_id == models.Usuario.id)\
     .join(models.BloqueHorario, models.Reserva.bloque_horario_id == models.BloqueHorario.id)\
     .filter(models.BloqueHorario.fecha == hoy)\
     .order_by(models.BloqueHorario.hora_inicio.asc())\
     .all()

    # Formateamos la respuesta para el frontend
    resultado = []
    for c in citas:
        # Lógica inicial del semáforo (puedes ajustarla después)
        # Por ahora, simulamos que si tiene más de 3 sesiones es "verde"
        color_semaforo = "green" if c.reserva_id % 2 == 0 else "yellow" 
        
        resultado.append({
            "usuario_id": c.usuario_id,
            "nombre": c.nombre_paciente,
            "rut": c.rut,
            "hora": c.hora,
            "estado": c.estado,
            "semaforo": color_semaforo
        })
        
    return resultado