"""Parser de libros territoriales agregados. Validar posiciones frente a muestras oficiales reales."""
import io
import re
import unicodedata
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
import pandas as pd

HOJAS=['Información general','Ficha técnica','Resultados generales','Lectura crítica','Matemáticas','Sociales y ciudadanas','Ciencias naturales','Inglés']
COMPONENTES=HOJAS[3:]

def normalizar(x):
    s=unicodedata.normalize('NFKD',str(x or ''))
    return ''.join(c for c in s if not unicodedata.combining(c)).casefold().strip()

def vacio(x):
    return x is None or pd.isna(x) if not isinstance(x,(list,dict)) else False

def texto(x):
    if vacio(x):return ''
    return str(x).strip()

def dane(x):
    if vacio(x):return None
    s=texto(x)
    if re.fullmatch(r'\d+\.0',s):s=s[:-2]
    return s if re.fullmatch(r'\d{10,12}',s) else None

def numero(x):
    if vacio(x) or normalizar(x) in ('n.d.','nd','n/d','-',''):return None
    try:
        s=texto(x).replace('%','').replace(' ','')
        if ',' in s and '.' in s:s=s.replace('.','').replace(',','.')
        elif ',' in s:s=s.replace(',','.')
        return Decimal(s)
    except (InvalidOperation,ValueError):return None

def entero(x):
    n=numero(x)
    return int(n) if n is not None and n>=0 and n==int(n) else None

def cabecera_y_datos(df):
    # DANE codes anchor the records; avoid fixed starting row.
    for index in range(min(len(df),40)):
        for col in range(min(df.shape[1],3)):
            if 'dane' in normalizar(df.iat[index,col]):
                return index, col
    raise ValueError('No se identificó una cabecera con código DANE')

def filas(df):
    header,col=cabecera_y_datos(df)
    for row in range(header+1,len(df)):
        codigo=dane(df.iat[row,col])
        if codigo:
            yield codigo,row,col,header

def valor(df,r,c):
    return df.iat[r,c] if 0<=r<len(df) and 0<=c<df.shape[1] else None

def parsear_libro(file_bytes, extension):
    engine='xlrd' if extension=='.xls' else 'openpyxl'
    book=pd.read_excel(io.BytesIO(file_bytes),sheet_name=None,header=None,engine=engine,dtype=object)
    faltantes=[h for h in HOJAS if h not in book]
    if faltantes:raise ValueError('Faltan hojas requeridas: '+', '.join(faltantes))
    metadata=book['Información general'].fillna('').astype(str).values.flatten().tolist()
    contenido=' '.join(metadata)
    anios=re.findall(r'20\d{2}',contenido)
    # Año detectado desde la hoja de metadatos, nunca desde nombre de archivo.
    if not anios:raise ValueError('No fue posible identificar el año en Información general')
    anio=int(anios[0]); periodo='UNICO'
    detectados={};agregados=[];advertencias=[]
    ficha=book['Ficha técnica']
    for codigo,r,c,h in filas(ficha):
        detectados[codigo]={'codigo_dane':codigo,'nombre':texto(valor(ficha,r,c+2)),'matriculados':entero(valor(ficha,r,c+3)),'registrados':entero(valor(ficha,r,c+4)),'presentes':entero(valor(ficha,r,c+5)),'publicados':entero(valor(ficha,r,c+6)),'componentes':{}}
    for sheet in ['Resultados generales']+COMPONENTES:
        df=book[sheet]
        h,code_col=cabecera_y_datos(df)
        for codigo,r,c,_ in filas(df):
            if codigo not in detectados:
                advertencias.append(f'{sheet}: código {codigo} no aparece en Ficha técnica')
                continue
            item=detectados[codigo]
            if sheet=='Resultados generales':
                item['global']=numero(valor(df,r,c+3));item['comparacion_global']=texto(valor(df,r,c+4))
                item['desviacion_global']=numero(valor(df,r,c+5))
            else:
                nivel_n=5 if sheet=='Inglés' else 4
                apr_n={'Lectura crítica':3,'Matemáticas':3,'Sociales y ciudadanas':6,'Ciencias naturales':15,'Inglés':0}[sheet]
                # Columnas A-C identidad; D-G promedio/comparaciones/desviación.
                # Los encabezados dinámicos de fila 10 y el contenido real deben contrastarse
                # con un libro ICFES de muestra antes de afirmar compatibilidad total.
                niveles={}
                labels=['A-','A1','A2','B1','B+'] if sheet=='Inglés' else [str(i) for i in range(1,5)]
                for offset,label in enumerate(labels):
                    n=numero(valor(df,r,c+7+offset))
                    if n is not None:niveles[label]=float(n)
                aprendizajes={}
                for offset in range(apr_n):
                    n=numero(valor(df,r,c+7+nivel_n+offset))
                    if n is not None:aprendizajes[str(offset+1)]=float(n)
                item['componentes'][sheet]={'promedio':numero(valor(df,r,c+3)),'comparacion':texto(valor(df,r,c+4)),'desviacion':numero(valor(df,r,c+5)),'comparacion_desviacion':texto(valor(df,r,c+6)),'niveles':niveles,'aprendizajes':aprendizajes}
        # Preserve aggregated rows as separate entries; never as schools.
        for r in range(h+1,min(len(df),h+12)):
            if dane(valor(df,r,code_col)):continue
            etiqueta=texto(valor(df,r,code_col+1)) or texto(valor(df,r,code_col+2))
            if etiqueta and normalizar(etiqueta) not in ('pais/et/municipios','establecimientos educativos'):
                n=numero(valor(df,r,code_col+3))
                if n is not None:agregados.append({'etiqueta':etiqueta,'componente':'GLOBAL' if sheet=='Resultados generales' else sheet,'promedio':n})
    if not detectados:raise ValueError('No se encontraron códigos DANE institucionales válidos')
    return {'anio':anio,'periodo':periodo,'instituciones':list(detectados.values()),'agregados':agregados,'advertencias':advertencias}

def parsear_csv(file_bytes):
    frame=pd.read_csv(io.BytesIO(file_bytes),dtype=str,sep=None,engine='python')
    required={'codigo_dane','nombre','anio','promedio_global'}
    if not required.issubset(frame.columns):raise ValueError('CSV requiere: '+', '.join(sorted(required)))
    anios=frame['anio'].dropna().unique().tolist()
    if len(anios)!=1:raise ValueError('Importe un periodo por archivo CSV')
    items=[]
    for _,r in frame.iterrows():
        codigo=dane(r['codigo_dane'])
        if not codigo:continue
        componentes={}
        for nombre,col in [('Lectura crítica','lectura_critica'),('Matemáticas','matematicas'),('Sociales y ciudadanas','sociales_ciudadanas'),('Ciencias naturales','ciencias_naturales'),('Inglés','ingles')]:
            if col in frame.columns:componentes[nombre]={'promedio':numero(r[col]),'desviacion':None,'comparacion':'','comparacion_desviacion':'','niveles':{},'aprendizajes':{}}
        items.append({'codigo_dane':codigo,'nombre':texto(r['nombre']),'global':numero(r['promedio_global']),'componentes':componentes})
    if not items:raise ValueError('No se encontraron instituciones válidas')
    return {'anio':int(anios[0]),'periodo':'UNICO','instituciones':items,'agregados':[],'advertencias':[]}
