from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import date

class Profesional(Base):
    __tablename__ = "profesionales"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    profesion = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    rut = Column(String, unique=True, index=True)
    nombre = Column(String, index=True)
    email = Column(String, nullable=True)
    fecha_nacimiento = Column(Date)
    establecimiento_educacional = Column(String, nullable=True)
    nombre_tutor = Column(String, nullable=True)
    telefono_1 = Column(String, nullable=True)
    telefono_2 = Column(String, nullable=True)
    tarifa_pactada = Column(Integer, nullable=True)
    estado = Column(String, default="en_tto")
    foto_url = Column(String, nullable=True)

    reservas = relationship("Reserva", back_populates="usuario")
    ingresos = relationship("Ingreso", back_populates="usuario")
    ciclos = relationship("Ciclo", back_populates="usuario")

class BloqueHorario(Base):
    __tablename__ = "bloques_horario"
    id = Column(Integer, primary_key=True, index=True)
    profesional_id = Column(Integer, ForeignKey("profesionales.id"))
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(String, nullable=False)
    hora_fin = Column(String, nullable=False)
    disponible = Column(Boolean, default=True)

    reserva = relationship("Reserva", back_populates="bloque", uselist=False)

class Reserva(Base):
    __tablename__ = "reservas"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    bloque_horario_id = Column(Integer, ForeignKey("bloques_horario.id"))
    estado = Column(String, default="confirmada")

    usuario = relationship("Usuario", back_populates="reservas")
    bloque = relationship("BloqueHorario", back_populates="reserva")
    sesion = relationship("Sesion", back_populates="reserva", uselist=False)
class Ciclo(Base):
    __tablename__ = "ciclos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    profesional_id = Column(Integer, ForeignKey("profesionales.id"))
    fecha_inicio = Column(Date)
    fecha_cierre = Column(Date, nullable=True)        # ← nuevo
    numero_sesiones = Column(Integer, default=0)
    estado = Column(String, default="activo")
    motivo_cierre = Column(String, nullable=True)     # ← nuevo
    observacion_cierre = Column(Text, nullable=True)  # ← nuevo

    usuario = relationship("Usuario", back_populates="ciclos")
    objetivos = relationship("Objetivo", back_populates="ciclo")
    sesiones = relationship("Sesion", back_populates="ciclo")
    anamnesis = relationship("Anamnesis", back_populates="ciclo", uselist=False)

class Objetivo(Base):
    __tablename__ = "objetivos"
    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"))
    tipo = Column(String, nullable=False)
    descripcion = Column(Text, nullable=False)
    es_general = Column(Boolean, default=False)

    ciclo = relationship("Ciclo", back_populates="objetivos")
    indicadores = relationship("IndicadorLogro", back_populates="objetivo")

class IndicadorLogro(Base):
    __tablename__ = "indicadores_logro"
    id = Column(Integer, primary_key=True, index=True)
    objetivo_id = Column(Integer, ForeignKey("objetivos.id"))
    descripcion = Column(Text, nullable=False)

    objetivo = relationship("Objetivo", back_populates="indicadores")
    evaluaciones = relationship("EvaluacionIndicador", back_populates="indicador")

class Sesion(Base):
    __tablename__ = "sesiones"
    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"))
    reserva_id = Column(Integer, ForeignKey("reservas.id"))
    fecha = Column(Date)
    numero_sesion = Column(Integer)
    actividades = Column(Text)
    materiales = Column(Text)
    compromisos = Column(Text)
    es_ingreso = Column(Boolean, default=False)
    es_inasistencia = Column(Boolean, default=False, server_default='0')

    ciclo = relationship("Ciclo", back_populates="sesiones")
    reserva = relationship("Reserva", back_populates="sesion")
    evaluaciones = relationship("EvaluacionIndicador", back_populates="sesion")

class Anamnesis(Base):
    __tablename__ = "anamnesis"
    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"), unique=True)
    motivo_consulta = Column(Text, nullable=True)
    antecedentes = Column(Text, nullable=True)
    expectativas_tutor = Column(Text, nullable=True)
    evaluaciones_aplicadas = Column(Text, nullable=True)
    area_motora = Column(String, nullable=True)
    area_cognitiva = Column(String, nullable=True)
    area_sensorial = Column(String, nullable=True)
    area_social = Column(String, nullable=True)
    tiene_fotografia = Column(Boolean, default=False)
    fecha_registro = Column(Date, default=date.today)

    ciclo = relationship("Ciclo", back_populates="anamnesis")

class EvaluacionIndicador(Base):
    __tablename__ = "evaluaciones_indicador"
    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"))
    indicador_id = Column(Integer, ForeignKey("indicadores_logro.id"))
    cumplido = Column(Boolean)
    observacion = Column(Text)

    sesion = relationship("Sesion", back_populates="evaluaciones")
    indicador = relationship("IndicadorLogro", back_populates="evaluaciones")

class Ingreso(Base):
    __tablename__ = "ingresos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    concepto = Column(String, nullable=False)
    monto = Column(Integer, nullable=False)
    fecha_emision = Column(Date, default=date.today)
    estado = Column(String, default="pendiente")
    metodo_pago = Column(String, nullable=True)
    observaciones = Column(String, nullable=True)
    sesion_id = Column(Integer, ForeignKey("sesiones.id"), nullable=True)
    informe_id = Column(Integer, ForeignKey("informes.id"), nullable=True)

    usuario = relationship("Usuario", back_populates="ingresos")

class Gasto(Base):
    __tablename__ = "gastos"
    id = Column(Integer, primary_key=True, index=True)
    categoria = Column(String, nullable=False)
    monto = Column(Integer, nullable=False)
    fecha = Column(Date, default=date.today)
    descripcion = Column(String, nullable=True)

class Diagnostico(Base):
    __tablename__ = "diagnosticos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    descripcion = Column(String, nullable=False)
    tipo = Column(String, nullable=False)
    fecha = Column(Date)

class Medicamento(Base):
    __tablename__ = "medicamentos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    nombre = Column(String, nullable=False)
    dosis = Column(String)
    fecha_inicio = Column(Date)
    fecha_fin = Column(Date)

class Informe(Base):
    __tablename__ = "informes"
    id = Column(Integer, primary_key=True, index=True)
    ciclo_id = Column(Integer, ForeignKey("ciclos.id"))
    profesional_id = Column(Integer, ForeignKey("profesionales.id"))
    contenido = Column(Text)
    fecha = Column(Date)