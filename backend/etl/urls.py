
from django.urls import path
from . import views

urlpatterns = [
    path(
        'cargas/',
        views.cargar,
        name='etl_cargas'
    ),
]
