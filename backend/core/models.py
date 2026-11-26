from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.validators import MinValueValidator, MaxValueValidator



class UsuarioManager(BaseUserManager):

    def create_user(self, identificacion, email, password=None, **extra_fields):
        if not identificacion:
            raise ValueError("La identificación es obligatoria")

        if not email:
            raise ValueError("El correo electrónico es obligatorio")

        email = self.normalize_email(email)

        usuario = self.model(
            identificacion=identificacion,
            email=email,
            **extra_fields
        )

        usuario.set_password(password)
        usuario.save(using=self._db)

        return usuario

    def create_superuser(self, identificacion, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("El administrador debe tener is_staff=True")

        if extra_fields.get("is_superuser") is not True:
            raise ValueError("El administrador debe tener is_superuser=True")

        return self.create_user(
            identificacion,
            email,
            password,
            **extra_fields
        )


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrador'
        FUNCIONARIO = 'FUNCIONARIO', 'Funcionario'
    class Aprobacion(models.TextChoices):
        PENDIENTE='PENDIENTE','Pendiente'
        APROBADO='APROBADO','Aprobado'
        RECHAZADO='RECHAZADO','Rechazado'
    username = None
    identificacion = models.CharField(max_length=30,unique=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    rol = models.CharField(max_length=12,choices=Rol.choices,default=Rol.FUNCIONARIO)
    aprobacion = models.CharField(max_length=12,choices=Aprobacion.choices,default=Aprobacion.PENDIENTE)
    actualizado = models.DateTimeField(auto_now=True)
    USERNAME_FIELD = 'identificacion'
    REQUIRED_FIELDS = ['email']
    objects = UsuarioManager()
    def save(self,*args,**kwargs):
        if self.is_superuser:
            self.rol=self.Rol.ADMIN
            self.aprobacion=self.Aprobacion.APROBADO
        super().save(*args,**kwargs)

class Institucion(models.Model):
    codigo_dane=models.CharField(max_length=20,unique=True,db_index=True)
    nombre=models.CharField(max_length=260)
    municipio=models.CharField(max_length=120,default='POPAYAN')
    departamento=models.CharField(max_length=120,default='CAUCA')
    naturaleza=models.CharField(max_length=60,blank=True)
    zona=models.CharField(max_length=60,blank=True)
    direccion=models.CharField(max_length=260,blank=True)
    def __str__(self): return self.nombre

class Periodo(models.Model):
    anio=models.PositiveSmallIntegerField()
    periodo=models.CharField(max_length=35,default='UNICO')
    fecha_examen=models.DateField(null=True,blank=True)
    fecha_actualizacion=models.DateField(null=True,blank=True)
    fuente=models.CharField(max_length=180,default='ICFES')
    class Meta: constraints=[models.UniqueConstraint(fields=['anio','periodo'],name='unico_periodo')]

class Carga(models.Model):
    usuario=models.ForeignKey(Usuario,on_delete=models.PROTECT)
    nombre=models.CharField(max_length=260)
    sha256=models.CharField(max_length=64,db_index=True)
    fecha=models.DateTimeField(auto_now_add=True)
    estado=models.CharField(max_length=16,default='PROCESANDO')
    detectados=models.PositiveIntegerField(default=0)
    insertados=models.PositiveIntegerField(default=0)
    actualizados=models.PositiveIntegerField(default=0)
    rechazados=models.PositiveIntegerField(default=0)
    diagnostico=models.JSONField(default=dict)

class Resultado(models.Model):
    institucion=models.ForeignKey(Institucion,on_delete=models.CASCADE,related_name='resultados')
    periodo=models.ForeignKey(Periodo,on_delete=models.PROTECT)
    carga=models.ForeignKey(Carga,on_delete=models.PROTECT)
    promedio_global=models.DecimalField(max_digits=7,decimal_places=2,null=True,blank=True)
    desviacion_global=models.DecimalField(max_digits=7,decimal_places=2,null=True,blank=True)
    comparacion_global=models.CharField(max_length=20,blank=True)
    matriculados=models.PositiveIntegerField(null=True,blank=True)
    registrados=models.PositiveIntegerField(null=True,blank=True)
    presentes=models.PositiveIntegerField(null=True,blank=True)
    publicados=models.PositiveIntegerField(null=True,blank=True)
    class Meta: constraints=[models.UniqueConstraint(fields=['institucion','periodo'],name='unico_resultado_periodo')]

class Componente(models.Model):
    resultado=models.ForeignKey(Resultado,on_delete=models.CASCADE,related_name='componentes')
    nombre=models.CharField(max_length=50)
    promedio=models.DecimalField(max_digits=7,decimal_places=2,null=True,blank=True)
    desviacion=models.DecimalField(max_digits=7,decimal_places=2,null=True,blank=True)
    comparacion=models.CharField(max_length=20,blank=True)
    comparacion_desviacion=models.CharField(max_length=20,blank=True)
    niveles=models.JSONField(default=dict)
    aprendizajes=models.JSONField(default=dict)
    class Meta: constraints=[models.UniqueConstraint(fields=['resultado','nombre'],name='unico_componente')]

class AgregadoTerritorial(models.Model):
    periodo=models.ForeignKey(Periodo,on_delete=models.CASCADE)
    etiqueta=models.CharField(max_length=160)
    componente=models.CharField(max_length=50,default='GLOBAL')
    promedio=models.DecimalField(max_digits=7,decimal_places=2,null=True,blank=True)
    class Meta: constraints=[models.UniqueConstraint(fields=['periodo','etiqueta','componente'],name='unico_agregado')]

class ConsultaIA(models.Model):
    usuario=models.ForeignKey(Usuario,on_delete=models.PROTECT)
    pregunta=models.TextField()
    respuesta=models.TextField()
    contexto=models.JSONField(default=dict)
    fecha=models.DateTimeField(auto_now_add=True)

class Auditoria(models.Model):
    usuario=models.ForeignKey(Usuario,on_delete=models.SET_NULL,null=True)
    accion=models.CharField(max_length=90)
    entidad=models.CharField(max_length=120)
    detalle=models.JSONField(default=dict)
    fecha=models.DateTimeField(auto_now_add=True)
