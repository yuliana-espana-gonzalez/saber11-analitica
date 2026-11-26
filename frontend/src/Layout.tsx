import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { LogOut } from 'lucide-react';

// =========================================================
// LOGO INSTITUCIONAL
// Archivo real: frontend/public/logo_popayan.jpg
// =========================================================

export function PopayanLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/logo_popayan.jpg"
      alt="Escudo de la Alcaldía de Popayán"
      className={`object-contain ${className}`}
    />
  );
}

// =========================================================
// BARRA SUPERIOR GOV.CO
// =========================================================

function GovTopBar() {
  return (
    <div className="gov-topbar">
      <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-between px-4 text-xs md:px-6">
        <span className="text-sm font-bold tracking-wide">GOV.CO</span>
        <span className="hidden opacity-90 sm:inline">
          Gobierno de Colombia · Alcaldía de Popayán
        </span>
      </div>
    </div>
  );
}

// =========================================================
// ENCABEZADO INSTITUCIONAL CON LOGO
// =========================================================

function BrandHeader({ preferences }: { preferences?: ReactNode }) {
  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl bg-white p-1 shadow-sm">
            <PopayanLogo className="h-11 w-auto" />
          </div>
          <div className="hidden h-10 w-px bg-[var(--line)] sm:block" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Alcaldía de Popayán
            </p>
            <p className="truncate text-lg font-bold leading-tight text-[var(--ink)]">
              Secretaría de Educación
            </p>
          </div>
        </div>

        {preferences && (
          <div className="flex items-center gap-2">{preferences}</div>
        )}
      </div>
    </header>
  );
}

// =========================================================
// LAYOUT AUTENTICADO
// =========================================================

export type MenuItem = {
  id: string;
  label: string;
  Icon: LucideIcon;
};

type AppShellProps = {
  user: { nombre: string; apellido: string; rol: string };
  menu: MenuItem[];
  currentPage: string;
  onNavigate: (id: string) => void;
  onLogout: () => void;
  title: string;
  subtitle?: string;
  preferences?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export function AppShell({
  user,
  menu,
  currentPage,
  onNavigate,
  onLogout,
  title,
  subtitle,
  preferences,
  footer,
  children
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <GovTopBar />
      <BrandHeader preferences={preferences} />

      <div className="mx-auto max-w-[1440px] md:flex">
        <aside className="sidebar p-4 md:w-64 md:shrink-0 md:p-5">
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Menú principal
          </p>

          <nav className="flex gap-2 overflow-x-auto pb-2 md:grid md:overflow-visible md:pb-0">
            {menu.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                className={
                  'nav-item ' +
                  (currentPage === id ? 'active' : '')
                }
                aria-current={currentPage === id ? 'page' : undefined}
              >
                <Icon size={19} />
                {label}
              </button>
            ))}
          </nav>

          <div className="mt-6 space-y-3 border-t border-[var(--line)] pt-4">
            <p className="px-2 text-sm text-[var(--muted)]">
              <span className="block font-semibold text-[var(--ink)]">
                {user.nombre} {user.apellido}
              </span>
              {user.rol === 'ADMIN' ? 'Administrador' : 'Funcionario'}
            </p>

            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-soft)]"
            >
              <LogOut size={17} />
              Cerrar sesión
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 p-4 md:p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[var(--ink)] md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--muted)]">
                {subtitle}
              </p>
            )}
          </div>

          {children}

          {footer && (
            <footer className="mt-8 text-xs text-[var(--muted)]">
              {footer}
            </footer>
          )}
        </main>
      </div>
    </div>
  );
}

// =========================================================
// LAYOUT DE AUTENTICACIÓN (LOGIN / REGISTRO)
// =========================================================

export function AuthShell({
  preferences,
  children
}: {
  preferences?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg)]">
      <GovTopBar />

      <div className="relative flex flex-1 items-center justify-center p-4">
        {preferences && (
          <div className="absolute right-4 top-4 flex items-center gap-2">
            {preferences}
          </div>
        )}

        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-4 flex flex-col items-center text-center">
              <div className="mb-3 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                <PopayanLogo className="h-16 w-auto" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Alcaldía de Popayán
              </p>
              <h1 className="text-lg font-bold text-[var(--ink)]">
                Secretaría de Educación
              </h1>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
