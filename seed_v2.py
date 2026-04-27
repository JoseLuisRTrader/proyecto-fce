from database import SessionLocal
from models import Usuario, BloqueHorario, Reserva, Profesional
from datetime import date, timedelta

db = SessionLocal()

# Usar el profesional existente (id=1)
profesional_id = 1

# Usuarios de prueba
usuarios_data = [
    {"nombre": "María González", "rut": "12345678-1", "fecha_nacimiento": date(2015, 3, 10), "nombre_tutor": "Ana González"},
    {"nombre": "Pedro Ramírez", "rut": "12345678-2", "fecha_nacimiento": date(2016, 7, 22), "nombre_tutor": "Luis Ramírez"},
    {"nombre": "Sofía Martínez", "rut": "12345678-3", "fecha_nacimiento": date(2014, 1, 5), "nombre_tutor": "Carmen Martínez"},
    {"nombre": "Diego López", "rut": "12345678-4", "fecha_nacimiento": date(2017, 9, 18), "nombre_tutor": "Jorge López"},
    {"nombre": "Valentina Muñoz", "rut": "12345678-5", "fecha_nacimiento": date(2015, 12, 30), "nombre_tutor": "Rosa Muñoz"},
    {"nombre": "Matías Pérez", "rut": "12345678-6", "fecha_nacimiento": date(2016, 4, 14), "nombre_tutor": "Patricia Pérez"},
    {"nombre": "Isadora Rojas", "rut": "12345678-7", "fecha_nacimiento": date(2013, 8, 25), "nombre_tutor": "Manuel Rojas"},
    {"nombre": "Benjamín Silva", "rut": "12345678-8", "fecha_nacimiento": date(2018, 2, 7), "nombre_tutor": "Sandra Silva"},
    {"nombre": "Antonia Vargas", "rut": "12345678-9", "fecha_nacimiento": date(2014, 6, 19), "nombre_tutor": "Felipe Vargas"},
    {"nombre": "Emilio Castro", "rut": "12345678-0", "fecha_nacimiento": date(2017, 11, 3), "nombre_tutor": "Mónica Castro"},
]

# Crear usuarios
usuarios = []
for u in usuarios_data:
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    usuarios.append(usuario)

# Horarios de prueba
horarios = ["09:00", "10:00", "11:00", "12:00", "15:00"]

# Crear bloques y reservas para los próximos 10 días
hoy = date.today()
usuario_idx = 0

for i in range(1, 11):
    dia = hoy + timedelta(days=i)
    
    # 2-3 citas por día
    for j in range(min(3, len(usuarios) - usuario_idx)):
        bloque = BloqueHorario(
            profesional_id=profesional_id,
            fecha=dia,
            hora_inicio=horarios[j],
            hora_fin=horarios[j].replace(str(int(horarios[j][:2])), str(int(horarios[j][:2]) + 1)),
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
print("✅ Datos de prueba creados correctamente para los próximos 10 días")