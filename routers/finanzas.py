from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract
from database import get_db
import models
from datetime import date

router = APIRouter(prefix="/finanzas", tags=["Finanzas"])

@router.get("/resumen-mensual")
def obtener_resumen(db: Session = Depends(get_db)):
    hoy = date.today()
    # Sumamos ingresos del mes actual
    ingresos = db.query(models.Ingreso).filter(
        extract('month', models.Ingreso.fecha_emision) == hoy.month,
        extract('year', models.Ingreso.fecha_emision) == hoy.year
    ).all()
    
    total_ingresos = sum(i.monto for i in ingresos)
    
    # Sumamos gastos del mes actual
    gastos = db.query(models.Gasto).filter(
        extract('month', models.Gasto.fecha) == hoy.month
    ).all()
    
    total_gastos = sum(g.monto for g in gastos)
    
    return {
        "ingresos": total_ingresos,
        "gastos": total_gastos,
        "utilidad": total_ingresos - total_gastos
    }