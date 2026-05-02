from database import SessionLocal
from models import Ciclo, Sesion, Reserva, BloqueHorario
from datetime import date, timedelta
import random

db = SessionLocal()

# Usuarios con ciclos e historial
# Usaremos los primeros 10 usuarios del seed anterior

historiales = [
    # usuario_id, numero de ciclos, sesiones por ciclo
    {"usuario_id": 1, "ciclos": [10, 8, 3]},   # 3 ciclos
    {"usuario_id": 2, "ciclos": [10, 5]},        # 2 ciclos
    {"usuario_id": 3, "ciclos": [10, 10, 10, 4]},# 4 ciclos
    {"usuario_id": 4, "ciclos": [7]},             # 1 ciclo
    {"usuario_id": 5, "ciclos": [10, 10, 2]},    # 3 ciclos
    {"usuario_id": 6, "ciclos": [10]},            # 1 ciclo completado
    {"usuario_id": 7, "ciclos": [10, 10, 10, 10, 3]}, # 5 ciclos
    {"usuario_id": 8, "ciclos": [6]},             # 1 ciclo
    {"usuario_id": 9, "ciclos": [10, 9]},         # 2 ciclos
    {"usuario_id": 10, "ciclos": [10, 10, 7]},   # 3 ciclos
]

profesional_id = 1
actividades_ejemplo = [
    "Se trabajó equilibrio y coordinación motora gruesa. Usuario muestra avances significativos en control postural.",
    "Sesión enfocada en motricidad fina. Se realizaron ejercicios de pinza y manipulación de objetos pequeños.",
    "Evaluación de hitos del desarrollo. Se aplicó escala de evaluación psicomotora con resultados positivos.",
    "Trabajo en integración sensorial. Usuario tolera mejor estímulos táctiles y auditivos.",
    "Sesión de juego terapéutico. Se observa mayor capacidad de atención sostenida durante actividades dirigidas.",
    "Ejercicios de fortalecimiento muscular de tren superior. Buena disposición y participación activa.",
    "Trabajo en actividades de vida diaria. Se practicó vestimenta y alimentación con utensilios adaptados.",
    "Sesión con tutor presente. Se entregaron pautas de ejercicios para realizar en casa.",
    "Evaluación de objetivos del ciclo. Se observan avances en 3 de 4 indicadores de logro planteados.",
    "Cierre de ciclo. Se realiza informe de alta parcial y se planifican objetivos para próximo ciclo.",
]

fecha_base = date.today() - timedelta(days=365)

for historial in historiales:
    usuario_id = historial["usuario_id"]
    fecha_ciclo = fecha_base

    for idx_ciclo, num_sesiones in enumerate(historial["ciclos"]):
        es_ultimo = idx_ciclo == len(historial["ciclos"]) - 1
        estado_ciclo = "activo" if es_ultimo else "cerrado"

        ciclo = Ciclo(
            usuario_id=usuario_id,
            profesional_id=profesional_id,
            fecha_inicio=fecha_ciclo,
            numero_sesiones=num_sesiones,
            estado=estado_ciclo
        )
        db.add(ciclo)
        db.flush()

        for num_sesion in range(1, num_sesiones + 1):
            fecha_sesion = fecha_ciclo + timedelta(weeks=num_sesion)

            bloque = BloqueHorario(
                profesional_id=profesional_id,
                fecha=fecha_sesion,
                hora_inicio="09:00",
                hora_fin="10:00",
                disponible=False
            )
            db.add(bloque)
            db.flush()

            reserva = Reserva(
                usuario_id=usuario_id,
                bloque_horario_id=bloque.id,
                estado="asistio"
            )
            db.add(reserva)
            db.flush()

            sesion = Sesion(
                ciclo_id=ciclo.id,
                reserva_id=reserva.id,
                fecha=fecha_sesion,
                numero_sesion=num_sesion,
                actividades=random.choice(actividades_ejemplo),
                materiales="Materiales terapéuticos estándar",
                compromisos="Realizar ejercicios en casa según pauta entregada",
                es_ingreso=(num_sesion == 1 and idx_ciclo == 0)
            )
            db.add(sesion)

        fecha_ciclo = fecha_ciclo + timedelta(weeks=num_sesiones + 2)

db.commit()
db.close()
print("✅ Historial de sesiones creado correctamente")
print("   → 10 usuarios con 1 a 5 ciclos cada uno")
print("   → Hasta 10 sesiones por ciclo con actividades reales")