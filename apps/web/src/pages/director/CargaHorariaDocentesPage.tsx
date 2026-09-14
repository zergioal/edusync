import { SeccionCargaHoraria } from '../../components/configuracion/SeccionCargaHoraria'

export default function CargaHorariaDocentesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Carga horaria por materia y grado</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Horas pedagógicas mensuales para cada materia según el grado. Los cambios afectan
          las asignaciones futuras.
        </p>
      </div>
      <SeccionCargaHoraria />
    </div>
  )
}
