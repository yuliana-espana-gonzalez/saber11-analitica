import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie
} from 'recharts';
import { BarChart3 } from 'lucide-react';

// =========================================================
// TIPOS
// =========================================================

export type ResultadoGrafica = {
  institucion_id: number;
  institucion: string;
  global: number | null;
  componentes: Record<string, number | null>;
};

type Props = {
  resultados: ResultadoGrafica[];
  idioma: 'es' | 'en';
};

type Lang = 'es' | 'en';

// =========================================================
// PALETA ACCESIBLE (azules + acentos)
// =========================================================

const PALETTE = [
  '#2F5FD0',
  '#3366CC',
  '#2E7D32',
  '#E07A1F',
  '#6A3FB5',
  '#C62828',
  '#0F8B8D'
];

const AREAS = [
  'Matemáticas',
  'Lectura crítica',
  'Ciencias naturales',
  'Sociales y ciudadanas',
  'Inglés'
] as const;

const AREA_LABELS: Record<string, Record<Lang, string>> = {
  'Matemáticas': { es: 'Matemáticas', en: 'Mathematics' },
  'Lectura crítica': { es: 'Lectura crítica', en: 'Critical Reading' },
  'Ciencias naturales': {
    es: 'Ciencias naturales',
    en: 'Natural Sciences'
  },
  'Sociales y ciudadanas': {
    es: 'Sociales y ciudadanas',
    en: 'Social & Citizenship'
  },
  'Inglés': { es: 'Inglés', en: 'English' }
};

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--line)',
  borderRadius: 12,
  color: 'var(--ink)',
  boxShadow: 'var(--shadow)'
};

function toNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function redondear(value: number): number {
  return Math.round(value * 100) / 100;
}

// =========================================================
// ESTADO VACÍO
// =========================================================

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid h-64 place-items-center rounded-xl bg-[var(--surface-2)] px-6 text-center">
      <div className="space-y-2">
        <BarChart3
          size={34}
          className="mx-auto text-[var(--muted)]"
          aria-hidden="true"
        />
        <p className="text-sm text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

export default function ResultadosCharts({ resultados, idioma }: Props) {
  const es = idioma === 'es';
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState('');

  // ---------- (a) Puntaje global promedio por institución ----------
  const datosGlobal = useMemo(() => {
    return resultados
      .map(r => ({
        nombre: r.institucion,
        puntaje: toNumber(r.global)
      }))
      .filter(d => d.puntaje !== null)
      .sort((a, b) => (b.puntaje as number) - (a.puntaje as number))
      .map(d => ({ ...d, puntaje: d.puntaje as number }));
  }, [resultados]);

  // ---------- (b) Promedio por área (con filtro de institución) ----------
  const promediosArea = useMemo(() => {
    return AREAS.map(area => {
      let suma = 0;
      let cantidad = 0;

      for (const resultado of resultados) {
        const valor = toNumber(resultado.componentes[area]);
        if (valor !== null) {
          suma += valor;
          cantidad += 1;
        }
      }

      return {
        area,
        promedio: cantidad > 0 ? redondear(suma / cantidad) : null
      };
    });
  }, [resultados]);

  const datosRadar = useMemo(() => {
    const seleccion = resultados.find(
      r => String(r.institucion_id) === institucionSeleccionada
    );

    const claveGeneral = es ? 'Promedio general' : 'Overall average';
    const claveInstitucion = es ? 'Institución' : 'School';

    return promediosArea.map(({ area, promedio }) => {
      const fila: Record<string, string | number | null> = {
        area: AREA_LABELS[area]?.[idioma] ?? area,
        [claveGeneral]: promedio
      };

      if (seleccion) {
        fila[claveInstitucion] = toNumber(seleccion.componentes[area]);
      }

      return fila;
    });
  }, [
    promediosArea,
    resultados,
    institucionSeleccionada,
    idioma,
    es
  ]);

  const claveGeneral = es ? 'Promedio general' : 'Overall average';
  const claveInstitucion = es ? 'Institución' : 'School';
  const hayDatosArea = promediosArea.some(a => a.promedio !== null);

  // ---------- (c) Distribución por rangos de puntaje global ----------
  const rangos = useMemo(
    () => [
      {
        nombre: '< 200',
        color: '#C62828',
        min: Number.NEGATIVE_INFINITY,
        max: 200
      },
      { nombre: '200 – 249', color: '#E07A1F', min: 200, max: 250 },
      { nombre: '250 – 299', color: '#2F5FD0', min: 250, max: 300 },
      { nombre: '300 – 349', color: '#2E7D32', min: 300, max: 350 },
      { nombre: '350 +', color: '#6A3FB5', min: 350, max: Number.POSITIVE_INFINITY }
    ],
    []
  );

  const datosDistribucion = useMemo(() => {
    const globals = resultados
      .map(r => toNumber(r.global))
      .filter((v): v is number => v !== null);

    return rangos
      .map(rango => ({
        nombre: rango.nombre,
        color: rango.color,
        valor: globals.filter(
          v => v >= rango.min && v < rango.max
        ).length
      }))
      .filter(d => d.valor > 0);
  }, [resultados, rangos]);

  return (
    <div className="space-y-5">
      {/* ================= GRÁFICA A ================= */}
      <section className="card">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">
            {es
              ? 'Puntaje global promedio por institución'
              : 'Average overall score by school'}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {es
              ? 'Ordenado de mayor a menor. Pasa el cursor sobre cada barra para ver el detalle.'
              : 'Sorted from highest to lowest. Hover over each bar for details.'}
          </p>
        </div>

        {datosGlobal.length === 0 ? (
          <EmptyState
            text={
              es
                ? 'Aún no hay puntajes globales cargados.'
                : 'No overall scores loaded yet.'
            }
          />
        ) : (
          <div
            className="h-80 w-full"
            role="img"
            aria-label={
              es
                ? 'Gráfica de barras del puntaje global promedio por institución'
                : 'Bar chart of average overall score by school'
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={datosGlobal}
                margin={{ top: 10, right: 16, left: 8, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                <XAxis
                  dataKey="nombre"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                  tickFormatter={(value: string) =>
                    value.length > 18 ? `${value.slice(0, 17)}…` : value
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                  label={{
                    value: es ? 'Puntaje' : 'Score',
                    angle: -90,
                    position: 'insideLeft',
                    fill: 'var(--muted)',
                    fontSize: 12
                  }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{ fill: 'rgba(47, 95, 208, 0.06)' }}
                  formatter={(value: number) => [
                    value,
                    es ? 'Puntaje global' : 'Overall score'
                  ]}
                />
                <Bar dataKey="puntaje" radius={[6, 6, 0, 0]} maxBarSize={64}>
                  {datosGlobal.map((_, index) => (
                    <Cell
                      key={index}
                      fill={PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ================= GRÁFICA B ================= */}
      <section className="card">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[var(--ink)]">
              {es
                ? 'Promedio por área: fortalezas y debilidades'
                : 'Average by subject: strengths and gaps'}
            </h2>
            <p className="text-sm text-[var(--muted)]">
              {es
                ? 'Compara las cinco áreas frente al promedio general de las instituciones cargadas.'
                : 'Compares the five subjects against the overall average of loaded schools.'}
            </p>
          </div>

          <div className="w-full sm:w-72">
            <label
              htmlFor="filtroInstitucionRadar"
              className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]"
            >
              {es ? 'Filtrar por institución' : 'Filter by school'}
            </label>
            <select
              id="filtroInstitucionRadar"
              value={institucionSeleccionada}
              onChange={e => setInstitucionSeleccionada(e.target.value)}
            >
              <option value="">
                {es ? 'Todas las instituciones' : 'All schools'}
              </option>
              {resultados.map(r => (
                <option key={r.institucion_id} value={r.institucion_id}>
                  {r.institucion}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!hayDatosArea ? (
          <EmptyState
            text={
              es
                ? 'Aún no hay promedios por área cargados.'
                : 'No subject averages loaded yet.'
            }
          />
        ) : (
          <div
            className="h-96 w-full"
            role="img"
            aria-label={
              es
                ? 'Gráfica de radar con el promedio por área'
                : 'Radar chart with average by subject'
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={datosRadar} outerRadius="72%">
                <PolarGrid stroke="var(--line)" />
                <PolarAngleAxis
                  dataKey="area"
                  tick={{ fontSize: 11, fill: 'var(--muted)' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: 'var(--muted)' }}
                />
                <Radar
                  name={claveGeneral}
                  dataKey={claveGeneral}
                  stroke="#2F5FD0"
                  fill="#2F5FD0"
                  fillOpacity={0.28}
                  strokeWidth={2}
                />
                {institucionSeleccionada && (
                  <Radar
                    name={claveInstitucion}
                    dataKey={claveInstitucion}
                    stroke="#E07A1F"
                    fill="#E07A1F"
                    fillOpacity={0.22}
                    strokeWidth={2}
                  />
                )}
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ================= GRÁFICA C ================= */}
      <section className="card">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--ink)]">
            {es
              ? 'Distribución por rangos de puntaje global'
              : 'Distribution by overall score ranges'}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {es
              ? 'La carga actual no incluye datos por estudiante ni nivel de desempeño; se agrupan las instituciones por rango de puntaje.'
              : 'Current data has no student-level or performance-level records; schools are grouped by score range.'}
          </p>
        </div>

        {datosDistribucion.length === 0 ? (
          <EmptyState
            text={
              es
                ? 'Aún no hay puntajes para calcular la distribución.'
                : 'No scores available to compute the distribution yet.'
            }
          />
        ) : (
          <div
            className="h-80 w-full"
            role="img"
            aria-label={
              es
                ? 'Gráfica de dona con la distribución de instituciones por rango de puntaje'
                : 'Donut chart of schools by score range'
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosDistribucion}
                  dataKey="valor"
                  nameKey="nombre"
                  innerRadius="55%"
                  outerRadius="80%"
                  paddingAngle={2}
                  stroke="var(--surface)"
                  strokeWidth={2}
                >
                  {datosDistribucion.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.color || PALETTE[index % PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [
                    value,
                    es ? 'Instituciones' : 'Schools'
                  ]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
