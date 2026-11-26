# Saber 11 · Sistema de analítica de datos (base funcional en desarrollo)

Proyecto académico para la Secretaría de Educación Municipal de Popayán. **No es un sistema institucional oficial ni una solución validada con producción**. Código elaborado como implementación inicial de las especificaciones suministradas; ninguna prueba de integración real ha sido ejecutada en esta entrega.

## Alcance implementado en código

- Backend Django REST Framework con usuario por identificación, registro pendiente, sesiones y aprobación del funcionario a través del administrador.
- PostgreSQL obligatorio, entidades para instituciones, periodos, cargas, resultados institucionales y componentes, agregados, consultas IA y auditoría.
- ETL para `.xls` / `.xlsx` de ocho hojas y CSV tabular; conserva `N.D.` como nulo, clasifica colegios por DANE, realiza `update_or_create` en transacción y registra diagnóstico.
- Endpoints para consultar instituciones, detalle, periodos, dashboard, informes PDF, análisis y chat con Ollama local.
- React/TypeScript con navegación institucional, inicio de sesión, registro, aprobación, carga, tablas, comparativas de barras, ficha de institución, chatbot, lectura de voz y cambio de tema.

## Límites IMPORTANTES

1. **No validado con el libro oficial**: el ETL presupone que promedio/comparación/desviación comienzan en la cuarta columna desde DANE y que niveles/aprendizajes siguen a la séptima. El archivo verdadero puede tener celdas fusionadas, columnas auxiliares, distintas escalas de porcentaje y fila 10 de subencabezados. Hay que contrastar y ajustar el mapeo de cada hoja con el Excel real, comprobar integridad y construir pruebas de regresión. El año se obtiene inicialmente del primer año reconocido en metadatos, por lo que requiere validación adicional de fecha de examen.
2. No hay cálculos inventados de agregados territoriales. Los promedios municipales se muestran solo si pudieron extraerse del libro.
3. Los endpoints IA usan una muestra de hasta 20 instituciones y no permiten responder cualquier pregunta compleja con precisión. No está implementado un motor completo de consultas analíticas semánticas.
4. La internacionalización inglesa se encuentra **parcial** y se indica así en la UI.
5. No se han implementado: simulador, visualizaciones de calor/cajas y bigotes/históricas, registro con creación de usuarios desde panel, audit trail visible, esquema de niveles en tablas propias, importación robusta de todos los encabezados ICFES, comparador multiinstitución avanzado, exportación Excel y accesibilidad auditada.
6. No se pudo instalar Django en el entorno de creación (red del gestor de paquetes no disponible), por lo que **no se ejecutaron pruebas Django, PostgreSQL, compilación TypeScript ni E2E**. Se ejecutó `python -m compileall` sin errores de sintaxis en los módulos Python. También se probó directamente el parser con CSV y un libro XLSX sintético de ocho hojas (dos instituciones y cinco componentes); eso no demuestra compatibilidad con reportes oficiales.
7. No usar datos reales de estudiantes ni desplegar a internet sin revisión de protección de datos, gestión de secretos, autorización, CSRF, control de subida, HTTPS, backups y pruebas de seguridad.

## Requisitos de equipo

- Python 3.12+ compatible con las versiones del `requirements.txt` (verificar compatibilidades de versiones elegidas).
- PostgreSQL 15+.
- Node.js LTS moderno y npm.
- Visual Studio Code en Windows 10/11.
- Ollama opcional en `localhost:11434` con el modelo configurable.

## Instalación paso a paso (PowerShell de VS Code)

### 1. Base de datos PostgreSQL

Crear base de datos vacía mediante `psql` con usuario autorizado:

```sql
CREATE DATABASE proyecto_saber11;
```

### 2. Backend

```powershell
cd saber11-analitica/backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Abrir `.env`, establecer contraseña de PostgreSQL y una clave de Django segura. No publicar `.env`.

```powershell
python manage.py makemigrations core
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

`createsuperuser` solicitará identificación y correo; el administrador inicial es aprobado automáticamente en el modelo.

### 3. Frontend (segunda terminal)

```powershell
cd saber11-analitica/frontend
npm install
npm run dev
```

Abrir `http://localhost:5173` (proxy Vite -> Django). El backend usa sesiones y protección CSRF. La contraseña nunca se almacena por el frontend.

### 4. Ollama (opcional)

Instalar Ollama en el equipo y ejecutar:

```powershell
ollama pull llama3.2:1b
ollama serve
```

Si `ollama serve` ya está activo, no iniciar una segunda instancia. Si Ollama no responde, el sistema muestra un aviso y los datos estructurados disponibles.

### 5. Prueba guiada

1. Entrar con el administrador; abrir **Gestión de usuarios**.
2. En una ventana privada, registrar un funcionario; comprobar que NO accede sin aprobación.
3. Aprobar desde el administrador; ingresar como funcionario.
4. Subir `datos_demo/ejemplo_sintetico.csv` o `datos_demo/libro_ocho_hojas_SINTETICO.xlsx` para probar el flujo sin presentar los resultados como oficiales.
5. Abrir Dashboard, elegir periodo, visualizar barras, elegir institución y exportar PDF.
6. Consultar IA con Ollama activo y desactivado para verificar el fallback.

Para pruebas automáticas disponibles en código:

```powershell
cd backend
pytest
python manage.py check
```

**No afirmar que estas pruebas pasaron hasta ejecutarlas localmente.**

## API principal

- `GET /api/csrf/`
- `POST /api/registrar/`, `POST /api/login/`, `POST /api/logout/`, `GET /api/sesion/`
- `GET /api/usuarios/`, `PATCH|DELETE /api/usuarios/<id>/` (administrador)
- `GET /api/periodos/`, `GET /api/instituciones/`, `GET /api/instituciones/<id>/`
- `GET /api/dashboard/?periodo=<id>`
- `GET|POST /api/etl/cargas/` (multipart `archivo`)
- `POST /api/analisis/`, `POST /api/chat/`, `GET /api/informe/`

## Organización

`backend/core`: modelos, autorizaciones y endpoints. `backend/etl`: parser y persistencia. `frontend/src`: interfaz React. `docs/sdd`: definición, especificación, matriz de trazabilidad y registro de decisiones. `presentacion`: exposición editable. `datos_demo`: datos totalmente ficticios.

## Próximos pasos prioritarios

Validar ocho hojas sobre el **archivo ICFES real** con pruebas exactas de datos, separar el importador de lectura y reconciliación, implementar migraciones versionadas con Django instalado, endurecer roles/permisos, ampliar filtros y todos los gráficos, añadir tests de integración con PostgreSQL, completar traducciones y grabar evidencias reales antes de una sustentación.
