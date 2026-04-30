from database import SessionLocal
from models import Usuario, BloqueHorario, Reserva, Profesional
from datetime import date, timedelta

db = SessionLocal()

# PROFESIONAL
profesional = Profesional(
    nombre="Jose Luis",
    profesion="Terapeuta Ocupacional",
    email="correo@correo.cl",
    password="1234"
)
db.add(profesional)
db.flush()

# 30 USUARIOS
usuarios_data = [
    {"nombre": "María González",     "rut": "11111111-1", "fecha_nacimiento": date(2015, 3, 10),  "nombre_tutor": "Ana González",     "estado": "en_tto"},
    {"nombre": "Pedro Ramírez",      "rut": "22222222-2", "fecha_nacimiento": date(2016, 7, 22),  "nombre_tutor": "Luis Ramírez",      "estado": "en_tto"},
    {"nombre": "Sofía Martínez",     "rut": "33333333-3", "fecha_nacimiento": date(2014, 1, 5),   "nombre_tutor": "Carmen Martínez",   "estado": "en_tto"},
    {"nombre": "Diego López",        "rut": "44444444-4", "fecha_nacimiento": date(2017, 9, 18),  "nombre_tutor": "Jorge López",       "estado": "pausa"},
    {"nombre": "Valentina Muñoz",    "rut": "55555555-5", "fecha_nacimiento": date(2015, 12, 30), "nombre_tutor": "Rosa Muñoz",        "estado": "en_tto"},
    {"nombre": "Matías Pérez",       "rut": "66666666-6", "fecha_nacimiento": date(2016, 4, 14),  "nombre_tutor": "Patricia Pérez",    "estado": "alta"},
    {"nombre": "Isadora Rojas",      "rut": "77777777-7", "fecha_nacimiento": date(2013, 8, 25),  "nombre_tutor": "Manuel Rojas",      "estado": "en_tto"},
    {"nombre": "Benjamín Silva",     "rut": "88888888-8", "fecha_nacimiento": date(2018, 2, 7),   "nombre_tutor": "Sandra Silva",      "estado": "en_tto"},
    {"nombre": "Antonia Vargas",     "rut": "99999999-9", "fecha_nacimiento": date(2014, 6, 19),  "nombre_tutor": "Felipe Vargas",     "estado": "lista_espera"},
    {"nombre": "Emilio Castro",      "rut": "10101010-1", "fecha_nacimiento": date(2017, 11, 3),  "nombre_tutor": "Mónica Castro",     "estado": "en_tto"},
    {"nombre": "Camila Torres",      "rut": "12121212-1", "fecha_nacimiento": date(2015, 5, 20),  "nombre_tutor": "Rosa Torres",       "estado": "en_tto"},
    {"nombre": "Ignacio Fuentes",    "rut": "13131313-1", "fecha_nacimiento": date(2016, 8, 14),  "nombre_tutor": "Luis Fuentes",      "estado": "alta"},
    {"nombre": "Renata Soto",        "rut": "14141414-1", "fecha_nacimiento": date(2014, 3, 7),   "nombre_tutor": "Carmen Soto",       "estado": "en_tto"},
    {"nombre": "Tomás Herrera",      "rut": "15151515-1", "fecha_nacimiento": date(2019, 1, 25),  "nombre_tutor": "Juan Herrera",      "estado": "en_tto"},
    {"nombre": "Florencia Díaz",     "rut": "16161616-1", "fecha_nacimiento": date(2013, 10, 12), "nombre_tutor": "Paula Díaz",        "estado": "derivado"},
    {"nombre": "Sebastián Mora",     "rut": "17171717-1", "fecha_nacimiento": date(2016, 6, 8),   "nombre_tutor": "Elena Mora",        "estado": "en_tto"},
    {"nombre": "Javiera Núñez",      "rut": "18181818-1", "fecha_nacimiento": date(2015, 2, 17),  "nombre_tutor": "Ricardo Núñez",     "estado": "en_tto"},
    {"nombre": "Cristóbal Vega",     "rut": "19191919-1", "fecha_nacimiento": date(2017, 4, 30),  "nombre_tutor": "Gloria Vega",       "estado": "pausa"},
    {"nombre": "Amanda Paredes",     "rut": "20202020-1", "fecha_nacimiento": date(2014, 9, 3),   "nombre_tutor": "Héctor Paredes",    "estado": "en_tto"},
    {"nombre": "Vicente Contreras",  "rut": "21212121-1", "fecha_nacimiento": date(2018, 7, 21),  "nombre_tutor": "Isabel Contreras",  "estado": "lista_espera"},
    {"nombre": "Catalina Espinoza",  "rut": "22232323-1", "fecha_nacimiento": date(2015, 11, 9),  "nombre_tutor": "Marco Espinoza",    "estado": "en_tto"},
    {"nombre": "Rodrigo Sandoval",   "rut": "23242424-1", "fecha_nacimiento": date(2016, 1, 28),  "nombre_tutor": "Claudia Sandoval",  "estado": "alta"},
    {"nombre": "Fernanda Ibáñez",    "rut": "24252525-1", "fecha_nacimiento": date(2013, 5, 15),  "nombre_tutor": "Sergio Ibáñez",     "estado": "en_tto"},
    {"nombre": "Martín Alvarado",    "rut": "25262626-1", "fecha_nacimiento": date(2019, 3, 4),   "nombre_tutor": "Verónica Alvarado", "estado": "en_tto"},
    {"nombre": "Daniela Fuenzalida", "rut": "26272727-1", "fecha_nacimiento": date(2014, 8, 22),  "nombre_tutor": "Pablo Fuenzalida",  "estado": "derivado"},
    {"nombre": "Nicolás Araya",      "rut": "27282828-1", "fecha_nacimiento": date(2017, 12, 11), "nombre_tutor": "Marcela Araya",     "estado": "en_tto"},
    {"nombre": "Constanza Medina",   "rut": "28292929-1", "fecha_nacimiento": date(2015, 7, 6),   "nombre_tutor": "Fernando Medina",   "estado": "en_tto"},
    {"nombre": "Felipe Osorio",      "rut": "29303030-1", "fecha_nacimiento": date(2016, 2, 19),  "nombre_tutor": "Alejandra Osorio",  "estado": "pausa"},
    {"nombre": "Gabriela Riquelme",  "rut": "30313131-1", "fecha_nacimiento": date(2013, 6, 28),  "nombre_tutor": "Roberto Riquelme",  "estado": "en_tto"},
    {"nombre": "Andrés Villanueva",  "rut": "31323232-1", "fecha_nacimiento": date(2018, 4, 13),  "nombre_tutor": "Natalia Villanueva","estado": "en_tto"},
]

usuarios = []
for u in usuarios_data:
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    usuarios.append(usuario)

# BLOQUES Y RESERVAS
horarios = ["09:00", "10:00", "11:00", "12:00", "15:00", "16:00"]
hoy = date.today()

# Ayer, hoy y 10 días adelante
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

db.commit()
db.close()
print("✅ Seed completo creado correctamente")
print(f"   → 1 profesional: correo@correo.cl / 1234")
print(f"   → 30 usuarios creados")
print(f"   → Citas: ayer, hoy y 10 días adelante")