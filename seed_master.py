from database import SessionLocal
from models import (Usuario, BloqueHorario, Reserva, Profesional, 
                   Ciclo, Sesion, Objetivo, IndicadorLogro)
from datetime import date, timedelta
import random

db = SessionLocal()

# ==========================================
# PROFESIONAL
# ==========================================
profesional = Profesional(
    nombre="Jose Luis",
    profesion="Terapeuta Ocupacional",
    email="correo@correo.cl",
    password="1234"
)
db.add(profesional)
db.flush()

# ==========================================
# 30 USUARIOS
# ==========================================
usuarios_data = [
    {"nombre": "María González",     "rut": "11111111-1", "fecha_nacimiento": date(2015, 3, 10),  "nombre_tutor": "Ana González",      "estado": "en_tto"},
    {"nombre": "Pedro Ramírez",      "rut": "22222222-2", "fecha_nacimiento": date(2016, 7, 22),  "nombre_tutor": "Luis Ramírez",       "estado": "en_tto"},
    {"nombre": "Sofía Martínez",     "rut": "33333333-3", "fecha_nacimiento": date(2014, 1, 5),   "nombre_tutor": "Carmen Martínez",    "estado": "en_tto"},
    {"nombre": "Diego López",        "rut": "44444444-4", "fecha_nacimiento": date(2017, 9, 18),  "nombre_tutor": "Jorge López",        "estado": "pausa"},
    {"nombre": "Valentina Muñoz",    "rut": "55555555-5", "fecha_nacimiento": date(2015, 12, 30), "nombre_tutor": "Rosa Muñoz",         "estado": "en_tto"},
    {"nombre": "Matías Pérez",       "rut": "66666666-6", "fecha_nacimiento": date(2016, 4, 14),  "nombre_tutor": "Patricia Pérez",     "estado": "alta"},
    {"nombre": "Isadora Rojas",      "rut": "77777777-7", "fecha_nacimiento": date(2013, 8, 25),  "nombre_tutor": "Manuel Rojas",       "estado": "en_tto"},
    {"nombre": "Benjamín Silva",     "rut": "88888888-8", "fecha_nacimiento": date(2018, 2, 7),   "nombre_tutor": "Sandra Silva",       "estado": "en_tto"},
    {"nombre": "Antonia Vargas",     "rut": "99999999-9", "fecha_nacimiento": date(2014, 6, 19),  "nombre_tutor": "Felipe Vargas",      "estado": "lista_espera"},
    {"nombre": "Emilio Castro",      "rut": "10101010-1", "fecha_nacimiento": date(2017, 11, 3),  "nombre_tutor": "Mónica Castro",      "estado": "en_tto"},
    {"nombre": "Camila Torres",      "rut": "12121212-1", "fecha_nacimiento": date(2015, 5, 20),  "nombre_tutor": "Rosa Torres",        "estado": "en_tto"},
    {"nombre": "Ignacio Fuentes",    "rut": "13131313-1", "fecha_nacimiento": date(2016, 8, 14),  "nombre_tutor": "Luis Fuentes",       "estado": "alta"},
    {"nombre": "Renata Soto",        "rut": "14141414-1", "fecha_nacimiento": date(2014, 3, 7),   "nombre_tutor": "Carmen Soto",        "estado": "en_tto"},
    {"nombre": "Tomás Herrera",      "rut": "15151515-1", "fecha_nacimiento": date(2019, 1, 25),  "nombre_tutor": "Juan Herrera",       "estado": "en_tto"},
    {"nombre": "Florencia Díaz",     "rut": "16161616-1", "fecha_nacimiento": date(2013, 10, 12), "nombre_tutor": "Paula Díaz",         "estado": "derivado"},
    {"nombre": "Sebastián Mora",     "rut": "17171717-1", "fecha_nacimiento": date(2016, 6, 8),   "nombre_tutor": "Elena Mora",         "estado": "en_tto"},
    {"nombre": "Javiera Núñez",      "rut": "18181818-1", "fecha_nacimiento": date(2015, 2, 17),  "nombre_tutor": "Ricardo Núñez",      "estado": "en_tto"},
    {"nombre": "Cristóbal Vega",     "rut": "19191919-1", "fecha_nacimiento": date(2017, 4, 30),  "nombre_tutor": "Gloria Vega",        "estado": "pausa"},
    {"nombre": "Amanda Paredes",     "rut": "20202020-1", "fecha_nacimiento": date(2014, 9, 3),   "nombre_tutor": "Héctor Paredes",     "estado": "en_tto"},
    {"nombre": "Vicente Contreras",  "rut": "21212121-1", "fecha_nacimiento": date(2018, 7, 21),  "nombre_tutor": "Isabel Contreras",   "estado": "lista_espera"},
    {"nombre": "Catalina Espinoza",  "rut": "22232323-1", "fecha_nacimiento": date(2015, 11, 9),  "nombre_tutor": "Marco Espinoza",     "estado": "en_tto"},
    {"nombre": "Rodrigo Sandoval",   "rut": "23242424-1", "fecha_nacimiento": date(2016, 1, 28),  "nombre_tutor": "Claudia Sandoval",   "estado": "alta"},
    {"nombre": "Fernanda Ibáñez",    "rut": "24252525-1", "fecha_nacimiento": date(2013, 5, 15),  "nombre_tutor": "Sergio Ibáñez",      "estado": "en_tto"},
    {"nombre": "Martín Alvarado",    "rut": "25262626-1", "fecha_nacimiento": date(2019, 3, 4),   "nombre_tutor": "Verónica Alvarado",  "estado": "en_tto"},
    {"nombre": "Daniela Fuenzalida", "rut": "26272727-1", "fecha_nacimiento": date(2014, 8, 22),  "nombre_tutor": "Pablo Fuenzalida",   "estado": "derivado"},
    {"nombre": "Nicolás Araya",      "rut": "27282828-1", "fecha_nacimiento": date(2017, 12, 11), "nombre_tutor": "Marcela Araya",      "estado": "en_tto"},
    {"nombre": "Constanza Medina",   "rut": "28292929-1", "fecha_nacimiento": date(2015, 7, 6),   "nombre_tutor": "Fernando Medina",    "estado": "en_tto"},
    {"nombre": "Felipe Osorio",      "rut": "29303030-1", "fecha_nacimiento": date(2016, 2, 19),  "nombre_tutor": "Alejandra Osorio",   "estado": "pausa"},
    {"nombre": "Gabriela Riquelme",  "rut": "30313131-1", "fecha_nacimiento": date(2013, 6, 28),  "nombre_tutor": "Roberto Riquelme",   "estado": "en_tto"},
    {"nombre": "Andrés Villanueva",  "rut": "31323232-1", "fecha_nacimiento": date(2018, 4, 13),  "nombre_tutor": "Natalia Villanueva", "estado": "en_tto"},
]

usuarios = []
for u in usuarios_data:
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    usuarios.append(usuario)

# ==========================================
# BLOQUES Y RESERVAS (ayer, hoy, 10 días)
# ==========================================
horarios = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00"]
hoy = date.today()
dias = [hoy - timedelta(days=1)] + [hoy] + [hoy + timedelta(days=i) for i in range(1, 11)]

usuario_idx = 0
for dia in dias:
    citas_dia = 4 if dia == hoy else 3
    for j in range(citas_dia):
        hora = horarios[j % len(horarios)]
        hora_fin = f"{int(hora[:2])+1:02d}:00"
        bloque = BloqueHorario(
            profesional_id=profesional.id,
            fecha=dia,
            hora_inicio=hora,
            hora_fin=hora_fin,
            disponible=False
        )
        db.add(bloque)
        db.flush()
        reserva = Reserva(
            usuario_id=usuarios[usuario_idx % len(usuarios)].id,
            bloque_horario_id=bloque.id,
            estado="confirmada"
        )
        db.add(reserva)
        usuario_idx += 1

# ==========================================
# CICLOS Y SESIONES CON HISTORIAL
# ==========================================
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

historiales = [
    {"usuario_idx": 0,  "ciclos": [10, 8, 3]},
    {"usuario_idx": 1,  "ciclos": [10, 5]},
    {"usuario_idx": 2,  "ciclos": [10, 10, 10, 4]},
    {"usuario_idx": 3,  "ciclos": [7]},
    {"usuario_idx": 4,  "ciclos": [10, 10, 2]},
    {"usuario_idx": 5,  "ciclos": [10]},
    {"usuario_idx": 6,  "ciclos": [10, 10, 10, 10, 3]},
    {"usuario_idx": 7,  "ciclos": [6]},
    {"usuario_idx": 8,  "ciclos": [10, 9]},
    {"usuario_idx": 9,  "ciclos": [10, 10, 7]},
]

fecha_base = date.today() - timedelta(days=365)

for historial in historiales:
    usuario = usuarios[historial["usuario_idx"]]
    fecha_ciclo = fecha_base

    for idx_ciclo, num_sesiones in enumerate(historial["ciclos"]):
        es_ultimo = idx_ciclo == len(historial["ciclos"]) - 1
        estado_ciclo = "activo" if es_ultimo else "cerrado"

        ciclo = Ciclo(
            usuario_id=usuario.id,
            profesional_id=profesional.id,
            fecha_inicio=fecha_ciclo,
            numero_sesiones=num_sesiones,
            estado=estado_ciclo
        )
        db.add(ciclo)
        db.flush()

        for num_sesion in range(1, num_sesiones + 1):
            fecha_sesion = fecha_ciclo + timedelta(weeks=num_sesion)
            bloque = BloqueHorario(
                profesional_id=profesional.id,
                fecha=fecha_sesion,
                hora_inicio="09:00",
                hora_fin="10:00",
                disponible=False
            )
            db.add(bloque)
            db.flush()
            reserva = Reserva(
                usuario_id=usuario.id,
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

# ==========================================
# OBJETIVOS E INDICADORES
# ==========================================
objetivos_data = [
    {
        "tipo": "Motor",
        "descripcion": "Mejorar coordinación motora gruesa",
        "indicadores": [
            "Mantiene equilibrio en un pie por 5 segundos",
            "Salta con ambos pies coordinadamente",
        ]
    },
    {
        "tipo": "Cognitivo",
        "descripcion": "Desarrollar atención sostenida",
        "indicadores": [
            "Mantiene atención en tarea por 10 minutos",
            "Sigue instrucciones de 3 pasos",
        ]
    },
    {
        "tipo": "Sensorial",
        "descripcion": "Mejorar integración sensorial",
        "indicadores": [
            "Tolera texturas variadas sin rechazo",
            "Regula respuesta ante estímulos auditivos",
        ]
    }
]

ciclos_con_objetivos = db.query(Ciclo).limit(15).all()

for ciclo in ciclos_con_objetivos:
    for obj_data in objetivos_data[:2]:
        objetivo = Objetivo(
            ciclo_id=ciclo.id,
            tipo=obj_data["tipo"],
            descripcion=obj_data["descripcion"]
        )
        db.add(objetivo)
        db.flush()
        for ind_desc in obj_data["indicadores"]:
            indicador = IndicadorLogro(
                objetivo_id=objetivo.id,
                descripcion=ind_desc
            )
            db.add(indicador)

db.commit()
db.close()

print("✅ Seed master completado")
print(f"   → 1 profesional: correo@correo.cl / 1234")
print(f"   → 30 usuarios creados")
print(f"   → Citas: ayer, hoy y 10 días adelante")
print(f"   → 10 usuarios con historial de ciclos y sesiones")
print(f"   → 15 ciclos con objetivos e indicadores")