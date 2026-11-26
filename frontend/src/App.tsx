
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import { api, initCsrf } from './api';
import InstitucionGraficas from './InstitucionGraficas';
import ResultadosCharts from './ResultadosCharts';
import { AppShell, AuthShell } from './Layout';
import {
  useNavigate,
  useLocation
} from 'react-router-dom';
import {
  BarChart3, Upload, Users, MessageCircle,
  School, Moon, Sun, Volume2, Trash2,
  ClipboardList, AlertTriangle, CheckCircle2, UserRound
} from 'lucide-react';

// ==========================================
// TIPOS DE DATOS
// ==========================================

type User = {
  id: number;
  identificacion: string;
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  aprobacion: string;
  activo: boolean;
};

type Resultado = {
  institucion_id: number;
  institucion: string;
  codigo_dane: string;
  global: number | null;
  componentes: Record<string, number | null>;
};

type Dashboard = {
  periodo: number | null;
  instituciones: number;
  resultados: Resultado[];
  agregados: {
    etiqueta: string;
    componente: string;
    promedio: number | null;
  }[];
  resumen?: {
    registros_procesados: number;
    errores_detectados: number;
    estado: string;
    promedio_general: number | null;
  };
};

type Institucion = {
  id: number;
  nombre: string;
  codigo_dane: string;
};

type Periodo = {
  id: number;
  anio: number;
  periodo: string;
};

type Detalle = {
  institucion: Institucion;
  resultados: {
    anio: number;
    global: number | null;
    componentes: {
      nombre: string;
      promedio: number | null;
    }[];
  }[];
};


type Carga = {
  id: number;
  archivo: string;
  fecha: string;
  estado: string;
  detectados: number;
  insertados: number;
  actualizados: number;
  rechazados: number;
  diagnostico?: Record<string, unknown>;
  puede_eliminar?: boolean;
};


type Lang = 'es' | 'en';

// ==========================================
// COMPONENTES SABER 11
// ==========================================

const components = [
  'Lectura crítica',
  'Matemáticas',
  'Sociales y ciudadanas',
  'Ciencias naturales',
  'Inglés'
] as const;

const componentLabels: Record<
  string,
  Record<Lang, string>
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

// ==========================================
// TRADUCCIONES ESPAÑOL / INGLÉS
// ==========================================

const translations = {
  es: {
    subtitle: 'Analítica educativa · Popayán',
    login: 'Iniciar sesión',
    register: 'Solicitar cuenta',
    id: 'Cédula',
    firstName: 'Nombres',
    lastName: 'Apellidos',
    email: 'Correo',
    password: 'Contraseña',
    confirm: 'Confirmar contraseña',
    signIn: 'Ingresar',
    sendRequest: 'Enviar solicitud',
    haveAccount: 'Ya tengo cuenta',
    requestAccount: 'Solicitar registro de funcionario',
    requestSent: 'Solicitud enviada. Un administrador deberá aprobarla.',
    unofficial: 'Secretaría de Educación de Popayán · Prototipo técnico no oficial',
    dashboard: 'Resultados Saber 11',
    institutions: 'Instituciones',
    uploads: 'Carga de archivos',
    users: 'Gestión de usuarios',
    chat: 'Asistente IA',
    signOut: 'Cerrar sesión',
    profile: 'Mi perfil',
    recordsProcessed: 'Registros procesados',
    errorsDetected: 'Errores detectados',
    processingStatus: 'Estado del procesamiento',
    statusCompleted: 'Completado',
    statusProcessing: 'Procesando',
    statusNoData: 'Sin datos',
    statusWithErrors: 'Con errores',
    profileId: 'Identificación',
    profileName: 'Nombre',
    profileEmail: 'Correo',
    profileRole: 'Rol',
    profileStatus: 'Estado',
    resultsSubtitle: 'Carga y análisis de información académica de las instituciones educativas de Popayán.',
    pdfNoData: 'Carga datos para habilitar el informe',
    language: 'Idioma',
    toggleTheme: 'Cambiar tema',
    admin: 'Administrador',
    official: 'Funcionario',
    period: 'Periodo',
    latest: 'Más reciente',
    download: 'Descargar informe PDF',
    analyzed: 'Instituciones analizadas',
    loaded: 'Resultados cargados',
    municipal: 'Promedio municipal oficial',
    unavailable: 'No disponible',
    compareBy: 'Comparar por',
    globalScore: 'Puntaje global',
    averageScore: 'Puntaje promedio',
    institutionResults: 'Resultados por institución',
    institution: 'Institución',
    chartLabel: 'Gráfico de barras de promedios por institución',
    chooseInstitution: 'Seleccionar institución',
    choose: 'Elige una institución',
    dane: 'DANE',
    uploadTitle: 'Cargar Excel oficial (.xls, .xlsx) o CSV normalizado',
    process: 'Procesar y guardar en PostgreSQL',
    processing: 'Procesando...',
    uploadHint: 'Máximo 10 MB. El CSV debe tener codigo_dane, nombre, anio y promedio_global.',
    uploadHistory: 'Historial de cargas',
    newRecords: 'nuevos',
    updatedRecords: 'actualizados',
    rejectedRecords: 'rechazados',
    uploadedFile: 'Archivo cargado',
    requests: 'Solicitudes y funcionarios',
    active: 'Activo',
    inactive: 'Inactivo',
    pending: 'PENDIENTE',
    approved: 'APROBADO',
    rejected: 'RECHAZADO',
    approve: 'Aprobar',
    reject: 'Rechazar',
    deactivate: 'Desactivar',
    aiTitle: 'Interpretación con Ollama',
    aiInfo: 'La IA recibe estadísticas verificadas (hasta 20 instituciones). No ejecuta SQL generado.',
    question: '¿Qué instituciones tuvieron mayor puntaje global?',
    ask: 'Consultar',
    readAnswer: 'Leer respuesta',
    stopVoice: 'Detener voz',
    noVoice: 'Voz no disponible en este navegador',
    disclaimer: 'Datos oficiales solamente cuando se haya importado y validado el archivo ICFES. No atribuir causalidad a los promedios.'
  },

  en: {
    subtitle: 'Educational analytics · Popayán',
    login: 'Sign in',
    register: 'Request an account',
    id: 'Identification number',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    password: 'Password',
    confirm: 'Confirm password',
    signIn: 'Sign in',
    sendRequest: 'Submit request',
    haveAccount: 'I already have an account',
    requestAccount: 'Request a staff account',
    requestSent: 'Request submitted. An administrator must approve it.',
    unofficial: 'Popayán Education Secretariat · Unofficial technical prototype',
    dashboard: 'Saber 11 Results',
    institutions: 'Schools',
    uploads: 'File upload',
    users: 'User Management',
    chat: 'AI Assistant',
    signOut: 'Sign out',
    profile: 'My profile',
    recordsProcessed: 'Records processed',
    errorsDetected: 'Errors detected',
    processingStatus: 'Processing status',
    statusCompleted: 'Completed',
    statusProcessing: 'Processing',
    statusNoData: 'No data',
    statusWithErrors: 'With errors',
    profileId: 'Identification number',
    profileName: 'Name',
    profileEmail: 'Email',
    profileRole: 'Role',
    profileStatus: 'Status',
    resultsSubtitle: 'Upload and analyze academic information from Popayán schools.',
    pdfNoData: 'Upload data to enable the report',
    language: 'Language',
    toggleTheme: 'Switch theme',
    admin: 'Administrator',
    official: 'Staff member',
    period: 'Exam period',
    latest: 'Latest',
    download: 'Download PDF report',
    analyzed: 'Schools analyzed',
    loaded: 'Results imported',
    municipal: 'Official municipal average',
    unavailable: 'Not available',
    compareBy: 'Compare by',
    globalScore: 'Overall score',
    averageScore: 'Average score',
    institutionResults: 'Results by school',
    institution: 'School',
    chartLabel: 'Bar chart of average scores by school',
    chooseInstitution: 'Select a school',
    choose: 'Choose a school',
    dane: 'DANE',
    uploadTitle: 'Upload an official Excel (.xls, .xlsx) or normalized CSV',
    process: 'Process and save to PostgreSQL',
    processing: 'Processing...',
    uploadHint: 'Maximum 10 MB. The CSV must include codigo_dane, nombre, anio and promedio_global.',
    uploadHistory: 'Upload history',
    newRecords: 'new',
    updatedRecords: 'updated',
    rejectedRecords: 'rejected',
    uploadedFile: 'File uploaded',
    requests: 'Requests and staff members',
    active: 'Active',
    inactive: 'Inactive',
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED',
    approve: 'Approve',
    reject: 'Reject',
    deactivate: 'Deactivate',
    aiTitle: 'Analysis with Ollama',
    aiInfo: 'The AI receives verified statistics (up to 20 schools). It does not execute generated SQL.',
    question: 'Which schools had the highest overall scores?',
    ask: 'Ask',
    readAnswer: 'Read answer',
    stopVoice: 'Stop voice',
    noVoice: 'Voice is unavailable in this browser',
    disclaimer: 'Data is official only after an ICFES file has been imported and validated. Do not infer causation from average scores.'
  }
};

// ==========================================
// LECTURA POR VOZ
// ==========================================

function speak(
  text: string,
  language: Lang,
  noVoice: string
) {
  if (!('speechSynthesis' in window)) {
    alert(noVoice);
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language === 'es' ? 'es-CO' : 'en-US';

  window.speechSynthesis.speak(utterance);
}

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export default function App() {
  // Navegación mediante rutas URL
  const navigate = useNavigate();
  const location = useLocation();
  // ESTADOS GENERALES
  const [user, setUser] = useState<User | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  // AUTENTICACIÓN
  const [form, setForm] = useState({
    identificacion: '',
    nombre: '',
    apellido: '',
    correo: '',
    contrasena: '',
    confirmacion: ''
  });

  const [registro, setRegistro] = useState(false);

  // PERIODOS
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [periodo, setPeriodo] = useState('');

  // DASHBOARD
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [comp, setComp] = useState('GLOBAL');

  // INSTITUCIONES
  const [instituciones, setInstituciones] = useState<Institucion[]>([]);
  const [seleccion, setSeleccion] = useState('');
  const [detalle, setDetalle] = useState<Detalle | null>(null);

  // USUARIOS
  const [usuarios, setUsuarios] = useState<User[]>([]);

  // ETL
  const [historial, setHistorial] = useState<Carga[]>([]);
  const [cargaAEliminar, setCargaAEliminar] = useState<Carga | null>(null);

  // INTELIGENCIA ARTIFICIAL
  const [pregunta, setPregunta] = useState('');
  const [respuesta, setRespuesta] = useState('');

  // CONFIGURACIÓN VISUAL
  const [dark, setDark] = useState(
    localStorage.getItem('tema') === 'oscuro'
  );

  const [idioma, setIdioma] = useState<Lang>(
    localStorage.getItem('idioma') === 'en' ? 'en' : 'es'
  );

  // OBTENER TRADUCCIONES
  const t = translations[idioma];

  // ESTADO DEL PROCESAMIENTO Y DATOS DISPONIBLES
  const estadoActual = dashboard?.resumen?.estado ?? 'SIN_DATOS';

  const estadosInfo: Record<string, { label: string; color: string }> = {
    COMPLETADO: { label: t.statusCompleted, color: 'var(--green)' },
    PROCESANDO: { label: t.statusProcessing, color: 'var(--orange)' },
    CON_ERRORES: { label: t.statusWithErrors, color: 'var(--danger)' },
    SIN_DATOS: { label: t.statusNoData, color: 'var(--muted)' }
  };

  const estadoInfo = estadosInfo[estadoActual] ?? estadosInfo.SIN_DATOS;

  const hasDashboardData =
    !!dashboard && dashboard.resultados.length > 0;

  // ==========================================
  // CONTROL DE ROLES
  // ==========================================

  const isAdmin = user?.rol === 'ADMIN';

  // El administrador solo puede visualizar
  // el módulo de gestión de usuarios.

  const accessiblePage = isAdmin
    ? ['usuarios', 'perfil'].includes(page)
      ? page
      : 'usuarios'
    : ['dashboard', 'instituciones', 'cargas', 'chat', 'perfil'].includes(page)
      ? page
      : 'dashboard';

  const currentPage = user ? accessiblePage : 'dashboard';

  const titles: Record<string, string> = {
    dashboard: t.dashboard,
    instituciones: t.institutions,
    cargas: t.uploads,
    usuarios: t.users,
    chat: t.chat,
    perfil: t.profile
  };

  // ==========================================
  // GUARDAR TEMA
  // ==========================================

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem(
      'tema',
      dark ? 'oscuro' : 'claro'
    );
  }, [dark]);

  // ==========================================
  // GUARDAR IDIOMA
  // ==========================================

  useEffect(() => {
    localStorage.setItem('idioma', idioma);
    document.documentElement.lang = idioma;
  }, [idioma]);


  // ==========================================
  // VERIFICAR SESIÓN AL ENTRAR A LA APLICACIÓN
  // ==========================================

  useEffect(() => {
    let activo = true;

    async function verificarSesion() {
      setVerificandoSesion(true);

      try {
        await initCsrf();

        const respuesta = await api<{
          usuario: User;
        }>('sesion/');

        if (!activo) return;

        const usuario = respuesta.usuario;

        if (
          usuario &&
          usuario.activo &&
          usuario.aprobacion === 'APROBADO' &&
          ['ADMIN', 'FUNCIONARIO'].includes(usuario.rol)
        ) {
          setUser(usuario);

          setPage(
            usuario.rol === 'ADMIN'
              ? 'usuarios'
              : 'dashboard'
          );
        } else {
          setUser(null);
        }

      } catch {
        if (activo) {
          setUser(null);
        }

      } finally {
        if (activo) {
          setVerificandoSesion(false);
        }
      }
    }

    void verificarSesion();

    return () => {
      activo = false;
    };
  }, []);


  // ==========================================
  // RUTAS PROTEGIDAS SEGÚN EL ROL
  // ==========================================

  useEffect(() => {

    // Esperar la respuesta de Django
    if (verificandoSesion) return;

    // Si NO existe sesión, enviar al login
    if (!user) {

      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true
        });
      }

      return;
    }

    // Ruta autorizada según el rol
    const rutaPermitida =
      user.rol === 'ADMIN'
        ? '/administrador/usuarios'
        : '/analisis-datos-funcionario';

    // Impedir navegar a la ruta de otro rol
    if (location.pathname !== rutaPermitida) {

      navigate(rutaPermitida, {
        replace: true
      });
    }

  }, [
    user,
    verificandoSesion,
    location.pathname,
    navigate
  ]);



  // ==========================================
  // MANEJO DE SOLICITUDES
  // ==========================================

  const run = async (
    action: () => Promise<void>
  ) => {
    setBusy(true);
    setError('');
    setMsg('');

    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ==========================================
  // ACTUALIZAR DATOS
  // ==========================================

  const refresh = async () => {
    const [p, d, i] = await Promise.all([
      api<Periodo[]>('periodos/'),
      api<Dashboard>(
        'dashboard/' +
        (periodo ? '?periodo=' + periodo : '')
      ),
      api<Institucion[]>('instituciones/')
    ]);

    setPeriodos(p);
    setDashboard(d);
    setInstituciones(i);
  };

  // Solo el funcionario consulta resultados.
  useEffect(() => {
    if (!user || user.rol === 'ADMIN') return;

    refresh().catch(e =>
      setError((e as Error).message)
    );
  }, [user, periodo]);

  // Cargar usuarios o historial según el rol.
  useEffect(() => {
    if (!user) return;

    if (user.rol === 'ADMIN') {
      api<User[]>('usuarios/')
        .then(setUsuarios)
        .catch(e => setError((e as Error).message));
    } else if (currentPage === 'cargas') {
      api<Carga[]>('etl/cargas/')
        .then(setHistorial)
        .catch(e => setError((e as Error).message));
    }
  }, [user, currentPage]);

  // ==========================================
  // INICIO DE SESIÓN Y REGISTRO
  // ==========================================

  

// ==========================================
// ELIMINAR CARGA ETL
// ==========================================

async function eliminarCarga() {

  if (!cargaAEliminar || busy) return;

  const carga = cargaAEliminar;

  await run(async () => {

    // Solicitar eliminación a Django
    const respuesta = await api<{
      mensaje: string;
      resultados_eliminados: number;
      advertencia?: string;
    }>(
      `etl/cargas/${carga.id}/`,
      'DELETE'
    );

    // Cerrar la confirmación
    setCargaAEliminar(null);

    // Actualizar historial desde PostgreSQL
    const nuevasCargas = await api<Carga[]>(
      'etl/cargas/'
    );

    setHistorial(nuevasCargas);

    // Actualizar dashboard y estadísticas
    await refresh();

    setMsg(
      idioma === 'es'
        ? `${respuesta.mensaje}. Resultados eliminados: ${respuesta.resultados_eliminados}. ${respuesta.advertencia || ''}`
        : `Upload deleted. Results removed: ${respuesta.resultados_eliminados}. ${respuesta.advertencia || ''}`
    );

  });
}

  // ==========================================
  // REGISTRO E INICIO DE SESIÓN
  // ==========================================

  async function submitAuth() {

    await run(async () => {

      if (registro) {

        // Registrar funcionario pendiente
        await api('registrar/', 'POST', form);

        setMsg(t.requestSent);
        setRegistro(false);

      } else {

        // Autenticación en Django
        const data = await api<{
          usuario: User;
        }>(
          'login/',
          'POST',
          {
            identificacion: form.identificacion,
            contrasena: form.contrasena
          }
        );

        // Renovar CSRF después de iniciar sesión
        await initCsrf();

        const usuario = data.usuario;

        // Validar rol y estado
        if (
          !usuario.activo ||
          usuario.aprobacion !== 'APROBADO' ||
          !['ADMIN', 'FUNCIONARIO'].includes(usuario.rol)
        ) {
          throw new Error(
            'La cuenta no tiene acceso autorizado.'
          );
        }

        // Guardar usuario autenticado
        setUser(usuario);

        // Asignar página inicial
        if (usuario.rol === 'ADMIN') {

          setPage('usuarios');

          navigate('/administrador/usuarios', {
            replace: true
          });

        } else {

          setPage('dashboard');

          navigate('/analisis-datos-funcionario', {
            replace: true
          });
        }
      }
    });
  }


  // ==========================================
  // DESCARGA DEL INFORME PDF
  // ==========================================

  async function descargarInforme() {
    await run(async () => {
      const ruta =
        '/api/informe/' +
        (periodo ? '?periodo=' + periodo : '');

      const response = await fetch(ruta, {
        method: 'GET',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(
          idioma === 'es'
            ? 'No se pudo generar el informe PDF.'
            : 'Could not generate the PDF report.'
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');

      enlace.href = url;
      enlace.download = 'informe_saber11.pdf';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    });
  }

  // ==========================================
  // PREFERENCIAS DE IDIOMA Y TEMA
  // ==========================================

  const preferences = (
    <div className="flex gap-2 items-center">

      <select
        aria-label={t.language}
        className="max-w-[140px]"
        value={idioma}
        onChange={e =>
          setIdioma(e.target.value as Lang)
        }
      >
        <option value="es">Español</option>
        <option value="en">English</option>
      </select>

      <button
        type="button"
        aria-label={t.toggleTheme}
        onClick={() => setDark(!dark)}
        className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--ink)] hover:bg-[var(--surface-2)]"
      >
        {dark
          ? <Sun size={20} />
          : <Moon size={20} />}
      </button>

    </div>
  );



if (verificandoSesion) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg)] text-[var(--ink)]">
      <div className="text-center space-y-3">

        <h1 className="text-2xl font-bold">
          SABER 11 · POPAYÁN
        </h1>

        <p className="text-[var(--muted)]">
          {idioma === 'es'
            ? 'Verificando acceso...'
            : 'Checking access...'}
        </p>

      </div>
    </main>
  );
}


  // ==========================================
  // PANTALLA LOGIN Y REGISTRO
  // ==========================================

  if (!user) {
    return (
      <AuthShell preferences={preferences}>

        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-[var(--ink)]">
            {registro ? t.register : t.login}
          </h1>

          <span className="text-xs font-black text-[var(--brand-blue)]">
            SABER 11
          </span>
        </div>

        <form
            onSubmit={e => {
              e.preventDefault();
              void submitAuth();
            }}
            className="mt-4 grid gap-3"
          >

            <input
              required
              aria-label={t.id}
              placeholder={t.id}
              value={form.identificacion}
              onChange={e =>
                setForm({
                  ...form,
                  identificacion: e.target.value
                })
              }
            />

            {registro && (
              <>
                <input
                  required
                  aria-label={t.firstName}
                  placeholder={t.firstName}
                  value={form.nombre}
                  onChange={e =>
                    setForm({
                      ...form,
                      nombre: e.target.value
                    })
                  }
                />

                <input
                  required
                  aria-label={t.lastName}
                  placeholder={t.lastName}
                  value={form.apellido}
                  onChange={e =>
                    setForm({
                      ...form,
                      apellido: e.target.value
                    })
                  }
                />

                <input
                  required
                  type="email"
                  aria-label={t.email}
                  placeholder={t.email}
                  value={form.correo}
                  onChange={e =>
                    setForm({
                      ...form,
                      correo: e.target.value
                    })
                  }
                />
              </>
            )}

            <input
              required
              type="password"
              aria-label={t.password}
              placeholder={t.password}
              value={form.contrasena}
              onChange={e =>
                setForm({
                  ...form,
                  contrasena: e.target.value
                })
              }
            />

            {registro && (
              <input
                required
                type="password"
                aria-label={t.confirm}
                placeholder={t.confirm}
                value={form.confirmacion}
                onChange={e =>
                  setForm({
                    ...form,
                    confirmacion: e.target.value
                  })
                }
              />
            )}

            <button disabled={busy} className="btn">
              {registro ? t.sendRequest : t.signIn}
            </button>

          </form>

          <button
            className="mt-4 text-sm font-semibold text-[var(--brand-blue)] underline"
            onClick={() => {
              setRegistro(!registro);
              setError('');
              setMsg('');
            }}
          >
            {registro
              ? t.haveAccount
              : t.requestAccount}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-[var(--danger)]">
              {error}
            </p>
          )}

          {msg && (
            <p role="status" className="mt-3 text-[var(--green)]">
              {msg}
            </p>
          )}

          <p className="mt-5 text-xs text-[var(--muted)]">
            {t.unofficial}
          </p>

      </AuthShell>
    );
  }

  // ==========================================
  // MENÚ SEGÚN EL ROL
  // ==========================================

  const menu: {
    id: string;
    label: string;
    Icon: typeof BarChart3;
  }[] = isAdmin

    // ADMINISTRADOR
    ? [
        { id: 'usuarios', label: t.users, Icon: Users },
        { id: 'perfil', label: t.profile, Icon: UserRound }
      ]

    // FUNCIONARIO
    : [
        { id: 'dashboard', label: t.dashboard, Icon: BarChart3 },
        { id: 'instituciones', label: t.institutions, Icon: School },
        { id: 'cargas', label: t.uploads, Icon: Upload },
        { id: 'chat', label: t.chat, Icon: MessageCircle },
        { id: 'perfil', label: t.profile, Icon: UserRound }
      ];

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <AppShell
      user={user}
      menu={menu}
      currentPage={currentPage}
      onNavigate={id => {
        setPage(id);
        setError('');
      }}
      onLogout={() =>
        void run(async () => {
          await api('logout/', 'POST');
          setUser(null);
          setPage('dashboard');
          setPregunta('');
          setRespuesta('');
          await initCsrf();
        })
      }
      title={titles[currentPage]}
      subtitle={currentPage === 'dashboard' ? t.resultsSubtitle : undefined}
      preferences={preferences}
      footer={t.disclaimer}
    >

        {/* MENSAJES */}
        {error && (
          <p
            role="alert"
            className="p-3 mb-4 rounded bg-red-100 text-red-700"
          >
            {error}
          </p>
        )}

        {msg && (
          <p
            role="status"
            className="p-3 mb-4 rounded bg-green-100 text-green-700"
          >
            {msg}
          </p>
        )}

        {/* =====================================
            SECCIÓN ADMINISTRADOR
        ===================================== */}

        {isAdmin && currentPage === 'usuarios' && (
          <div className="panel">

            <h2 className="font-bold mb-4">
              {t.requests}
            </h2>

            {usuarios.map(u => (
              <div
                key={u.id}
                className="flex flex-wrap gap-3 items-center justify-between py-3 border-b dark:border-slate-800"
              >

                <div>
                  <b>
                    {u.nombre} {u.apellido}
                  </b>

                  {' · '}
                  {u.identificacion}

                  <p className="text-xs">
                    {u.correo}
                    {' · '}
                    {
                      u.aprobacion === 'PENDIENTE'
                        ? t.pending
                        : u.aprobacion === 'APROBADO'
                          ? t.approved
                          : t.rejected
                    }
                    {' · '}
                    {u.activo ? t.active : t.inactive}
                  </p>
                </div>

                {u.rol === 'FUNCIONARIO' && (
                  <div className="flex flex-wrap gap-2">

                    {/* APROBAR */}
                    <button
                      className="btn"
                      disabled={
                        busy ||
                        u.aprobacion === 'APROBADO'
                      }
                      onClick={() =>
                        void run(async () => {
                          await api(
                            'usuarios/' + u.id + '/',
                            'PATCH',
                            { aprobacion: 'APROBADO' }
                          );

                          setUsuarios(
                            await api<User[]>('usuarios/')
                          );
                        })
                      }
                    >
                      {t.approve}
                    </button>

                    {/* RECHAZAR */}
                    <button
                      className="border rounded px-3"
                      disabled={
                        busy ||
                        u.aprobacion === 'RECHAZADO'
                      }
                      onClick={() =>
                        void run(async () => {
                          await api(
                            'usuarios/' + u.id + '/',
                            'PATCH',
                            { aprobacion: 'RECHAZADO' }
                          );

                          setUsuarios(
                            await api<User[]>('usuarios/')
                          );
                        })
                      }
                    >
                      {t.reject}
                    </button>

                    {/* DESACTIVAR */}
                    <button
                      className="border rounded px-3"
                      disabled={busy || !u.activo}
                      onClick={() =>
                        void run(async () => {
                          await api(
                            'usuarios/' + u.id + '/',
                            'DELETE'
                          );

                          setUsuarios(
                            await api<User[]>('usuarios/')
                          );
                        })
                      }
                    >
                      {t.deactivate}
                    </button>

                  </div>
                )}

              </div>
            ))}

          </div>
        )}

        {/* =====================================
            DASHBOARD FUNCIONARIO
        ===================================== */}

        {!isAdmin && currentPage === 'dashboard' && (
          <div className="space-y-5">

            <div className="card flex flex-wrap items-center gap-3">

              <label htmlFor="periodo" className="font-semibold">
                {t.period}
              </label>

              <select
                id="periodo"
                className="max-w-xs"
                value={periodo}
                onChange={e =>
                  setPeriodo(e.target.value)
                }
              >
                <option value="">
                  {t.latest}
                </option>

                {periodos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.anio} · {p.periodo}
                  </option>
                ))}
              </select>

              <button
                className="btn"
                onClick={() => void descargarInforme()}
                disabled={!hasDashboardData || busy}
                title={!hasDashboardData ? t.pdfNoData : undefined}
              >
                {t.download}
              </button>

            </div>

            {/* TARJETAS ESTADÍSTICAS */}
            <section className="grid gap-4 md:grid-cols-3">

              <div className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--muted)]">
                      {t.recordsProcessed}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[var(--brand-blue)]">
                      {dashboard?.resumen?.registros_procesados
                        ?? dashboard?.resultados.length
                        ?? '—'}
                    </p>
                  </div>
                  <span className="rounded-xl bg-[var(--active-bg)] p-2 text-[var(--brand-blue)]">
                    <ClipboardList size={20} />
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--muted)]">
                      {t.errorsDetected}
                    </p>
                    <p className="mt-2 text-3xl font-bold text-[var(--danger)]">
                      {dashboard?.resumen?.errores_detectados ?? 0}
                    </p>
                  </div>
                  <span className="rounded-xl bg-[var(--danger-soft)] p-2 text-[var(--danger)]">
                    <AlertTriangle size={20} />
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--muted)]">
                      {t.processingStatus}
                    </p>
                    <p
                      className="mt-2 text-xl font-bold"
                      style={{ color: estadoInfo.color }}
                    >
                      {estadoInfo.label}
                    </p>
                    {dashboard?.resumen?.promedio_general != null && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {t.averageScore}: {dashboard.resumen.promedio_general}
                      </p>
                    )}
                  </div>
                  <span className="rounded-xl bg-[var(--active-bg)] p-2 text-[var(--brand-blue)]">
                    <CheckCircle2 size={20} />
                  </span>
                </div>
              </div>

            </section>

            {/* GRÁFICAS NUEVAS (barras, radar/dona) */}
            <ResultadosCharts
              resultados={dashboard?.resultados || []}
              idioma={idioma}
            />

            {/* GRÁFICA DE BARRAS */}
            <div className="panel">

              <label htmlFor="componente">
                {t.compareBy}
              </label>

              <select
                id="componente"
                className="max-w-xs ml-3"
                value={comp}
                onChange={e =>
                  setComp(e.target.value)
                }
              >
                <option value="GLOBAL">
                  {t.globalScore}
                </option>

                {components.map(c => (
                  <option key={c} value={c}>
                    {componentLabels[c][idioma]}
                  </option>
                ))}
              </select>

              <div
                className="h-96 mt-5"
                role="img"
                aria-label={t.chartLabel}
              >
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={(dashboard?.resultados || [])
                      .slice(0, 20)
                      .map(r => ({
                        nombre: r.institucion.slice(0, 19),
                        promedio:
                          comp === 'GLOBAL'
                            ? r.global
                            : r.componentes[comp]
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="nombre"
                      interval={0}
                      angle={-35}
                      textAnchor="end"
                      height={100}
                      fontSize={10}
                    />

                    <YAxis domain={[0, 'auto']} />
                    <Tooltip />
                    <Legend />

                    <Bar
                      dataKey="promedio"
                      fill="#2563eb"
                      name={t.averageScore}
                    />

                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TABLA DE RESULTADOS */}
            <div className="panel overflow-x-auto">

              <h2 className="font-bold mb-3">
                {t.institutionResults}
              </h2>

              <table className="w-full text-sm">

                <thead>
                  <tr>
                    <th className="text-left">
                      {t.institution}
                    </th>

                    <th>{t.globalScore}</th>

                    {components.map(c => (
                      <th key={c}>
                        {componentLabels[c][idioma]}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {dashboard?.resultados.map(r => (
                    <tr
                      key={r.codigo_dane}
                      className="border-t dark:border-slate-800"
                    >
                      <td className="py-2">
                        {r.institucion}
                      </td>

                      <td className="text-center">
                        {r.global ?? 'N.D.'}
                      </td>

                      {components.map(c => (
                        <td
                          key={c}
                          className="text-center"
                        >
                          {r.componentes[c] ?? 'N.D.'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>

          </div>
        )}

        {/* =====================================
            INSTITUCIONES FUNCIONARIO
        ===================================== */}

{/* ==========================================
    INSTITUCIONES Y GRÁFICAS POR ÁREA
========================================== */}

{!isAdmin && currentPage === 'instituciones' && (

  <div className="space-y-5">

    {/* ======================================
        SELECCIÓN Y FICHA DE INSTITUCIÓN
    ====================================== */}

    <div className="grid lg:grid-cols-2 gap-5">

      {/* SELECCIÓN DE INSTITUCIÓN */}
      <div className="panel">

        <h2 className="font-bold mb-3">
          {t.chooseInstitution}
        </h2>

        <select
          value={seleccion}
          onChange={e => {

            const id = e.target.value;

            // Guardar la institución seleccionada
            setSeleccion(id);

            // Limpiar la información anterior
            setDetalle(null);

            if (!id) return;

            // Consultar los resultados en Django
            void run(async () => {

              const resultado = await api<Detalle>(
                'instituciones/' + id + '/'
              );

              setDetalle(resultado);

            });
          }}
        >

          <option value="">
            {t.choose}
          </option>

          {instituciones.map(i => (

            <option
              key={i.id}
              value={i.id}
            >
              {i.nombre} · {i.codigo_dane}
            </option>

          ))}

        </select>

      </div>

      {/* ======================================
          FICHA DE LA INSTITUCIÓN
      ====================================== */}

      {detalle && (

        <div className="panel">

          <h2 className="font-bold text-lg">
            {detalle.institucion.nombre}
          </h2>

          <p className="text-sm text-slate-500 mt-1">
            DANE: {detalle.institucion.codigo_dane}
          </p>

          {/* RESULTADOS POR PERIODO */}
          {detalle.resultados.map((r, i) => (

            <section
              key={i}
              className="mt-4"
            >

              <h3 className="font-semibold mb-3">

                {r.anio} · {t.globalScore}:{' '}

                <span className="text-blue-600">
                  {r.global ?? 'N.D.'}
                </span>

              </h3>

              {/* CINCO COMPONENTES SABER 11 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {r.componentes.map(c => (

                  <div
                    key={c.nombre}
                    className="rounded-lg bg-slate-100 dark:bg-slate-800 p-3"
                  >

                    <p className="text-sm text-slate-500">
                      {
                        componentLabels[c.nombre]?.[idioma]
                        ?? c.nombre
                      }
                    </p>

                    <p className="text-xl font-bold mt-1">
                      {c.promedio ?? 'N.D.'}
                    </p>

                  </div>

                ))}

              </div>

            </section>

          ))}

        </div>

      )}

    </div>

    {/* ======================================
        GRÁFICAS AUTOMÁTICAS POR INSTITUCIÓN
    ====================================== */}

    {seleccion && (

      <InstitucionGraficas
        key={seleccion}
        institucionId={seleccion}
        periodos={periodos}
        idioma={idioma}
      />

    )}

  </div>

)}


        {/* =====================================
            CARGA ETL FUNCIONARIO
        ===================================== */}

        {!isAdmin && currentPage === 'cargas' && (
          <div className="space-y-5">

            <form
              className="card space-y-4"
              onSubmit={e => {
                e.preventDefault();

                const file = (
                  e.currentTarget.elements.namedItem(
                    'archivo'
                  ) as HTMLInputElement
                ).files?.[0];

                if (!file) return;

                void run(async () => {
                  const data = new FormData();

                  data.append('archivo', file);

                  const r = await api<{
                    insertados: number;
                    actualizados: number;
                    rechazados: number;
                  }>(
                    'etl/cargas/',
                    'POST',
                    data
                  );

                  setMsg(
                    `${t.uploadedFile}: ${r.insertados} ${t.newRecords}, ` +
                    `${r.actualizados} ${t.updatedRecords}, ` +
                    `${r.rechazados} ${t.rejectedRecords}`
                  );

                  setHistorial(
                    await api<Carga[]>('etl/cargas/')
                  );

                  await refresh();
                });
              }}
            >

              <h2 className="text-lg font-bold text-[var(--ink)]">
                {t.uploadTitle}
              </h2>

              <div className="upload-zone space-y-3">

                <Upload
                  size={34}
                  className="mx-auto text-[var(--brand-blue)]"
                  aria-hidden="true"
                />

                <p className="font-semibold text-[var(--ink)]">
                  {idioma === 'es'
                    ? 'Selecciona el archivo que deseas procesar'
                    : 'Select the file you want to process'}
                </p>

                <p className="text-xs text-[var(--muted)]">
                  {idioma === 'es'
                    ? 'Formatos permitidos: .xlsx y .csv'
                    : 'Allowed formats: .xlsx and .csv'}
                </p>

                <input
                  type="file"
                  name="archivo"
                  aria-label={t.uploadTitle}
                  accept=".xls,.xlsx,.csv"
                  className="mx-auto max-w-md"
                  required
                />

              </div>

              <button disabled={busy} className="btn w-full sm:w-auto">
                {busy ? t.processing : t.process}
              </button>

              <p className="text-xs text-[var(--muted)]">
                {t.uploadHint}
              </p>

            </form>

            
{/* ==========================================
    HISTORIAL DE CARGAS ETL
========================================== */}

<div className="panel space-y-4">

  <h2 className="font-bold text-lg">
    {t.uploadHistory}
  </h2>

  {historial.length === 0 && (
    <p className="text-sm text-slate-500">
      {idioma === 'es'
        ? 'Todavía no has subido archivos.'
        : 'You have not uploaded any files yet.'}
    </p>
  )}

  {historial.map(h => (

    <div
      key={h.id}
      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg border dark:border-slate-700"
    >

      {/* INFORMACIÓN DE LA CARGA */}
      <div className="min-w-0 flex-1 space-y-1">

        <p className="font-semibold break-all">
          {h.archivo}
        </p>

        <p className="text-sm text-slate-500">
          {h.estado}
        </p>

        <p className="text-xs text-slate-500">
          {h.insertados} {t.newRecords}
          {' · '}
          {h.actualizados} {t.updatedRecords}
          {' · '}
          {h.rechazados} {t.rejectedRecords}
        </p>

        <p className="text-xs text-slate-500">
          {new Date(h.fecha).toLocaleString(
            idioma === 'es' ? 'es-CO' : 'en-US'
          )}
        </p>

      </div>

      {/* BOTÓN ELIMINAR */}
      <button
        type="button"
        disabled={busy || h.puede_eliminar === false}
        onClick={() => setCargaAEliminar(h)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
        title={
          h.puede_eliminar === false
            ? idioma === 'es'
              ? 'Esta carga actualizó resultados anteriores y no puede eliminarse de forma segura.'
              : 'This upload modified previous results and cannot be safely deleted.'
            : ''
        }
      >
        <Trash2 size={17} />

        {idioma === 'es'
          ? 'Eliminar'
          : 'Delete'}
      </button>

    </div>

  ))}

</div>

{/* ==========================================
    CONFIRMACIÓN DE ELIMINACIÓN
========================================== */}

{cargaAEliminar && (

  <div
    className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
  >

    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tituloEliminarCarga"
      className="bg-white dark:bg-slate-900 rounded-xl shadow-xl p-6 w-full max-w-md space-y-4"
    >

      <h2
        id="tituloEliminarCarga"
        className="text-xl font-bold"
      >
        {idioma === 'es'
          ? '¿Eliminar archivo?'
          : 'Delete upload?'}
      </h2>

      <p className="text-sm break-all">
        {cargaAEliminar.archivo}
      </p>

      <p className="text-sm text-slate-600 dark:text-slate-300">
        {idioma === 'es'
          ? 'Se eliminarán los resultados asociados a esta carga que aún le pertenecen. Esta operación no se puede deshacer desde la aplicación.'
          : 'Results still associated with this upload will be deleted. This action cannot be undone from the application.'}
      </p>

      <div className="flex justify-end gap-3">

        <button
          type="button"
          disabled={busy}
          onClick={() => setCargaAEliminar(null)}
          className="px-4 py-2 rounded-lg border"
        >
          {idioma === 'es'
            ? 'Cancelar'
            : 'Cancel'}
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => void eliminarCarga()}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
        >
          {busy
            ? idioma === 'es'
              ? 'Eliminando...'
              : 'Deleting...'
            : idioma === 'es'
              ? 'Sí, eliminar'
              : 'Yes, delete'}
        </button>

      </div>

    </div>

  </div>

)}


          </div>
        )}

        {/* =====================================
            MI PERFIL
        ===================================== */}

        {currentPage === 'perfil' && (
          <div className="card max-w-2xl">

            <h2 className="text-lg font-bold text-[var(--ink)]">
              {t.profile}
            </h2>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t.profileId}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--ink)]">
                  {user.identificacion}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t.profileName}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--ink)]">
                  {`${user.nombre} ${user.apellido}`.trim() || '—'}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t.profileEmail}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--ink)]">
                  {user.correo}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t.profileRole}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--ink)]">
                  {isAdmin ? t.admin : t.official}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t.profileStatus}
                </dt>
                <dd className="mt-1 font-semibold text-[var(--green)]">
                  {user.aprobacion === 'APROBADO'
                    ? t.approved
                    : user.aprobacion === 'PENDIENTE'
                      ? t.pending
                      : t.rejected}
                </dd>
              </div>

            </dl>
          </div>
        )}

        {/* =====================================
            ASISTENTE IA FUNCIONARIO
        ===================================== */}

        {!isAdmin && currentPage === 'chat' && (
          <div className="panel max-w-3xl space-y-4">

            <h2 className="font-bold">
              {t.aiTitle}
            </h2>

            <p className="text-sm text-slate-500">
              {t.aiInfo}
            </p>

            <textarea
              rows={4}
              value={pregunta}
              onChange={e =>
                setPregunta(e.target.value)
              }
              placeholder={t.question}
            />

            <div className="flex flex-wrap gap-3">

              <button
                disabled={busy || !pregunta.trim()}
                className="btn"
                onClick={() =>
                  void run(async () => {
                    const r = await api<{
                      respuesta: string;
                    }>(
                      'chat/',
                      'POST',
                      {
                        pregunta,
                        periodo: periodo || undefined
                      }
                    );

                    setRespuesta(r.respuesta);
                  })
                }
              >
                {t.ask}
              </button>

              <button
                disabled={!respuesta}
                className="border rounded px-3 flex gap-2 items-center"
                onClick={() =>
                  speak(respuesta, idioma, t.noVoice)
                }
              >
                <Volume2 size={16} />
                {t.readAnswer}
              </button>

              <button
                className="border rounded px-3"
                onClick={() =>
                  window.speechSynthesis?.cancel()
                }
              >
                {t.stopVoice}
              </button>

            </div>

            {respuesta && (
              <article className="rounded-lg bg-slate-100 dark:bg-slate-800 p-4 whitespace-pre-wrap">
                {respuesta}
              </article>
            )}

          </div>
        )}

    </AppShell>
  );
}

