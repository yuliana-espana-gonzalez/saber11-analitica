from decimal import Decimal
from etl.parser import dane,numero,parsear_csv

def test_numero_nd_es_null():
    assert numero('N.D.') is None
    assert numero('26,75') == Decimal('26.75')

def test_codigo_dane_texto():
    assert dane('123456789012')=='123456789012'
    assert dane('POPAYAN') is None

def test_csv_minimo():
    b=b'codigo_dane,nombre,anio,promedio_global,matematicas\n123456789012,Colegio DEMO,2026,260,51\n'
    d=parsear_csv(b)
    assert d['instituciones'][0]['global']==260
    assert d['instituciones'][0]['componentes']['Matemáticas']['promedio']==51
