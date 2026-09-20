import { AjustesNotaPage as Compartida } from '../../components/planilla/AjustesNotaPage'

export default function AjustesNotaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Ajustes de nota</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Suma un valor oculto al total de una materia, por estudiante y trimestre — el docente no lo ve.
        </p>
      </div>
      <Compartida />
    </div>
  )
}
