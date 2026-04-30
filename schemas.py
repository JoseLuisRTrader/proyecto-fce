from pydantic import BaseModel
from datetime import date
from typing import Optional

class UsuarioCrear(BaseModel):
    rut: str
    nombre: str
    fecha_nacimiento: date
    telefono_1: Optional[str] = None
    telefono_2: Optional[str] = None
    email: Optional[str] = None
    nombre_tutor: Optional[str] = None
    establecimiento_educacional: Optional[str] = None
    tarifa_pactada: Optional[int] = None
    foto_url: Optional[str] = None
class UsuarioRespuesta(BaseModel):
    id: int
    nombre: str
    rut: str
    fecha_nacimiento: date
    telefono_1: Optional[str] = None
    telefono_2: Optional[str] = None
    email: Optional[str] = None
    nombre_tutor: Optional[str] = None
    establecimiento_educacional: Optional[str] = None
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True

# Este es el esquema que usa el endpoint para validar los datos que llegan del Modal
class UsuarioCreate(BaseModel):
    rut: str
    nombre: str
    email: str
    password: str
    profesional_id: int
    foto_url: Optional[str] = None

class ProfesionalCrear(BaseModel):
    nombre: str
    profesion: str
    email: str
    password: str

class ProfesionalRespuesta(BaseModel):
    id: int
    nombre: str
    profesion: str
    email: str

    class Config:
        from_attributes = True

class BloqueHorarioCrear(BaseModel):
    profesional_id: int
    fecha: date
    hora_inicio: str
    hora_fin: str

class BloqueHorarioRespuesta(BaseModel):
    id: int
    profesional_id: int
    fecha: date
    hora_inicio: str
    hora_fin: str
    disponible: bool

    class Config:
        from_attributes = True

class ReservaCrear(BaseModel):
    usuario_id: int
    bloque_horario_id: int

class ReservaRespuesta(BaseModel):
    id: int
    usuario_id: int
    bloque_horario_id: int
    estado: str

    class Config:
        from_attributes = True

class CicloCrear(BaseModel):
    usuario_id: int
    profesional_id: int
    fecha_inicio: date

class CicloRespuesta(BaseModel):
    id: int
    usuario_id: int
    profesional_id: int
    fecha_inicio: date
    numero_sesiones: int
    estado: str

    class Config:
        from_attributes = True

class SesionCrear(BaseModel):
    ciclo_id: int
    reserva_id: int
    fecha: date
    numero_sesion: int
    actividades: Optional[str] = None
    materiales: Optional[str] = None
    compromisos: Optional[str] = None
    es_ingreso: bool = False

class SesionRespuesta(BaseModel):
    id: int
    ciclo_id: int
    reserva_id: int
    fecha: date
    numero_sesion: int
    actividades: Optional[str] = None
    materiales: Optional[str] = None
    compromisos: Optional[str] = None
    es_ingreso: bool

    class Config:
        from_attributes = True

class ObjetivoCrear(BaseModel):
    ciclo_id: int
    tipo: str
    descripcion: str

class ObjetivoRespuesta(BaseModel):
    id: int
    ciclo_id: int
    tipo: str
    descripcion: str

    class Config:
        from_attributes = True

class IndicadorLogroCrear(BaseModel):
    objetivo_id: int
    descripcion: str

class IndicadorLogroRespuesta(BaseModel):
    id: int
    objetivo_id: int
    descripcion: str

    class Config:
        from_attributes = True

class EvaluacionIndicadorCrear(BaseModel):
    sesion_id: int
    indicador_id: int
    cumplido: bool
    observacion: Optional[str] = None

class EvaluacionIndicadorRespuesta(BaseModel):
    id: int
    sesion_id: int
    indicador_id: int
    cumplido: bool
    observacion: Optional[str] = None

    class Config:
        from_attributes = True

class InformeCrear(BaseModel):
    ciclo_id: int
    profesional_id: int
    contenido: str
    fecha: date

class InformeRespuesta(BaseModel):
    id: int
    ciclo_id: int
    profesional_id: int
    contenido: str
    fecha: date

    class Config:
        from_attributes = True

class LoginSchema(BaseModel):
    email: str
    password: str

class UsuarioActualizar(BaseModel):
    rut: Optional[str] =None
    nombre: Optional[str] = None
    fecha_nacimiento: Optional[date] = None
    telefono_1: Optional[str] = None
    telefono_2: Optional[str] = None
    email: Optional[str] = None
    nombre_tutor: Optional[str] = None
    establecimiento_educacional: Optional[str] = None
    tarifa_pactada: Optional[int] = None

class DiagnosticoCrear(BaseModel):
    usuario_id: int
    descripcion: str
    tipo: str
    fecha: Optional[date] = None

class DiagnosticoRespuesta(BaseModel):
    id: int
    usuario_id: int
    descripcion: str
    tipo: str
    fecha: Optional[date] = None

    class Config:
        from_attributes = True

class MedicamentoCrear(BaseModel):
    usuario_id: int
    nombre: str
    dosis: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None

class MedicamentoRespuesta(BaseModel):
    id: int
    usuario_id: int
    nombre: str
    dosis: Optional[str] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None

    class Config:
        from_attributes = True