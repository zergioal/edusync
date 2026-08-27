import logo from '../../assets/logo-pio-xii.png'

/** Overlay de transición al cerrar sesión — se muestra brevemente antes de redirigir al login. */
export function LogoutOverlay() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#0f172a] via-[#1e2547] to-[#0f172a] animate-[logout-fade_0.25s_ease-out]">
      <div className="relative flex items-center justify-center">
        <span className="absolute h-20 w-20 rounded-full border-2 border-indigo-400/40 animate-ping" />
        <img
          src={logo}
          alt="EduSync"
          className="relative h-16 w-16 rounded-2xl object-contain shadow-lg animate-[logout-pop_0.4s_ease-out]"
        />
      </div>
      <p className="text-sm font-medium text-slate-300 tracking-wide animate-[logout-fade_0.4s_ease-out]">
        Cerrando sesión…
      </p>
    </div>
  )
}
