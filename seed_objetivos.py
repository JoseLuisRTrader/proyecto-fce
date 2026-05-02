from database import SessionLocal
from models import Objetivo, IndicadorLogro, Ciclo

db = SessionLocal()

# Obtener ciclos existentes
ciclos = db.query(Ciclo).all()

objetivos_data = [
    {
        "tipo": "Motor",
        "descripcion": "Mejorar coordinación motora gruesa",
        "indicadores": [
            "Mantiene equilibrio en un pie por 5 segundos",
            "Salta con ambos pies coordinadamente",
            "Lanza y atrapa pelota a 2 metros"
        ]
    },
    {
        "tipo": "Cognitivo",
        "descripcion": "Desarrollar atención sostenida",
        "indicadores": [
            "Mantiene atención en tarea por 10 minutos",
            "Sigue instrucciones de 3 pasos",
            "Completa actividad sin distracción"
        ]
    },
    {
        "tipo": "Sensorial",
        "descripcion": "Mejorar integración sensorial",
        "indicadores": [
            "Tolera texturas variadas sin rechazo",
            "Regula respuesta ante estímulos auditivos",
            "Acepta contacto físico en actividades grupales"
        ]
    }
]

for ciclo in ciclos[:10]:  # Solo primeros 10 ciclos
    for obj_data in objetivos_data[:2]:  # 2 objetivos por ciclo
        objetivo = Objetivo(
            ciclo_id=ciclo.id,
            tipo=obj_data["tipo"],
            descripcion=obj_data["descripcion"]
        )
        db.add(objetivo)
        db.flush()

        for ind_desc in obj_data["indicadores"][:2]:  # 2 indicadores por objetivo
            indicador = IndicadorLogro(
                objetivo_id=objetivo.id,
                descripcion=ind_desc
            )
            db.add(indicador)

db.commit()
db.close()
print("✅ Objetivos e indicadores creados correctamente")
print(f"   → {len(ciclos[:10])} ciclos con 2 objetivos y 2 indicadores cada uno")