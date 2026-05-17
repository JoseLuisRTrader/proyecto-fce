"""
seed_master_v2.py
Seed completo del sistema FCE con datos clínicos consistentes.
Ejecutar después de recrear la BD: python seed_master_v2.py

Incluye sesiones_planificadas (Fase 1 ítem 4) con variedad de escenarios
visuales para validar la UI:
  - Plan en curso (X/Y)
  - Plan completo (Y/Y)
  - Plan excedido (X>Y)
  - Sin plan (null)
"""

from database import SessionLocal
from models import (Usuario, Profesional, BloqueHorario, Reserva,
                   Ciclo, Sesion, Objetivo, IndicadorLogro,
                   EvaluacionIndicador, Anamnesis, Diagnostico, Medicamento)
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
print("✅ Profesional creado")

# ==========================================
# DATOS DE REFERENCIA
# ==========================================
actividades = [
    "Se trabajó equilibrio y coordinación motora gruesa. Usuario muestra avances en control postural.",
    "Sesión de motricidad fina con ejercicios de pinza y manipulación de objetos pequeños.",
    "Evaluación de hitos del desarrollo con escala psicomotora. Resultados positivos.",
    "Trabajo en integración sensorial. Mejor tolerancia a estímulos táctiles y auditivos.",
    "Juego terapéutico con mayor atención sostenida en actividades dirigidas.",
    "Fortalecimiento muscular tren superior. Buena disposición y participación activa.",
    "Actividades de vida diaria: vestimenta y alimentación con utensilios adaptados.",
    "Sesión con tutor. Pautas de ejercicios para casa entregadas.",
    "Evaluación de objetivos. Avances en 3 de 4 indicadores de logro.",
    "Trabajo en coordinación visomotora con materiales estructurados.",
    "Sesión de estimulación cognitiva. Mejora en secuenciación de tareas.",
    "Actividades de regulación sensorial. Usuario más receptivo a cambios de rutina.",
]

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
            "Sigue instrucciones de 3 pasos secuenciales",
        ]
    },
    {
        "tipo": "Sensorial",
        "descripcion": "Mejorar integración sensorial",
        "indicadores": [
            "Tolera texturas variadas sin rechazo",
            "Regula respuesta ante estímulos auditivos fuertes",
        ]
    },
    {
        "tipo": "Motor Fino",
        "descripcion": "Desarrollar motricidad fina funcional",
        "indicadores": [
            "Usa pinza fina para manipular objetos pequeños",
            "Completa actividades de rasgado y pegado sin ayuda",
        ]
    }
]

diagnosticos_data = [
    ("Trastorno del desarrollo psicomotor", "CIE-10"),
    ("Trastorno del espectro autista leve", "DSM-5"),
    ("Retraso del lenguaje", "CIE-10"),
    ("Trastorno de integración sensorial", "DSM-5"),
    ("Déficit atencional sin hiperactividad", "DSM-5"),
]

medicamentos_data = [
    ("Ritalin", "10mg"),
    ("Risperdal", "0.5mg"),
    ("Melatonina", "3mg"),
    ("Omega 3", "1000mg"),
]

def crear_diagnostico(usuario_id, tipo_idx):
    d = diagnosticos_data[tipo_idx % len(diagnosticos_data)]
    diag = Diagnostico(
        usuario_id=usuario_id,
        descripcion=d[0],
        tipo=d[1],
        fecha=date.today() - timedelta(days=random.randint(30, 365))
    )
    db.add(diag)

def crear_medicamento(usuario_id, idx):
    m = medicamentos_data[idx % len(medicamentos_data)]
    med = Medicamento(
        usuario_id=usuario_id,
        nombre=m[0],
        dosis=m[1],
        fecha_inicio=date.today() - timedelta(days=random.randint(30, 180))
    )
    db.add(med)

def crear_anamnesis(ciclo_id, es_nuevo=True):
    anamnesis = Anamnesis(
        ciclo_id=ciclo_id,
        motivo_consulta="Derivado por pediatra por dificultades en el desarrollo psicomotor y retraso en habilidades motoras.",
        antecedentes="Parto a término, sin complicaciones. Desarrollo temprano con algunos retrasos en hitos motores.",
        expectativas_tutor="Mejorar la coordinación y autonomía en actividades de vida diaria.",
        evaluaciones_aplicadas="TEPSI aplicado — resultado: riesgo en área motora (puntaje 28). Escala de Desarrollo de Bayley aplicada.",
        area_motora="Riesgo",
        area_cognitiva="Normal",
        area_sensorial="Riesgo",
        area_social="Normal",
        tiene_fotografia=False,
        fecha_registro=date.today() - timedelta(days=random.randint(30, 180))
    )
    db.add(anamnesis)

def crear_ciclo_con_sesiones(usuario_id, num_sesiones, fecha_inicio, estado="cerrado",
                              motivo_cierre=None, crear_anam=True, sesiones_planificadas=None):
    """
    Crea un ciclo con sus sesiones, bloques horarios y reservas asociadas.
    Si se pasa sesiones_planificadas, queda registrado como plan terapéutico.
    """
    ciclo = Ciclo(
        usuario_id=usuario_id,
        profesional_id=profesional.id,
        fecha_inicio=fecha_inicio,
        numero_sesiones=num_sesiones,
        sesiones_planificadas=sesiones_planificadas,
        estado=estado,
        motivo_cierre=motivo_cierre,
        fecha_cierre=fecha_inicio + timedelta(weeks=num_sesiones+2) if estado == "cerrado" else None
    )
    db.add(ciclo)
    db.flush()

    if crear_anam:
        crear_anamnesis(ciclo.id)

    # Crear objetivos e indicadores
    objs_ciclo = random.sample(objetivos_data, 2)
    for obj_data in objs_ciclo:
        obj = Objetivo(
            ciclo_id=ciclo.id,
            tipo=obj_data["tipo"],
            descripcion=obj_data["descripcion"]
        )
        db.add(obj)
        db.flush()
        for ind_desc in obj_data["indicadores"]:
            ind = IndicadorLogro(
                objetivo_id=obj.id,
                descripcion=ind_desc
            )
            db.add(ind)
            db.flush()

    # Crear sesiones
    for n in range(1, num_sesiones + 1):
        fecha_sesion = fecha_inicio + timedelta(weeks=n)
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
            numero_sesion=n,
            actividades=random.choice(actividades),
            materiales="Materiales terapéuticos estándar",
            compromisos="Realizar ejercicios en casa según pauta",
            es_ingreso=(n == 1),
            es_inasistencia=False
        )
        db.add(sesion)
        db.flush()

    return ciclo

def crear_reserva_hoy(usuario_id, hora, dia_offset=0):
    dia = date.today() + timedelta(days=dia_offset)
    bloque = BloqueHorario(
        profesional_id=profesional.id,
        fecha=dia,
        hora_inicio=hora,
        hora_fin=f"{int(hora[:2])+1:02d}:{hora[3:]}",
        disponible=False
    )
    db.add(bloque)
    db.flush()
    reserva = Reserva(
        usuario_id=usuario_id,
        bloque_horario_id=bloque.id,
        estado="confirmada"
    )
    db.add(reserva)
    db.flush()
    return reserva

# ==========================================
# GRUPO A — Usuarios nuevos sin historial (8)
# ==========================================
print("\n📋 Creando Grupo A (nuevos sin historial)...")

grupo_a = [
    {"nombre": "María González",    "rut": "11111111-1", "fecha_nacimiento": date(2018, 3, 10), "nombre_tutor": "Ana González",    "estado": "lista_espera"},
    {"nombre": "Pedro Ramírez",     "rut": "22222222-2", "fecha_nacimiento": date(2019, 7, 22), "nombre_tutor": "Luis Ramírez",    "estado": "en_tto"},
    {"nombre": "Sofía Martínez",    "rut": "33333333-3", "fecha_nacimiento": date(2017, 1, 5),  "nombre_tutor": "Carmen Martínez", "estado": "en_tto"},
    {"nombre": "Diego López",       "rut": "44444444-4", "fecha_nacimiento": date(2020, 9, 18), "nombre_tutor": "Jorge López",     "estado": "lista_espera"},
    {"nombre": "Valentina Muñoz",   "rut": "55555555-5", "fecha_nacimiento": date(2018, 12, 30),"nombre_tutor": "Rosa Muñoz",      "estado": "en_tto"},
    {"nombre": "Matías Pérez",      "rut": "66666666-6", "fecha_nacimiento": date(2019, 4, 14), "nombre_tutor": "Patricia Pérez",  "estado": "en_tto"},
    {"nombre": "Isadora Rojas",     "rut": "77777777-7", "fecha_nacimiento": date(2017, 8, 25), "nombre_tutor": "Manuel Rojas",    "estado": "lista_espera"},
    {"nombre": "Benjamín Silva",    "rut": "88888888-8", "fecha_nacimiento": date(2020, 2, 7),  "nombre_tutor": "Sandra Silva",    "estado": "en_tto"},
]

usuarios_a = []
for u in grupo_a:
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    crear_diagnostico(usuario.id, len(usuarios_a))
    usuarios_a.append(usuario)
    print(f"  ✅ {u['nombre']}")

# ==========================================
# GRUPO B — En tratamiento activo (8)
# Escenarios de plan terapéutico (sesiones_planificadas):
#   i=0: 3/12        — en curso temprano
#   i=1: 5/8         — en curso medio
#   i=2: 4/10        — en curso medio
#   i=3: 6/6  ✓      — plan completo exacto
#   i=4: 7/6  ⚠️     — plan excedido
#   i=5: 3 sin plan  — sin plan definido
#   i=6: 5 sin plan  — sin plan definido
#   i=7: 4/4  ✓      — plan completo exacto
# ==========================================
print("\n📋 Creando Grupo B (tratamiento activo)...")

grupo_b = [
    {"nombre": "Antonia Vargas",    "rut": "99999999-9", "fecha_nacimiento": date(2016, 6, 19), "nombre_tutor": "Felipe Vargas",   "estado": "en_tto"},
    {"nombre": "Emilio Castro",     "rut": "10101010-1", "fecha_nacimiento": date(2017, 11, 3), "nombre_tutor": "Mónica Castro",   "estado": "en_tto"},
    {"nombre": "Camila Torres",     "rut": "12121212-1", "fecha_nacimiento": date(2016, 5, 20), "nombre_tutor": "Rosa Torres",     "estado": "en_tto"},
    {"nombre": "Ignacio Fuentes",   "rut": "13131313-1", "fecha_nacimiento": date(2018, 8, 14), "nombre_tutor": "Luis Fuentes",    "estado": "en_tto"},
    {"nombre": "Renata Soto",       "rut": "14141414-1", "fecha_nacimiento": date(2016, 3, 7),  "nombre_tutor": "Carmen Soto",     "estado": "en_tto"},
    {"nombre": "Tomás Herrera",     "rut": "15151515-1", "fecha_nacimiento": date(2019, 1, 25), "nombre_tutor": "Juan Herrera",    "estado": "en_tto"},
    {"nombre": "Florencia Díaz",    "rut": "16161616-1", "fecha_nacimiento": date(2015, 10, 12),"nombre_tutor": "Paula Díaz",      "estado": "en_tto"},
    {"nombre": "Sebastián Mora",    "rut": "17171717-1", "fecha_nacimiento": date(2017, 6, 8),  "nombre_tutor": "Elena Mora",      "estado": "en_tto"},
]

num_sesiones_b = [3, 5, 4, 6, 7, 3, 5, 4]
planes_b       = [12, 8, 10, 6, 6, None, None, 4]

usuarios_b = []
for i, u in enumerate(grupo_b):
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    crear_diagnostico(usuario.id, i)
    crear_medicamento(usuario.id, i)
    fecha_inicio = date.today() - timedelta(weeks=num_sesiones_b[i]+2)
    crear_ciclo_con_sesiones(
        usuario.id, num_sesiones_b[i], fecha_inicio,
        estado="activo", crear_anam=True,
        sesiones_planificadas=planes_b[i]
    )
    usuarios_b.append(usuario)
    plan_label = f"plan: {planes_b[i]}" if planes_b[i] else "sin plan"
    print(f"  ✅ {u['nombre']} ({num_sesiones_b[i]} sesiones, {plan_label})")

# ==========================================
# GRUPO C — Inicio nuevo ciclo (8)
# Cada usuario tiene un ciclo anterior CERRADO + un ciclo nuevo ACTIVO
# con plan=12 sesiones (escenario típico al iniciar tratamiento).
# ==========================================
print("\n📋 Creando Grupo C (inicio nuevo ciclo)...")

grupo_c = [
    {"nombre": "Javiera Núñez",     "rut": "18181818-1", "fecha_nacimiento": date(2015, 2, 17), "nombre_tutor": "Ricardo Núñez",   "estado": "en_tto"},
    {"nombre": "Cristóbal Vega",    "rut": "19191919-1", "fecha_nacimiento": date(2016, 4, 30), "nombre_tutor": "Gloria Vega",     "estado": "en_tto"},
    {"nombre": "Amanda Paredes",    "rut": "20202020-1", "fecha_nacimiento": date(2015, 9, 3),  "nombre_tutor": "Héctor Paredes",  "estado": "en_tto"},
    {"nombre": "Vicente Contreras", "rut": "21212121-1", "fecha_nacimiento": date(2018, 7, 21), "nombre_tutor": "Isabel Contreras","estado": "en_tto"},
    {"nombre": "Catalina Espinoza", "rut": "22232323-1", "fecha_nacimiento": date(2015, 11, 9), "nombre_tutor": "Marco Espinoza",  "estado": "en_tto"},
    {"nombre": "Rodrigo Sandoval",  "rut": "23242424-1", "fecha_nacimiento": date(2016, 1, 28), "nombre_tutor": "Claudia Sandoval","estado": "en_tto"},
    {"nombre": "Fernanda Ibáñez",   "rut": "24252525-1", "fecha_nacimiento": date(2015, 5, 15), "nombre_tutor": "Sergio Ibáñez",   "estado": "en_tto"},
    {"nombre": "Martín Alvarado",   "rut": "25262626-1", "fecha_nacimiento": date(2019, 3, 4),  "nombre_tutor": "Verónica Alvarado","estado": "en_tto"},
]

usuarios_c = []
for i, u in enumerate(grupo_c):
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    crear_diagnostico(usuario.id, i)
    crear_medicamento(usuario.id, i)
    # Ciclo anterior cerrado
    fecha_ciclo1 = date.today() - timedelta(weeks=random.randint(14, 20))
    crear_ciclo_con_sesiones(
        usuario.id, random.randint(8, 10), fecha_ciclo1,
        estado="cerrado", motivo_cierre="cumplimiento", crear_anam=True
    )
    # Ciclo nuevo activo sin sesiones, con plan típico de 12
    ciclo_nuevo = Ciclo(
        usuario_id=usuario.id,
        profesional_id=profesional.id,
        fecha_inicio=date.today() - timedelta(days=3),
        numero_sesiones=0,
        sesiones_planificadas=12,
        estado="activo"
    )
    db.add(ciclo_nuevo)
    db.flush()
    usuarios_c.append(usuario)
    print(f"  ✅ {u['nombre']} (ciclo anterior cerrado + nuevo ciclo activo 0/12)")

# ==========================================
# GRUPO D — Ciclos finalizados (6)
# ==========================================
print("\n📋 Creando Grupo D (ciclos finalizados)...")

grupo_d = [
    {"nombre": "Daniela Fuenzalida","rut": "26272727-1", "fecha_nacimiento": date(2014, 8, 22), "nombre_tutor": "Pablo Fuenzalida", "estado": "alta"},
    {"nombre": "Nicolás Araya",     "rut": "27282828-1", "fecha_nacimiento": date(2015, 12, 11),"nombre_tutor": "Marcela Araya",    "estado": "alta"},
    {"nombre": "Constanza Medina",  "rut": "28292929-1", "fecha_nacimiento": date(2015, 7, 6),  "nombre_tutor": "Fernando Medina",  "estado": "derivado"},
    {"nombre": "Felipe Osorio",     "rut": "29303030-1", "fecha_nacimiento": date(2016, 2, 19), "nombre_tutor": "Alejandra Osorio", "estado": "alta"},
    {"nombre": "Gabriela Riquelme", "rut": "30313131-1", "fecha_nacimiento": date(2014, 6, 28), "nombre_tutor": "Roberto Riquelme", "estado": "derivado"},
    {"nombre": "Andrés Villanueva", "rut": "31323232-1", "fecha_nacimiento": date(2015, 4, 13), "nombre_tutor": "Natalia Villanueva","estado": "alta"},
]

motivos = ["cumplimiento", "cumplimiento", "derivacion", "cumplimiento", "derivacion", "abandono"]
usuarios_d = []
for i, u in enumerate(grupo_d):
    usuario = Usuario(**u)
    db.add(usuario)
    db.flush()
    crear_diagnostico(usuario.id, i)
    fecha_ciclo = date.today() - timedelta(weeks=random.randint(20, 40))
    crear_ciclo_con_sesiones(
        usuario.id, random.randint(8, 10), fecha_ciclo,
        estado="cerrado", motivo_cierre=motivos[i], crear_anam=True
    )
    usuarios_d.append(usuario)
    print(f"  ✅ {u['nombre']} (alta/derivado - motivo: {motivos[i]})")

# ==========================================
# RESERVAS — Hoy, mañana, pasado y semana
# ==========================================
print("\n📋 Creando reservas...")

hoy = date.today()

# Citas de HOY (1 de cada grupo + pendientes de ayer)
citas_hoy = [
    (usuarios_a[0], "09:00", 0),   # Nuevo sin historial
    (usuarios_b[0], "10:00", 0),   # Tratamiento activo
    (usuarios_c[0], "11:00", 0),   # Inicio nuevo ciclo
    (usuarios_b[1], "12:00", 0),   # Tratamiento activo
    (usuarios_a[1], "14:00", 0),   # Nuevo sin historial
    (usuarios_c[1], "15:00", 0),   # Inicio nuevo ciclo
]

# Citas de MAÑANA
citas_manana = [
    (usuarios_a[2], "09:00", 1),
    (usuarios_b[2], "10:00", 1),
    (usuarios_c[2], "11:00", 1),
    (usuarios_b[3], "14:00", 1),
]

# Citas de PASADO MAÑANA
citas_pasado = [
    (usuarios_a[3], "09:00", 2),
    (usuarios_b[4], "10:00", 2),
    (usuarios_c[3], "11:00", 2),
    (usuarios_a[4], "14:00", 2),
]

# Pendientes de AYER (sin registrar)
citas_ayer = [
    (usuarios_b[5], "09:00", -1),
    (usuarios_c[4], "10:00", -1),
    (usuarios_b[6], "11:00", -1),
]

# Pendientes de ANTEAYER
citas_anteayer = [
    (usuarios_b[7], "09:00", -2),
    (usuarios_c[5], "10:00", -2),
]

# Proximos dias
citas_semana = [
    (usuarios_a[5], "09:00", 3),
    (usuarios_c[6], "10:00", 3),
    (usuarios_a[6], "09:00", 4),
    (usuarios_b[0], "10:00", 4),  # segunda cita en semana
    (usuarios_a[7], "09:00", 5),
    (usuarios_c[7], "10:00", 5),
]

todas_las_citas = citas_hoy + citas_manana + citas_pasado + citas_ayer + citas_anteayer + citas_semana

for usuario, hora, offset in todas_las_citas:
    crear_reserva_hoy(usuario.id, hora, offset)
    dia = hoy + timedelta(days=offset)
    print(f"  ✅ Reserva {dia} {hora} → {usuario.nombre}")

db.commit()
db.close()

print("\n" + "="*50)
print("✅ SEED MASTER V2 COMPLETADO")
print("="*50)
print(f"  → 1 profesional: correo@correo.cl / 1234")
print(f"  → 30 usuarios en 4 grupos")
print(f"  → Grupo A: 8 usuarios nuevos sin historial")
print(f"  → Grupo B: 8 usuarios en tratamiento activo (planes variados)")
print(f"  → Grupo C: 8 usuarios inicio nuevo ciclo (plan 0/12 cada uno)")
print(f"  → Grupo D: 6 usuarios con ciclos finalizados")
print(f"  → Citas: hoy(6), mañana(4), pasado(4), ayer(3), anteayer(2), semana(6)")
print(f"  → Pendientes sin registrar: 5 (ayer y anteayer)")