import os
import shutil

from database import get_db
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Request
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from routers import (usuarios, profesionales, bloques_horario, reservas, 
                     ciclos, sesiones, objetivos, indicadores, informes, 
                     dashboard, finanzas, diagnosticos, medicamentos, anamnesis)

app = FastAPI()
templates = Jinja2Templates(directory="templates")

app.mount("/static", StaticFiles(directory="static"), name="static")

# Routers
app.include_router(usuarios.router)
app.include_router(profesionales.router)
app.include_router(bloques_horario.router)
app.include_router(reservas.router)
app.include_router(ciclos.router)
app.include_router(sesiones.router)
app.include_router(objetivos.router)
app.include_router(indicadores.router)
app.include_router(informes.router)
app.include_router(dashboard.router)
app.include_router(finanzas.router)
app.include_router(diagnosticos.router)
app.include_router(medicamentos.router)
app.include_router(anamnesis.router)

# Páginas
@app.get("/")
def inicio(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/dashboard")
def pagina_dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request, "active": "dashboard"})

@app.get("/usuarios")
def pagina_usuarios(request: Request):
    return templates.TemplateResponse("usuarios.html", {"request": request, "active": "usuarios"})

@app.get("/registro")
def pagina_registro(request: Request):
    return templates.TemplateResponse("registro.html", {"request": request, "active": "registro"})

@app.get("/ficha/{usuario_id}")
def pagina_ficha_usuario(usuario_id: int, request: Request):
    return templates.TemplateResponse("ficha_usuario.html", {"request": request, "active": "usuarios"})

# Subir foto de usuario
@app.post("/usuarios/{usuario_id}/foto")
async def subir_foto(usuario_id: int, foto: UploadFile = File(...), db: Session = Depends(get_db)):
    from models import Usuario
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    os.makedirs("static/fotos", exist_ok=True)
    extension = foto.filename.split(".")[-1]
    nombre_archivo = f"usuario_{usuario_id}.{extension}"
    ruta = f"static/fotos/{nombre_archivo}"
    
    with open(ruta, "wb") as buffer:
        shutil.copyfileobj(foto.file, buffer)
    
    foto_url = f"/static/fotos/{nombre_archivo}"
    usuario.foto_url = foto_url
    db.commit()
    
    return {"foto_url": foto_url}