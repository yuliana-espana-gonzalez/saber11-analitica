from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario,Institucion,Periodo,Carga,Resultado,Componente,AgregadoTerritorial,Auditoria,ConsultaIA
@admin.register(Usuario)
class AdminUsuario(UserAdmin):
    model=Usuario
    ordering=('identificacion',)
    list_display=('identificacion','email','rol','aprobacion','is_active')
    fieldsets=((None,{'fields':('identificacion','password')}),('Datos',{'fields':('first_name','last_name','email')}),('Permisos',{'fields':('rol','aprobacion','is_active','is_staff','is_superuser','groups','user_permissions')}),('Fechas',{'fields':('last_login','date_joined')}))
    add_fieldsets=((None,{'classes':('wide',),'fields':('identificacion','email','password1','password2')}),)
for model in [Institucion,Periodo,Carga,Resultado,Componente,AgregadoTerritorial,Auditoria,ConsultaIA]: admin.site.register(model)
