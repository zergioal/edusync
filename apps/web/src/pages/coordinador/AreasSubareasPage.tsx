import { GestionAreasSubareasPage } from '../../components/materias/GestionAreasSubareasPage'

export default function AreasSubareasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Áreas y Subáreas</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Crea, edita o quita áreas y sus subáreas. Cada una tiene su propia planilla de calificaciones
          y asignaciones, y las subáreas se promedian automáticamente en la nota final del boletín.
        </p>
      </div>
      <GestionAreasSubareasPage />
    </div>
  )
}
