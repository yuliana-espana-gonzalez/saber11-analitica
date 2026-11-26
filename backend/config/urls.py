
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    # Panel administrativo de Django
    path('admin/', admin.site.urls),

    # Usuarios, autenticación, resultados e IA
    path('api/', include('core.urls')),

    # Carga y eliminación de archivos Excel/CSV
    path('api/etl/', include('etl.urls')),
]
