import { NotaExtracurricularPage as Compartida } from '../../components/planilla/NotaExtracurricularPage'

export default function NotaExtracurricularPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Nota Extracurricular</h1>
        <p className="text-sm text-fg-muted mt-0.5">
          Suma una nota al total de una materia, por estudiante y trimestre. Se ve en el registro del
          docente, pero solo tú puedes cargarla o editarla.
        </p>
      </div>
      <Compartida />
    </div>
  )
}
