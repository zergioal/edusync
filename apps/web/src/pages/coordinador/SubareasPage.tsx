import { GestionSubareasPage } from '../../components/materias/GestionSubareasPage'

export default function SubareasPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Subáreas</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Crea, edita o quita subáreas de cualquier área. Cada subárea tiene su propia planilla de
          calificaciones y se promedia automáticamente en la nota final del boletín.
        </p>
      </div>
      <GestionSubareasPage />
    </div>
  )
}
