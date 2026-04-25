import sqlite3
import os
from datetime import date, timedelta

DB_PATH = "/Users/joseluis/Documents/PROGRAMACION/proyecto_fce/fce.db"

def seed_masivo():
    if not os.path.exists(DB_PATH):
        print(f"❌ No se encuentra el archivo en: {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Definimos la carga de trabajo solicitada
    planificacion = [
        {"dias_offset": 0, "cantidad": 3, "etiqueta": "Hoy"},
        {"dias_offset": 1, "cantidad": 4, "etiqueta": "Mañana"},
        {"dias_offset": 2, "cantidad": 5, "etiqueta": "Pasado Mañana"}
    ]

    try:
        for item in planificacion:
            fecha_objetivo = (date.today() + timedelta(days=item['dias_offset'])).isoformat()
            print(f"--- Generando {item['cantidad']} citas para {item['etiqueta']} ({fecha_objetivo}) ---")

            for i in range(item['cantidad']):
                # 1. Crear el bloque horario (ajustando horas para que no choquen)
                hora_h = 9 + i
                h_inicio = f"{hora_h:02d}:00"
                h_fin = f"{hora_h:02d}:45"
                
                cursor.execute("""
                    INSERT INTO bloques_horario (profesional_id, fecha, hora_inicio, hora_fin)
                    VALUES (?, ?, ?, ?)
                """, (1, fecha_objetivo, h_inicio, h_fin))
                
                bloque_id = cursor.lastrowid

                # 2. Crear la reserva vinculada
                # Usamos usuario_id aleatorios entre 1 y 5 (asegúrate de tener usuarios creados)
                usuario_id = (i % 5) + 1 
                cursor.execute("""
                    INSERT INTO reservas (usuario_id, bloque_horario_id, estado)
                    VALUES (?, ?, ?)
                """, (usuario_id, bloque_id, "confirmada"))

        conn.commit()
        print("\n✅ Base de datos poblada exitosamente para los próximos 3 días.")

    except Exception as e:
        print(f"❌ Error durante el seed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    seed_masivo()