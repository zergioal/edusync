import { SeccionAjustesInstitucionales } from '../../components/configuracion/SeccionAjustesInstitucionales'
import { SeccionTurnosHorarios } from '../../components/configuracion/SeccionTurnosHorarios'
import { SeccionCargaHoraria } from '../../components/configuracion/SeccionCargaHoraria'

export default function ConfiguracionPage() {
  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-fg">Configuración</h1>
        <p className="text-sm text-fg-muted mt-0.5">Ajustes institucionales, horarios y carga académica</p>
      </div>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-fg mb-4">Ajustes institucionales</h2>
        <SeccionAjustesInstitucionales />
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-fg mb-1">Turnos y horarios por nivel</h2>
        <div className="mt-3">
          <SeccionTurnosHorarios />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-fg">Carga horaria por materia y grado</h2>
        <p className="text-sm text-fg-muted mt-0.5 mb-4">
          Horas pedagógicas mensuales para cada materia según el grado. Los cambios afectan
          las asignaciones futuras.
        </p>
        <SeccionCargaHoraria />
      </section>
    </div>
  )
}
