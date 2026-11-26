import hashlib
from django.db import transaction
from rest_framework.decorators import api_view
from rest_framework.response import Response
from core.models import Institucion,Periodo,Carga,Resultado,Componente,AgregadoTerritorial,Auditoria
from .parser import parsear_libro,parsear_csv

@api_view(['GET','POST'])
def cargar(request):
    if request.method=='GET':
        return Response([{'id':c.pk,'archivo':c.nombre,'fecha':c.fecha,'estado':c.estado,'detectados':c.detectados,'insertados':c.insertados,'actualizados':c.actualizados,'rechazados':c.rechazados,'diagnostico':c.diagnostico} for c in Carga.objects.order_by('-fecha')[:100]])
    f=request.FILES.get('archivo')
    if not f:return Response({'error':'Adjunta archivo'},status=400)
    ext='.'+f.name.rsplit('.',1)[-1].lower() if '.' in f.name else ''
    if ext not in ('.xls','.xlsx','.csv'):return Response({'error':'Extensión inválida'},status=400)
    if f.size>10*1024*1024:return Response({'error':'Máximo 10 MB'},status=400)
    content=f.read(); digest=hashlib.sha256(content).hexdigest()
    if Carga.objects.filter(sha256=digest,estado='COMPLETADO').exists():return Response({'error':'Archivo ya procesado; no se duplica la carga'},status=409)
    try:datos=parsear_csv(content) if ext=='.csv' else parsear_libro(content,ext)
    except Exception as exc:return Response({'error':f'Archivo no válido: {str(exc)[:350]}'},status=400)
    with transaction.atomic():
        carga=Carga.objects.create(usuario=request.user,nombre=f.name[:260],sha256=digest,detectados=len(datos['instituciones']))
        periodo,_=Periodo.objects.get_or_create(anio=datos['anio'],periodo=datos['periodo'])
        insertados=0;actualizados=0;rechazados=0;errores=[]
        for item in datos['instituciones']:
            if not item.get('nombre'):
                rechazados+=1;errores.append(f"Institución {item['codigo_dane']} sin nombre");continue
            ins,_=Institucion.objects.update_or_create(codigo_dane=item['codigo_dane'],defaults={'nombre':item['nombre'][:260]})
            defaults={'carga':carga,'promedio_global':item.get('global'),'desviacion_global':item.get('desviacion_global'),'comparacion_global':item.get('comparacion_global',''),'matriculados':item.get('matriculados'),'registrados':item.get('registrados'),'presentes':item.get('presentes'),'publicados':item.get('publicados')}
            resultado,created=Resultado.objects.update_or_create(institucion=ins,periodo=periodo,defaults=defaults)
            if created:insertados+=1
            else:actualizados+=1
            for nombre,c in item.get('componentes',{}).items():
                Componente.objects.update_or_create(resultado=resultado,nombre=nombre,defaults=c)
        for a in datos['agregados']:
            AgregadoTerritorial.objects.update_or_create(periodo=periodo,etiqueta=a['etiqueta'][:160],componente=a['componente'],defaults={'promedio':a['promedio']})
        carga.insertados=insertados;carga.actualizados=actualizados;carga.rechazados=rechazados
        carga.estado='COMPLETADO';carga.diagnostico={'advertencias':datos['advertencias'][:100],'errores':errores[:100]};carga.save()
        Auditoria.objects.create(usuario=request.user,accion='IMPORTAR',entidad='Carga',detalle={'id':carga.pk,'sha256':digest})
    return Response({'id':carga.id,'periodo':periodo.anio,'insertados':insertados,'actualizados':actualizados,'rechazados':rechazados,'advertencias':datos['advertencias'][:30]},status=201)
