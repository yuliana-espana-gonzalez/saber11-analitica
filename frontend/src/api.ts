
let csrfToken = '';

// ==========================================
// OBTENER TOKEN CSRF DESDE DJANGO
// ==========================================

export async function initCsrf(): Promise<void> {
  const response = await fetch('/api/csrf/', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo obtener el token CSRF (${response.status})`
    );
  }

  const data = await response.json();

  if (!data.csrfToken) {
    throw new Error(
      'Django no devolvió un token CSRF válido'
    );
  }

  csrfToken = data.csrfToken;
}

// ==========================================
// CLIENTE HTTP PARA DJANGO
// ==========================================

export async function api<T = any>(
  path: string,
  method = 'GET',
  body?: Record<string, unknown> | FormData
): Promise<T> {

  const httpMethod = method.toUpperCase();

  // Operaciones que modifican información
  const requiresCsrf = !['GET', 'HEAD', 'OPTIONS'].includes(
    httpMethod
  );

  // Obtener token si todavía no existe
  if (requiresCsrf && !csrfToken) {
    await initCsrf();
  }

  const isFormData = body instanceof FormData;

  // Construir las cabeceras
  const headers: Record<string, string> = {};

  if (requiresCsrf) {
    headers['X-CSRFToken'] = csrfToken;
  }

  if (body && !isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  // Función interna para ejecutar la solicitud
  async function sendRequest(): Promise<Response> {
    return fetch(
      '/api/' + path.replace(/^\/+/, ''),
      {
        method: httpMethod,
        credentials: 'include',
        headers,
        body: body
          ? isFormData
            ? body
            : JSON.stringify(body)
          : undefined
      }
    );
  }

  let response = await sendRequest();

  // Si Django rechaza el token CSRF,
  // renovar y reintentar una sola vez.
  //
  // Por seguridad, no reintentamos
  // automáticamente solicitudes POST,
  // PATCH o DELETE, ya que un 403
  // también puede representar falta de permisos.
  //
  // El token debe renovarse después del login.

  const contentType =
    response.headers.get('content-type') || '';

  let data: any;

  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    const text = await response.text();

    data = {
      error: text.includes('CSRF')
        ? 'Error de seguridad CSRF. Actualiza la sesión e inténtalo nuevamente.'
        : 'El servidor devolvió una respuesta inesperada.'
    };
  }

  // ==========================================
  // MANEJO DE ERRORES
  // ==========================================

  if (!response.ok) {

    console.error('Error en API Django:', {
      ruta: path,
      metodo: httpMethod,
      estado: response.status,
      respuesta: data
    });

    let mensaje =
      data.error ||
      data.detail ||
      data.message ||
      'No se pudo completar la solicitud';

    if (Array.isArray(mensaje)) {
      mensaje = mensaje.join(', ');
    }

    if (typeof mensaje !== 'string') {
      mensaje = JSON.stringify(mensaje);
    }

    if (response.status === 401) {
      mensaje = `No autorizado: ${mensaje}`;
    }

    if (response.status === 403) {
      mensaje = `Acceso denegado (403): ${mensaje}`;
    }

    throw new Error(mensaje);
  }

  return data as T;
}
