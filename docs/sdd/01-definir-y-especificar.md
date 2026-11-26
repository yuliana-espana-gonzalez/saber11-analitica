# SDD · Definir y especificar (versión 0.1)

## Contexto

La Secretaría de Educación Municipal de Popayán necesita centralizar reportes agregados Saber 11 de ocho hojas para comparar instituciones por periodo, componentes y resultados globales sin confundir datos institucionales con datos individuales.

## Actores

Administrador: aprueba/rechaza funcionarios y supervisa cuentas. Funcionario: importa, consulta y analiza resultados, exporta y consulta IA. Usuario no autenticado: presenta solicitud de registro.

## Reglas de negocio

- Un usuario tiene un único rol: ADMIN o FUNCIONARIO.
- La solicitud pública crea FUNCIONARIO/PENDIENTE y nunca ADMIN.
- Solo aprobado/activo ingresa. La aprobación exige administrador autenticado.
- Cada institución se reconoce con código DANE válido; cada resultado se identifica por pareja institución+periodo.
- Los agregados municipales son distintos de las instituciones.
- N.D. se almacena como NULL, nunca 0.
- Los resultados agregados no permiten fabricar registros individuales ni recalcular la desviación real.

## RF06 · Inicio de sesión

**Actor:** funcionario aprobado o administrador. **Entradas:** CC y contraseña. **Precondiciones:** registro activo y aprobado. **Flujo:** enviar credenciales al endpoint; Django valida hash; inicia sesión; frontend carga datos del usuario. **Alternos:** credenciales erróneas -> 401; pendiente/inactivo -> rechazo. **Criterios de aceptación:** autenticación correcta, no exposición de contraseña, estado de sesión restaurable.

## RF11 · Registro pendiente

**Actor:** visitante. **Entradas:** identificación, nombres, apellidos, email, contraseña y confirmación. **Flujo:** validación de duplicados, fuerza de contraseña y persistencia en PENDIENTE como FUNCIONARIO. **Aceptación:** usuario no puede otorgarse rol administrativo ni iniciar sesión hasta aprobarse.

## RF01 · Importación ETL

**Actor:** funcionario aprobado. **Entradas:** XLS/XLSX de ocho hojas o CSV normalizado; máximo 10 MB. **Precondiciones:** sesión válida. **Flujo:** validar extensión, extraer y normalizar por DANE, relacionar periodo, conservar nulos, generar un historial de carga y persistir en transacción. **Alternos:** faltan hojas -> 400; hash duplicado -> 409. **Aceptación:** archivo válido produce registros consultables; repetición del mismo hash no crea duplicados; N.D. es NULL; agregados no son colegios. **Limitación:** pendientes pruebas de conformidad con plantilla ICFES real.

## RF03 · Dashboard

**Actor:** funcionario aprobado. **Entradas:** periodo. **Flujo:** consultar API, pintar tabla y gráfico por componente. **Aceptación parcial:** los valores vienen de PostgreSQL y visualización maneja valores faltantes. **Pendiente:** filtros extensivos, diez tipos de gráficas y accesibilidad integral.

## RF07–RF08 · Interpretación y chatbot

**Actor:** usuario aprobado. **Flujo:** API obtiene contexto limitado y verificado, llama a Ollama mediante servicio HTTP, devuelve respuesta y datos; si Ollama falla no bloquea consultas de resultados. **Criterios:** no se ejecuta SQL de IA, no se transfieren datos personales de estudiantes, se registra la consulta; la interpretación debe contrastarse antes de utilizarse para decisiones.

## RF04 · Informe PDF

**Actor:** usuario aprobado. **Salida:** PDF descargable con resumen y hasta 20 instituciones de un periodo. **Pendiente:** gráficas incrustadas y análisis comparativos completos.

## No funcionales prioritarios

RNF01: validar permisos en el servidor, defensa CSRF, cookies HttpOnly; RNF02: integridad referencial y transacciones; RNF07: índice DANE; RNF11: carga y hash ligados a cada resultado; RNF12: pruebas para escenarios negativos.
