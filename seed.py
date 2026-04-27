from database import SessionLocal
from models import Usuario, BloqueHorario, Reserva
from datetime import date

db = SessionLocal()

hoy = date.today()
profesional_id = 1

usuarios_data = [
    {"nombre": "Camila Torres", "rut": "11111111-1", "fecha_nacimiento": date(2015, 3, 10), "nombre_tutor": "Rosa Torres"},
    {"nombre": "Ignacio Fuentes", "rut": "22222222-2", "fecha_nacimiento": date(2016, 7, 22), "nombre_tutor": "Luis Fuentes"},
    {"nombre": "Renata Soto", "rut": "33333333-3", "fecha_nacimiento": date(2014, 1, 5), "nombre_tutor": "Carmen Soto"},
]

horarios = ["09:00", "10:00", "11:00"]

for i, u in enumerate(usuarios_data):
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()

    bloque = BloqueHorario(
        profesional_id=profesional_id,
        fecha=hoy,
        hora_inicio=horarios[i],
        hora_fin=f"{int(horarios[i][:2])+1:02d}:00",
        disponible=False
    )
    db.add(bloque)
    db.flush()

    reserva = Reserva(
        usuario_id=usuario.id,
        bloque_horario_id=bloque.id,
        estado="confirmada"
    )
    db.add(reserva)

db.commit()
db.close()
print("✅ Datos de hoy creados correctamente")