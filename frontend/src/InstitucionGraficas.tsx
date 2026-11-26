
import { useEffect, useState } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell
} from 'recharts';

import { api } from './api';

// ===========================================
// TIPOS
// ===========================================

type Area = {
  nombre: string;
  institucion: number | null;
  referencia: number | null;
  cantidad_colegios: number;
  diferencia: number | null;
};

type Comparacion = {
  institucion: {
    id: number;
    nombre: string;
    codigo_dane: string;
  };

  periodo: {
    id: number;
    anio: number;
    nombre: string;
  };

  referencia_tipo: string;
  areas: Area[];
};

type Periodo = {
  id: number;
  anio: number;
  periodo: string;
};

type Props = {
  institucionId: string;
  periodos: Periodo[];
  idioma: 'es' | 'en';
};

// ===========================================
// TRADUCCIONES
// ===========================================

const nombresAreas: Record<
  string,
  { es: string; en: string }
> = {
  'Lectura crítica': {
    es: 'Lectura crítica',
    en: 'Critical Reading'
  },

  'Matemáticas': {
    es: 'Matemáticas',
    en: 'Mathematics'
  },

  'Sociales y ciudadanas': {
    es: 'Sociales y ciudadanas',
    en: 'Social and Citizenship Studies'
  },

  'Ciencias naturales': {
    es: 'Ciencias naturales',
    en: 'Natural Sciences'
  },

  'Inglés': {
    es: 'Inglés',
    en: 'English'
  }
};

// ===========================================
// COMPONENTE PRINCIPAL
// ===========================================

export default function InstitucionGraficas({
  institucionId,
  periodos,
  idioma
}: Props) {

  const [comparacion, setComparacion] =
    useState<Comparacion | null>(null);

  const [periodo, setPeriodo] = useState('');

  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const es = idioma === 'es';

  // ===========================================
  // CARGAR RESULTADOS AUTOMÁTICAMENTE
  // ===========================================

  useEffect(() => {
    if (!institucionId) {
      setComparacion(null);
      return;
    }

    let cancelado = false;

    async function obtenerComparacion() {
      setCargando(true);
      setError('');
      setComparacion(null);

      try {
        const ruta =
          `instituciones/${institucionId}/comparacion/`;

        const datos = await api<Comparacion>(ruta);

        if (!cancelado) {
          setComparacion(datos);
          setPeriodo(String(datos.periodo.id));
        }

      } catch (e) {
        if (!cancelado) {
          setError((e as Error).message);
        }

      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    }

    void obtenerComparacion();

    return () => {
      cancelado = true;
    };

  }, [institucionId]);

  // ===========================================
  // CAMBIAR PERIODO
  // ===========================================

  async function cambiarPeriodo(id: string) {
    if (!id) return;

    setPeriodo(id);
    setError('');
    setCargando(true);
    setComparacion(null);

    try {
      const datos = await api<Comparacion>(
        `instituciones/${institucionId}/comparacion/?periodo=${id}`
      );

      setComparacion(datos);

    } catch (e) {
      setError((e as Error).message);

    } finally {
      setCargando(false);
    }
  }

  if (!institucionId) return null;

  // ===========================================
  // INTERFAZ
  // ===========================================

  return (
    <section className="space-y-5">

      <div className="panel">

        <div className="flex flex-wrap justify-between items-center gap-3">

          <h2 className="text-xl font-bold">
            {es
              ? 'Análisis por áreas Saber 11'
              : 'Saber 11 Subject Analysis'}
          </h2>

          <div className="flex gap-2 items-center">

            <label htmlFor="periodoInstitucion">
              {es ? 'Periodo:' : 'Period:'}
            </label>

            <select
              id="periodoInstitucion"
              value={periodo}
              onChange={e =>
                void cambiarPeriodo(e.target.value)
              }
              className="border rounded p-2"
            >
              {periodos.map(p => (
                <option
                  key={p.id}
                  value={p.id}
                >
                  {p.anio} · {p.periodo}
                </option>
              ))}
            </select>

          </div>
        </div>

        {comparacion && (
          <div className="mt-4">

            <h3 className="font-semibold">
              {comparacion.institucion.nombre}
            </h3>

            <p className="text-sm text-slate-500">
              DANE: {comparacion.institucion.codigo_dane}
            </p>

            <p className="text-sm text-slate-500">
              {comparacion.periodo.anio}
              {' · '}
              {comparacion.periodo.nombre}
            </p>

          </div>
        )}

      </div>

      {cargando && (
        <p role="status" className="panel">
          {es
            ? 'Cargando resultados y gráficas...'
            : 'Loading results and charts...'}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="p-4 bg-red-100 text-red-700 rounded-lg"
        >
          {error}
        </p>
      )}

      {comparacion && (
        <>
          <p className="text-sm text-slate-500">
            {es
              ? 'Comparación con la media simple de los colegios de Popayán cargados en el mismo periodo. No corresponde al promedio municipal oficial del ICFES.'
              : 'Comparison against the unweighted average of uploaded Popayán schools in the same period. This is not the official municipal ICFES average.'}
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

            {comparacion.areas.map(area => {

              const nombre =
                nombresAreas[area.nombre]?.[idioma]
                ?? area.nombre;

              const datosGrafica = [
                {
                  nombre: es
                    ? 'Colegio'
                    : 'Selected school',
                  puntaje: area.institucion
                },
                {
                  nombre: es
                    ? 'Referencia'
                    : 'Reference',
                  puntaje: area.referencia
                }
              ];

              return (
                <div
                  key={area.nombre}
                  className="panel space-y-3"
                >

                  <h3 className="text-lg font-bold">
                    {nombre}
                  </h3>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="rounded-lg bg-blue-50 dark:bg-slate-800 p-3">

                      <p className="text-xs text-slate-500">
                        {es
                          ? 'Colegio seleccionado'
                          : 'Selected school'}
                      </p>

                      <p className="text-2xl font-bold text-blue-600">
                        {area.institucion ?? 'N.D.'}
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3">

                      <p className="text-xs text-slate-500">
                        {es
                          ? 'Media de colegios cargados'
                          : 'Uploaded schools average'}
                      </p>

                      <p className="text-2xl font-bold">
                        {area.referencia ?? 'N.D.'}
                      </p>

                    </div>

                  </div>

                  <div
                    className="h-64 w-full"
                    role="img"
                    aria-label={
                      `${nombre}: colegio ${area.institucion ?? 'N.D.'}, ` +
                      `referencia ${area.referencia ?? 'N.D.'}`
                    }
                  >
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <BarChart
                        data={datosGrafica}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 25
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                        />

                        <XAxis
                          dataKey="nombre"
                          fontSize={11}
                        />

                        <YAxis
                          domain={[0, 100]}
                        />

                        <Tooltip />

                        <Bar
                          dataKey="puntaje"
                          name={
                            es
                              ? 'Puntaje promedio'
                              : 'Average score'
                          }
                        >
                          {datosGrafica.map((_, i) => (
                            <Cell
                              key={i}
                              fill={
                                i === 0
                                  ? '#2563eb'
                                  : '#94a3b8'
                              }
                            />
                          ))}
                        </Bar>

                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="text-sm space-y-1">

                    <p>
                      <strong>
                        {es
                          ? 'Diferencia:'
                          : 'Difference:'}
                      </strong>{' '}
                      {area.diferencia === null
                        ? 'N.D.'
                        : area.diferencia > 0
                          ? `+${area.diferencia}`
                          : area.diferencia}
                    </p>

                    <p className="text-slate-500">
                      {es
                        ? 'Colegios con datos:'
                        : 'Schools with data:'}{' '}
                      {area.cantidad_colegios}
                    </p>

                  </div>

                </div>
              );
            })}

          </div>

        </>
      )}

    </section>
  );
}
