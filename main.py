from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from routers import usuarios, profesionales, bloques_horario, reservas, ciclos, sesiones, objetivos, indicadores, informes, dashboard, finanzas

app = FastAPI()

app.mount("/static", StaticFiles(directory="static"), name="static")

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

@app.get("/")
def inicio():
    return FileResponse("templates/login.html")

@app.get("/dashboard")
def dashboard():
    return FileResponse("templates/dashboard.html")

