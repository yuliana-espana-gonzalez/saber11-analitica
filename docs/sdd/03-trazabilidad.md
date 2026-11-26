# Matriz de trazabilidad · Estado verificable

| RF | Componente | Archivo principal | API | Verificación en esta entrega |
|---|---|---|---|---|
| RF01 | ETL libros/CSV | `etl/parser.py`, `etl/views.py` | POST `/api/etl/cargas/` | Sintaxis; prueba real pendiente |
| RF02 | Consultas por periodo | `core/views.py` | GET `/api/dashboard/` | Integración pendiente |
| RF03 | Tabla y barras | `frontend/src/App.tsx` | GET `/api/dashboard/` | Build pendiente |
| RF04 | PDF resumen | `core/views.py` | GET `/api/informe/` | Integración pendiente |
| RF05 | Usuarios | `core/views.py` | PATCH/DELETE `/api/usuarios/{id}/` | Integración pendiente |
| RF06 | Login/sesión | `core/views.py` | POST `/api/login/` | Integración pendiente |
| RF07 | Interpretación IA | `core/views.py` | POST `/api/analisis/` | Ollama real pendiente |
| RF08 | Chatbot | `core/views.py`, `App.tsx` | POST `/api/chat/` | Ollama real pendiente |
| RF09 | Español e inglés | `App.tsx` | Frontend | Parcial: traducciones pendientes |
| RF10 | Lectura de voz | `App.tsx` | Web Speech API | Navegadores pendientes |
| RF11 | Aprobación | `core/views.py` | PATCH `/api/usuarios/{id}/` | Integración pendiente |
| RF12 | Historial | `etl/views.py` | GET `/api/etl/cargas/` | Integración pendiente |
| RF13 | Ficha institución | `core/views.py` | GET `/api/instituciones/{id}/` | Integración pendiente |
| RF14 | Filtros | `core/views.py` | GET dashboard periodo | Parcial: filtro de periodo |
| RF15 | Exportación | `core/views.py` | GET `/api/informe/` | Parcial: PDF sencillo |
| RF16 | Preferencias | `App.tsx` | localStorage | Parcial: local, no cuenta |
| RF17 | Trazabilidad | `core/models.py` | FK Resultado→Carga | Parcial: sin vista de origen |

**Nota:** presencia de código no equivale a prueba aprobada. La sintaxis Python fue la única verificación ejecutada sobre el backend.
