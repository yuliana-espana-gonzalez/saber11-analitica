import io, os, json, unicodedata
from datetime import date
from django.contrib.auth import authenticate,login,logout
from django.db import transaction
from django.db.models import Count,Avg,Sum
from django.http import FileResponse
from django.middleware.csrf import get_token
from rest_framework.decorators import api_view,permission_classes,throttle_classes
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Usuario,Institucion,Periodo,Carga,Resultado,Componente,AgregadoTerritorial,Auditoria,ConsultaIA

def admin_ok(user): return user.is_authenticated and user.rol=='ADMIN' and user.aprobacion=='APROBADO' and user.is_active

def autorizacion(user): return user.is_authenticated and user.is_active and user.aprobacion=='APROBADO'

def funcionario_ok(user): return autorizacion(user) and user.rol=='FUNCIONARIO'

def resumen_periodo(periodo):
    """Resumen verificable para tarjetas y PDF, sin datos inventados."""
    if periodo is None:
        return {'registros_procesados':0,'errores_detectados':0,'estado':'SIN_DATOS','promedio_general':None}
    resultados=Resultado.objects.filter(periodo=periodo)
    registros=resultados.count()
    cargas=Carga.objects.filter(id__in=resultados.values_list('carga_id',flat=True).distinct())
    errores=cargas.aggregate(total=Sum('rechazados'))['total'] or 0
    if registros==0:estado='SIN_DATOS'
    elif cargas.filter(estado='PROCESANDO').exists():estado='PROCESANDO'
    elif errores>0:estado='CON_ERRORES'
    else:estado='COMPLETADO'
    promedio=resultados.aggregate(x=Avg('promedio_global'))['x']
    return {'registros_procesados':registros,'errores_detectados':int(errores),'estado':estado,'promedio_general':round(float(promedio),2) if promedio is not None else None}

def info_usuario(u): return {'id':u.id,'identificacion':u.identificacion,'nombre':u.first_name,'apellido':u.last_name,'correo':u.email,'rol':u.rol,'aprobacion':u.aprobacion,'activo':u.is_active}

@api_view(['GET'])
@permission_classes([AllowAny])
def csrf(request): return Response({'csrfToken':get_token(request)})

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def registrar(request):
    d=request.data
    if d.get('contrasena') != d.get('confirmacion'): return Response({'error':'Las contraseñas no coinciden'},status=400)
    try: validate_password(d.get('contrasena',''))
    except ValidationError as exc: return Response({'error':exc.messages},status=400)
    ident=str(d.get('identificacion','')).strip(); correo=str(d.get('correo','')).strip().lower()
    if not ident.isdigit() or len(ident)>30 or not correo or not d.get('nombre') or not d.get('apellido'): return Response({'error':'Datos obligatorios inválidos'},status=400)
    if Usuario.objects.filter(identificacion=ident).exists() or Usuario.objects.filter(email__iexact=correo).exists(): return Response({'error':'Identificación o correo ya registrado'},status=400)
    try:
        u=Usuario.objects.create_user(identificacion=ident,email=correo,password=d['contrasena'],first_name=d['nombre'],last_name=d['apellido'],rol='FUNCIONARIO',aprobacion='PENDIENTE',is_active=True)
    except Exception: return Response({'error':'No fue posible crear la solicitud'},status=400)
    return Response({'mensaje':'Solicitud pendiente de aprobación','id':u.pk},status=201)

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AnonRateThrottle])
def login_view(request):
    u=authenticate(request,username=str(request.data.get('identificacion','')),password=request.data.get('contrasena',''))
    if not u: return Response({'error':'Credenciales inválidas'},status=401)
    if not autorizacion(u): return Response({'error':'Cuenta pendiente, rechazada o inactiva'},status=403)
    login(request,u)
    Auditoria.objects.create(usuario=u,accion='LOGIN',entidad='Usuario')
    return Response({'usuario':info_usuario(u)})

@api_view(['POST'])
def logout_view(request):
    logout(request)
    return Response({'mensaje':'Sesión cerrada'})

@api_view(['GET'])
def sesion(request):
    if not autorizacion(request.user):return Response({'error':'Acceso no autorizado'},status=403)
    return Response({'usuario':info_usuario(request.user)})

@api_view(['GET'])
def usuarios(request):
    if not admin_ok(request.user): return Response({'error':'Solo administrador'},status=403)
    return Response([info_usuario(u) for u in Usuario.objects.order_by('-date_joined')])

@api_view(['PATCH','DELETE'])
def usuario_detalle(request,pk):
    if not admin_ok(request.user): return Response({'error':'Solo administrador'},status=403)
    try:u=Usuario.objects.get(pk=pk)
    except Usuario.DoesNotExist:return Response({'error':'No encontrado'},status=404)
    if u.rol=='ADMIN':return Response({'error':'La administración de cuentas administradoras requiere una operación separada y supervisada'},status=403)
    if request.method=='DELETE':
        u.is_active=False;u.save(update_fields=['is_active','actualizado']);accion='DESACTIVAR'
    else:
        d=request.data
        for field,key in [('first_name','nombre'),('last_name','apellido'),('email','correo')]:
            if key in d:setattr(u,field,str(d[key]).strip())
        if 'aprobacion' in d:
            if d['aprobacion'] not in ['PENDIENTE','APROBADO','RECHAZADO']:return Response({'error':'Estado inválido'},status=400)
            u.aprobacion=d['aprobacion']
        if 'activo' in d:u.is_active=bool(d['activo'])
        u.save();accion='EDITAR'
    Auditoria.objects.create(usuario=request.user,accion=accion,entidad='Usuario',detalle={'id':pk})
    return Response({'usuario':info_usuario(u)})

@api_view(['GET'])
def instituciones(request):
    if not funcionario_ok(request.user):
        return Response({'error': 'Acceso exclusivo para funcionarios aprobados'}, status=403)
    q=Institucion.objects.order_by('nombre')
    if request.query_params.get('buscar'):q=q.filter(nombre__icontains=request.query_params['buscar'])
    return Response([{'id':i.id,'codigo_dane':i.codigo_dane,'nombre':i.nombre,'municipio':i.municipio} for i in q[:500]])

@api_view(['GET'])
def periodos(request):
    if not funcionario_ok(request.user):
        return Response({'error': 'Acceso exclusivo para funcionarios aprobados'}, status=403)
    return Response([{'id':p.id,'anio':p.anio,'periodo':p.periodo} for p in Periodo.objects.order_by('-anio','-id')])

@api_view(['GET'])
def institucion_detalle(request,pk):
    if not funcionario_ok(request.user):
        return Response({'error': 'Acceso exclusivo para funcionarios aprobados'}, status=403)
    try:i=Institucion.objects.get(pk=pk)
    except Institucion.DoesNotExist:return Response({'error':'No encontrado'},status=404)
    qs=Resultado.objects.filter(institucion=i).select_related('periodo').prefetch_related('componentes').order_by('-periodo__anio')
    return Response({'institucion':{'id':i.id,'nombre':i.nombre,'codigo_dane':i.codigo_dane,'municipio':i.municipio,'naturaleza':i.naturaleza,'zona':i.zona},'resultados':[{'anio':r.periodo.anio,'periodo':r.periodo.periodo,'global':r.promedio_global,'desviacion':r.desviacion_global,'matriculados':r.matriculados,'registrados':r.registrados,'presentes':r.presentes,'publicados':r.publicados,'componentes':[{'nombre':c.nombre,'promedio':c.promedio,'desviacion':c.desviacion,'niveles':c.niveles,'aprendizajes':c.aprendizajes} for c in r.componentes.all()]} for r in qs]})

@api_view(['GET'])
def comparacion_institucion(request, pk):
    """Compara las cinco áreas con el promedio no ponderado de colegios del mismo periodo."""
    if not funcionario_ok(request.user):
        return Response({'error': 'Solo funcionarios aprobados'}, status=403)
    try:
        institucion = Institucion.objects.get(pk=pk)
    except Institucion.DoesNotExist:
        return Response({'error': 'Institución no encontrada'}, status=404)

    periodo_id = request.query_params.get('periodo')
    if periodo_id and not periodo_id.isdigit():
        return Response({'error': 'Periodo inválido'}, status=400)
    # Por defecto el último periodo DISPONIBLE para esta institución, sin mezclar periodos.
    resultados = Resultado.objects.filter(institucion=institucion).select_related('periodo')
    if periodo_id:
        resultado = resultados.filter(periodo_id=int(periodo_id)).first()
        if resultado is None:
            return Response({'error': 'La institución no tiene datos para ese periodo'}, status=404)
    else:
        resultado = resultados.order_by('-periodo__anio', '-periodo_id').first()
    if resultado is None:
        return Response({'error': 'Esta institución aún no tiene resultados cargados'}, status=404)

    periodo = resultado.periodo
    areas = ['Lectura crítica', 'Matemáticas', 'Sociales y ciudadanas', 'Ciencias naturales', 'Inglés']
    valores = dict(Componente.objects.filter(resultado=resultado).values_list('nombre', 'promedio'))
    # No se usa el promedio oficial del municipio: es una media simple entre colegios cargados.
    agregados = {
        x['nombre']: x
        for x in Componente.objects.filter(resultado__periodo=periodo, resultado__institucion__municipio__iexact='POPAYAN', nombre__in=areas, promedio__isnull=False)
        .values('nombre').annotate(promedio_colegios=Avg('promedio'), cantidad=Count('promedio'))
    }
    respuesta = []
    for nombre in areas:
        valor = valores.get(nombre)
        agregado = agregados.get(nombre, {})
        media = agregado.get('promedio_colegios')
        respuesta.append({
            'nombre': nombre,
            'institucion': float(valor) if valor is not None else None,
            'referencia': round(float(media), 2) if media is not None else None,
            'cantidad_colegios': agregado.get('cantidad', 0),
            'diferencia': round(float(valor) - float(media), 2) if valor is not None and media is not None else None,
        })
    return Response({
        'institucion': {'id': institucion.id, 'nombre': institucion.nombre, 'codigo_dane': institucion.codigo_dane},
        'periodo': {'id': periodo.id, 'anio': periodo.anio, 'nombre': periodo.periodo},
        'referencia_tipo': 'media_no_ponderada_de_colegios_cargados_en_el_mismo_periodo',
        'areas': respuesta,
    })

@api_view(['GET'])
def dashboard(request):
    if not funcionario_ok(request.user):
        return Response({'error': 'Acceso exclusivo para funcionarios aprobados'}, status=403)
    periodo=request.query_params.get('periodo')
    if periodo and not str(periodo).isdigit():return Response({'error':'Periodo inválido'},status=400)
    if periodo:
        p=Periodo.objects.filter(pk=int(periodo)).first()
    else:
        p=Periodo.objects.order_by('-anio','-id').first()
    qs=Resultado.objects.select_related('institucion','periodo').prefetch_related('componentes')
    if p is not None:qs=qs.filter(periodo=p)
    else:qs=qs.none()
    resultados=[{'institucion_id':r.institucion_id,'institucion':r.institucion.nombre,'codigo_dane':r.institucion.codigo_dane,'global':r.promedio_global,'componentes':{c.nombre:c.promedio for c in r.componentes.all()}} for r in qs[:500]]
    agregados=[{'etiqueta':a.etiqueta,'componente':a.componente,'promedio':a.promedio} for a in AgregadoTerritorial.objects.filter(periodo=p)] if p else []
    return Response({'periodo':p.id if p else None,'instituciones':len(resultados),'resultados':resultados,'agregados':agregados,'resumen':resumen_periodo(p)})

def contexto_verificado(periodo_id=None, institucion_id=None):
    qs = Resultado.objects.select_related('institucion', 'periodo')
    if periodo_id:
        qs = qs.filter(periodo_id=periodo_id)
    else:
        p = Periodo.objects.order_by('-anio', '-id').first()
        qs = qs.filter(periodo=p) if p else qs.none()
    datos = list(qs.order_by('-promedio_global').values(
        'institucion__nombre', 'periodo__anio', 'promedio_global'
    )[:20])
    contexto = {
        'instituciones_en_periodo': qs.count(),
        'muestra_ranking_hasta_20': [
            {**d, 'promedio_global': float(d['promedio_global']) if d['promedio_global'] is not None else None}
            for d in datos
        ],
        'nota': 'Datos agregados por institución. No inventar cifras ni atribuir causalidad.',
    }
    if institucion_id:
        r = qs.filter(institucion_id=institucion_id).first()
        if r is None:
            contexto['institucion_solicitada'] = {'error': 'No hay datos de la institución para el periodo elegido'}
        else:
            comps = list(Componente.objects.filter(resultado=r).values('nombre', 'promedio'))
            media_por_area = {
                row['nombre']: row
                for row in Componente.objects.filter(resultado__periodo=r.periodo, resultado__institucion__municipio__iexact='POPAYAN', promedio__isnull=False)
                .values('nombre').annotate(media=Avg('promedio'), n=Count('promedio'))
            }
            contexto['institucion_solicitada'] = {
                'nombre': r.institucion.nombre,
                'codigo_dane': r.institucion.codigo_dane,
                'municipio_registrado': r.institucion.municipio,
                'anio': r.periodo.anio,
                'periodo': r.periodo.periodo,
                'puntaje_global': float(r.promedio_global) if r.promedio_global is not None else None,
                'componentes': [
                    {
                        'nombre': c['nombre'],
                        'puntaje': float(c['promedio']) if c['promedio'] is not None else None,
                        'media_colegios_cargados': float(media_por_area[c['nombre']]['media'])
                        if c['nombre'] in media_por_area and media_por_area[c['nombre']]['media'] is not None else None,
                        'colegios_con_datos': media_por_area.get(c['nombre'], {}).get('n', 0)
                    }
                    for c in comps
                ],
                'advertencia': 'La media de colegios cargados es no ponderada, no equivale a promedio oficial municipal. Señalar áreas relativamente bajas sin atribuir causas.'
            }
    return contexto


def generar_respuesta(pregunta, contexto, idioma='es'):
    import requests
    url = os.getenv('OLLAMA_URL', 'http://localhost:11434').rstrip('/') + '/api/generate'
    idioma_modelo = 'English' if idioma == 'en' else 'español'
    prompt = (
        f'Eres analista educativo. Responde exclusivamente en {idioma_modelo}. '
        'Utiliza SOLO el JSON verificable a continuación. No inventes puntajes, instituciones, motivos ni acciones justificadas como hechos. '
        'Si se consulta sobre una institución específica, usa institucion_solicitada y sus cinco componentes. '
        'Al indicar áreas a mejorar, usa las menores puntuaciones o las diferencias negativas frente a la media de colegios cargados, '
        'aclarando que son prioridades descriptivas, no causas demostradas. No supongas que la media de colegios sea la media oficial del municipio. '
        'Si faltan datos, dilo explícitamente. Contexto JSON: '
        + json.dumps(contexto, ensure_ascii=False, default=str)
        + '\nPregunta: ' + pregunta
    )
    try:
        resp = requests.post(url, json={
            'model': os.getenv('OLLAMA_MODEL', 'llama3.2:1b'),
            'prompt': prompt,
            'stream': False,
            'options': {'temperature': 0.1},
        }, timeout=120)
        resp.raise_for_status()
        return resp.json().get('response', 'No se recibió respuesta del modelo.'), True
    except requests.RequestException:
        return ('The local model is unavailable. Verified data are attached to the response.' if idioma == 'en' else
                'El modelo local no está disponible. Se muestran únicamente los datos verificados.'), False

@api_view(['POST'])
def analisis(request):
    if not funcionario_ok(request.user):
        return Response({'error': 'Acceso exclusivo para funcionarios aprobados'}, status=403)
    periodo=request.data.get('periodo')
    if periodo and not str(periodo).isdigit():return Response({'error':'Periodo inválido'},status=400)
    contexto=contexto_verificado(int(periodo) if periodo else None)
    respuesta,disponible=generar_respuesta('Interpreta los resultados disponibles con cautela.',contexto)
    return Response({'respuesta':respuesta,'modelo_disponible':disponible,'datos':contexto})

@api_view(['POST'])
def chat(request):
    if not funcionario_ok(request.user):
        return Response({'error': 'Solo funcionarios aprobados'}, status=403)
    pregunta = str(request.data.get('pregunta', '')).strip()[:600]
    if not pregunta:
        return Response({'error': 'Pregunta requerida'}, status=400)
    periodo = request.data.get('periodo')
    if periodo and not str(periodo).isdigit():
        return Response({'error': 'Periodo inválido'}, status=400)
    institucion_id = request.data.get('institucion_id')
    if institucion_id and not str(institucion_id).isdigit():
        return Response({'error': 'Institución inválida'}, status=400)
    idioma = request.data.get('idioma', 'es')
    if idioma not in ('es', 'en'):
        idioma = 'es'
    # Si no se seleccionó colegio, reconocer menciones exactas normalizando acentos.
    if not institucion_id:
        def normalizar(cadena):
            return ''.join(c for c in unicodedata.normalize('NFD', cadena.upper()) if unicodedata.category(c) != 'Mn')
        pregunta_normalizada = normalizar(pregunta)
        encontrados = [i for i in Institucion.objects.all().only('id', 'nombre')
                       if len(i.nombre) >= 8 and normalizar(i.nombre) in pregunta_normalizada]
        if len(encontrados) == 1:
            institucion_id = encontrados[0].id
    contexto = contexto_verificado(int(periodo) if periodo else None,
                                  int(institucion_id) if institucion_id else None)
    # Si no tiene datos, evitar que el modelo invente un diagnóstico.
    if institucion_id and 'error' in contexto.get('institucion_solicitada', {}):
        respuesta = contexto['institucion_solicitada']['error']
        disponible = True
    else:
        respuesta, disponible = generar_respuesta(pregunta, contexto, idioma)
    ConsultaIA.objects.create(usuario=request.user, pregunta=pregunta, respuesta=respuesta, contexto=contexto)
    return Response({'respuesta': respuesta, 'modelo_disponible': disponible, 'datos': contexto})

@api_view(['GET'])
def informe(request):
    if not funcionario_ok(request.user):
        return Response({'error': 'Acceso exclusivo para funcionarios aprobados'}, status=403)
    periodo=request.query_params.get('periodo')
    if periodo and not periodo.isdigit():return Response({'error':'Periodo inválido'},status=400)
    from .informe_pdf import generar_informe_pdf
    buffer=generar_informe_pdf(int(periodo) if periodo else None)
    return FileResponse(buffer,as_attachment=True,filename='informe_saber11.pdf',content_type='application/pdf')
