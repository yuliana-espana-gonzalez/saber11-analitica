"""Generación del informe PDF institucional (reportlab).

Se apoya en el endpoint existente /api/informe/ y en los modelos ya
existentes. No altera datos ni migraciones.
"""

from datetime import date
from io import BytesIO

from django.contrib.staticfiles import finders
from django.db.models import Avg

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing
from reportlab.platypus import (
    Flowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from .models import Carga, Componente, Periodo, Resultado

# =========================================================
# PALETA (misma que la interfaz)
# =========================================================

BRAND = colors.HexColor('#2F5FD0')
GOV_BLUE = colors.HexColor('#3366CC')
INK = colors.HexColor('#1B2A4A')
MUTED = colors.HexColor('#5B6B8C')
LINE = colors.HexColor('#DFE6F2')
SURFACE_2 = colors.HexColor('#F4F6FA')
GREEN = colors.HexColor('#2E7D32')
ORANGE = colors.HexColor('#E07A1F')
PURPLE = colors.HexColor('#6A3FB5')
RED = colors.HexColor('#C62828')

PALETTE = [BRAND, GOV_BLUE, GREEN, ORANGE, PURPLE, RED, colors.HexColor('#0F8B8D')]

AREAS = [
    'Lectura crítica',
    'Matemáticas',
    'Sociales y ciudadanas',
    'Ciencias naturales',
    'Inglés',
]

AREAS_CORTAS = ['Lectura', 'Matemát.', 'Sociales', 'Ciencias', 'Inglés']

ESTADOS = {
    'COMPLETADO': 'Completado',
    'PROCESANDO': 'Procesando',
    'CON_ERRORES': 'Con errores',
    'SIN_DATOS': 'Sin datos',
}


# =========================================================
# UTILIDADES
# =========================================================

class DrawingFlowable(Flowable):
    """Envuelve un Drawing de reportlab para usarlo en platypus."""

    def __init__(self, drawing: Drawing, width: float, height: float):
        super().__init__()
        self.drawing = drawing
        self.width = width
        self.height = height

    def wrap(self, availWidth, availHeight):
        return (min(self.width, availWidth), self.height)

    def draw(self):
        renderPDF.draw(self.drawing, self.canv, 0, 0)


def _float(value):
    return float(value) if value is not None else None


def _fmt(value, decimals=1):
    if value is None:
        return 'N.D.'
    return f'{value:.{decimals}f}'


def _logo_flowable():
    path = finders.find('core/logo_popayan.jpg')
    if not path:
        return None
    try:
        return Image(path, width=16 * mm, height=16 * mm)
    except Exception:
        return None


def _estilos():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name='GovTitle',
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=17,
            textColor=INK,
        )
    )
    styles.add(
        ParagraphStyle(
            name='GovSub',
            fontName='Helvetica',
            fontSize=8.5,
            leading=11,
            textColor=MUTED,
        )
    )
    styles.add(
        ParagraphStyle(
            name='SectionTitle',
            fontName='Helvetica-Bold',
            fontSize=11,
            leading=14,
            textColor=BRAND,
            spaceBefore=10,
            spaceAfter=6,
        )
    )
    styles.add(
        ParagraphStyle(
            name='CellText',
            fontName='Helvetica',
            fontSize=7.5,
            leading=9,
            textColor=INK,
        )
    )
    styles.add(
        ParagraphStyle(
            name='Footnote',
            fontName='Helvetica',
            fontSize=7.5,
            leading=10,
            textColor=MUTED,
        )
    )
    return styles


# =========================================================
# GRÁFICAS
# =========================================================

def _grafica_barras_global(resultados, width=480, height=210):
    filas = [
        (r.institucion.nombre, _float(r.promedio_global))
        for r in resultados
        if r.promedio_global is not None
    ][:12]

    if not filas:
        return None

    nombres = [
        nombre if len(nombre) <= 18 else nombre[:17] + '…'
        for nombre, _ in filas
    ]
    valores = [valor for _, valor in filas]

    drawing = Drawing(width, height)
    chart = VerticalBarChart()
    chart.x = 38
    chart.y = 34
    chart.width = width - 50
    chart.height = height - 58
    chart.data = [valores]
    chart.categoryAxis.categoryNames = nombres
    chart.categoryAxis.labels.fontSize = 6
    chart.categoryAxis.labels.angle = 30
    chart.categoryAxis.labels.dx = -3
    chart.categoryAxis.labels.dy = -4
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = max(valores) * 1.12
    chart.valueAxis.labels.fontSize = 6.5
    chart.bars[0].fillColor = BRAND
    chart.barSpacing = 3
    drawing.add(chart)
    return drawing


def _grafica_barras_areas(promedios, width=480, height=190):
    if not any(v is not None for v in promedios.values()):
        return None

    valores = [promedios.get(area) or 0 for area in AREAS]

    drawing = Drawing(width, height)
    chart = VerticalBarChart()
    chart.x = 38
    chart.y = 34
    chart.width = width - 50
    chart.height = height - 58
    chart.data = [valores]
    chart.categoryAxis.categoryNames = AREAS_CORTAS
    chart.categoryAxis.labels.fontSize = 7
    chart.valueAxis.valueMin = 0
    chart.valueAxis.valueMax = 100
    chart.valueAxis.labels.fontSize = 6.5
    chart.bars[0].fillColor = GREEN
    chart.barSpacing = 6
    drawing.add(chart)
    return drawing


def _grafica_dona_distribucion(resultados, width=480, height=200):
    rangos = [
        ('< 200', RED, float('-inf'), 200),
        ('200 – 249', ORANGE, 200, 250),
        ('250 – 299', BRAND, 250, 300),
        ('300 – 349', GREEN, 300, 350),
        ('350 +', PURPLE, 350, float('inf')),
    ]

    valores = [
        _float(r.promedio_global)
        for r in resultados
        if r.promedio_global is not None
    ]
    if not valores:
        return None

    datos = []
    etiquetas = []
    colores = []
    for etiqueta, color, minimo, maximo in rangos:
        cantidad = len([v for v in valores if minimo <= v < maximo])
        if cantidad:
            datos.append(cantidad)
            etiquetas.append(f'{etiqueta}: {cantidad}')
            colores.append(color)

    if not datos:
        return None

    drawing = Drawing(width, height)
    pie = Pie()
    pie.x = width / 2 - 70
    pie.y = 12
    pie.width = 140
    pie.height = 140
    pie.data = datos
    pie.labels = etiquetas
    pie.slices.strokeWidth = 1
    pie.slices.strokeColor = colors.white
    pie.slices.fontSize = 6.5
    pie.sideLabels = True
    for i, color in enumerate(colores):
        pie.slices[i].fillColor = color
    drawing.add(pie)
    return drawing


# =========================================================
# DATOS
# =========================================================

def _resumen(periodo):
    if periodo is None:
        return {
            'registros': 0,
            'errores': 0,
            'estado': 'SIN_DATOS',
            'promedio': None,
        }

    resultados = Resultado.objects.filter(periodo=periodo)
    registros = resultados.count()

    carga_ids = resultados.values_list('carga_id', flat=True).distinct()
    cargas = Carga.objects.filter(id__in=carga_ids)
    errores = sum(c.rechazados or 0 for c in cargas)

    if registros == 0:
        estado = 'SIN_DATOS'
    elif cargas.filter(estado='PROCESANDO').exists():
        estado = 'PROCESANDO'
    elif errores > 0:
        estado = 'CON_ERRORES'
    else:
        estado = 'COMPLETADO'

    promedio = resultados.aggregate(x=Avg('promedio_global'))['x']

    return {
        'registros': registros,
        'errores': errores,
        'estado': estado,
        'promedio': _float(promedio),
    }


# =========================================================
# INFORME
# =========================================================

def generar_informe_pdf(periodo_id=None):
    styles = _estilos()

    if periodo_id:
        periodo = Periodo.objects.filter(pk=periodo_id).first()
    else:
        periodo = Periodo.objects.order_by('-anio', '-id').first()

    resultados = []
    promedios_area = {}
    resumen = _resumen(periodo)

    if periodo is not None:
        resultados = list(
            Resultado.objects.filter(periodo=periodo)
            .select_related('institucion')
            .prefetch_related('componentes')
            .order_by('-promedio_global', 'institucion__nombre')
        )
        filas_area = (
            Componente.objects.filter(
                resultado__periodo=periodo,
                nombre__in=AREAS,
                promedio__isnull=False,
            )
            .values('nombre')
            .annotate(media=Avg('promedio'))
        )
        promedios_area = {
            fila['nombre']: _float(fila['media']) for fila in filas_area
        }

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=16 * mm,
        title='Análisis de resultados Saber 11',
        author='Secretaría de Educación de Popayán',
    )

    story = []

    # ---------- Encabezado con logo ----------
    logo = _logo_flowable()
    titulo = Paragraph(
        'Secretaría de Educación de Popayán<br/>'
        'Análisis de resultados Saber 11',
        styles['GovTitle'],
    )
    subtitulo = Paragraph(
        f'Fecha de generación: {date.today().isoformat()}'
        + (
            f' · Periodo: {periodo.anio} · {periodo.periodo}'
            if periodo is not None
            else ' · Sin periodo disponible'
        ),
        styles['GovSub'],
    )

    if logo is not None:
        encabezado = Table(
            [[logo, [titulo, Spacer(1, 3), subtitulo]]],
            colWidths=[22 * mm, doc.width - 22 * mm],
        )
        encabezado.setStyle(
            TableStyle(
                [
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 0),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                    ('LINEBELOW', (0, 0), (-1, -1), 0.8, LINE),
                ]
            )
        )
        story.append(encabezado)
    else:
        story.extend([titulo, subtitulo])

    story.append(Spacer(1, 8))

    # ---------- Resumen ----------
    story.append(Paragraph('Resumen del procesamiento', styles['SectionTitle']))

    resumen_data = [
        [
            'Registros procesados',
            'Errores detectados',
            'Promedio general',
            'Estado del procesamiento',
        ],
        [
            str(resumen['registros']),
            str(resumen['errores']),
            _fmt(resumen['promedio'], 2),
            ESTADOS.get(resumen['estado'], resumen['estado']),
        ],
    ]

    resumen_tabla = Table(
        resumen_data,
        colWidths=[doc.width / 4.0] * 4,
    )
    resumen_tabla.setStyle(
        TableStyle(
            [
                ('BACKGROUND', (0, 0), (-1, 0), BRAND),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 7.5),
                ('FONTSIZE', (0, 1), (-1, 1), 11),
                ('TEXTCOLOR', (0, 1), (-1, 1), INK),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.4, LINE),
                ('TOPPADDING', (0, 0), (-1, -1), 5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                ('ROWBACKGROUNDS', (0, 1), (-1, 1), [SURFACE_2]),
            ]
        )
    )
    story.append(resumen_tabla)
    story.append(Spacer(1, 6))

    if periodo is None or not resultados:
        story.append(
            Paragraph(
                'No hay resultados cargados para el periodo seleccionado. '
                'Carga un archivo .xlsx o .csv para generar el análisis.',
                styles['Footnote'],
            )
        )
    else:
        # ---------- Gráfica global ----------
        grafica_global = _grafica_barras_global(resultados)
        if grafica_global is not None:
            story.append(
                Paragraph(
                    'Puntaje global promedio por institución',
                    styles['SectionTitle'],
                )
            )
            story.append(DrawingFlowable(grafica_global, doc.width, 210))
            story.append(
                Paragraph(
                    'Se muestran hasta 12 instituciones con mayor puntaje global.',
                    styles['Footnote'],
                )
            )
            story.append(Spacer(1, 4))

        # ---------- Gráfica por área ----------
        grafica_areas = _grafica_barras_areas(promedios_area)
        if grafica_areas is not None:
            story.append(
                Paragraph(
                    'Promedio por área (media de instituciones cargadas)',
                    styles['SectionTitle'],
                )
            )
            story.append(DrawingFlowable(grafica_areas, doc.width, 190))
            story.append(Spacer(1, 4))

        # ---------- Distribución ----------
        grafica_dona = _grafica_dona_distribucion(resultados)
        if grafica_dona is not None:
            story.append(
                Paragraph(
                    'Distribución por rangos de puntaje global',
                    styles['SectionTitle'],
                )
            )
            story.append(DrawingFlowable(grafica_dona, doc.width, 200))
            story.append(
                Paragraph(
                    'La carga actual no incluye datos por estudiante ni nivel '
                    'de desempeño; se agrupan las instituciones por rango de '
                    'puntaje global.',
                    styles['Footnote'],
                )
            )
            story.append(Spacer(1, 4))

        # ---------- Tabla detallada ----------
        story.append(
            Paragraph('Promedios por institución y por área', styles['SectionTitle'])
        )

        cabecera = ['Institución', 'Global'] + AREAS
        datos_tabla = [cabecera]

        for resultado in resultados:
            componentes = {
                c.nombre: c.promedio for c in resultado.componentes.all()
            }
            datos_tabla.append(
                [
                    Paragraph(resultado.institucion.nombre, styles['CellText']),
                    _fmt(_float(resultado.promedio_global)),
                    *[
                        _fmt(_float(componentes.get(area)))
                        for area in AREAS
                    ],
                ]
            )

        ancho_area = (doc.width - 52 * mm - 15 * mm) / 5.0
        tabla = Table(
            datos_tabla,
            colWidths=[52 * mm, 15 * mm] + [ancho_area] * 5,
            repeatRows=1,
        )
        tabla.setStyle(
            TableStyle(
                [
                    ('BACKGROUND', (0, 0), (-1, 0), BRAND),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 7),
                    ('FONTSIZE', (0, 1), (-1, -1), 7.5),
                    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ('GRID', (0, 0), (-1, -1), 0.4, LINE),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SURFACE_2]),
                    ('TOPPADDING', (0, 0), (-1, -1), 3),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                    ('LEFTPADDING', (0, 0), (-1, -1), 3),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 3),
                ]
            )
        )
        story.append(tabla)
        story.append(Spacer(1, 6))

    story.append(
        Paragraph(
            'Promedios institucionales: no son resultados individuales. '
            'La media de colegios cargados no equivale al promedio municipal '
            'oficial del ICFES. Generado automáticamente por el sistema de '
            'analítica de la Secretaría de Educación de Popayán.',
            styles['Footnote'],
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer
