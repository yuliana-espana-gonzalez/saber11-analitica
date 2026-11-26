
from django.urls import path
from . import views

urlpatterns = [
    # AUTENTICACIÓN
    path('csrf/', views.csrf),
    path('registrar/', views.registrar),
    path('login/', views.login_view),
    path('logout/', views.logout_view),
    path('sesion/', views.sesion),

    # ADMINISTRADOR
    path('usuarios/', views.usuarios),
    path('usuarios/<int:pk>/', views.usuario_detalle),

    # FUNCIONARIO
    path('instituciones/', views.instituciones),
    path('instituciones/<int:pk>/', views.institucion_detalle),
    path(
        'instituciones/<int:pk>/comparacion/',
        views.comparacion_institucion
    ),

    # RESULTADOS
    path('periodos/', views.periodos),
    path('dashboard/', views.dashboard),

    # INTELIGENCIA ARTIFICIAL
    path('analisis/', views.analisis),
    path('chat/', views.chat),

    # INFORMES
    path('informe/', views.informe),
]
