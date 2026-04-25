# seed.py
from database import SessionLocal, engine
import models
from datetime import date

# Creamos las tablas por si acaso
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

def cargar_datos_prueba():
    try:
        # 1. Crear Profesional
        pro = db.query(models.Profesional).filter_by(email="test@test.com").first()
        if not pro:
            pro = models.Profesional(
                nombre="Tu Pareja", 
                profesion="Terapeuta", 
                email="test@test.com", 
                password="123"
            )
            db.add(pro)
            db.commit()
            db.refresh(pro)

        # 2. Crear Pacientes con Tarifas Pactadas
        # Paciente con tarifa normal
        p1 = models.Usuario(
            nombre="Pedro Marmol", 
            rut="11.111.111-1", 
            email="pedro@mail.com", 
            fecha_nacimiento=date(1990,1,1),
            tarifa_pactada=35000
        )
        # Paciente con tarifa especial (Diferida)
        p2 = models.Usuario(
            nombre="Vilma Picapiedra", 
            rut="22.222.222-2", 
            email="vilma@mail.com", 
            fecha_nacimiento=date(1992,5,10),
            tarifa_pactada=25000
        )
        db.add_all([p1, p2])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)

        # 3. Crear Bloques Horarios para HOY
        # Uno en la mañana (ya pasado) y uno en la tarde
        b1 = models.BloqueHorario(profesional_id=pro.id, fecha=date.today(), hora_inicio="09:00", hora_fin="10:00", disponible=False)
        b2 = models.BloqueHorario(profesional_id=pro.id, fecha=date.today(), hora_inicio="20:00", hora_fin="21:00", disponible=False)
        db.add_all([b1, b2])
        db.commit()
        db.refresh(b1)
        db.refresh(b2)

        # 4. Crear Reservas (Citas)
        r1 = models.Reserva(usuario_id=p1.id, bloque_horario_id=b1.id, estado="confirmada")
        r2 = models.Reserva(usuario_id=p2.id, bloque_horario_id=b2.id, estado="confirmada")
        db.add_all([r1, r2])
        db.commit()

        # 5. Un Gasto de prueba para el Dashboard Financiero
        g1 = models.Gasto(categoria="Arriendo", monto=150000, descripcion="Arriendo Box Abril", fecha=date.today())
        db.add(g1)
        db.commit()

        print("✅ Base de datos recreada y datos de prueba cargados exitosamente.")
    
    except Exception as e:
        print(f"❌ Error al cargar datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cargar_datos_prueba()