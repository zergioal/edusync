import { SeccionAjustesInstitucionales } from '../../components/configuracion/SeccionAjustesInstitucionales'

export default function AjustesInstitucionalesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Ajustes institucionales</h1>
        <p className="text-sm text-fg-muted mt-0.5">Tipo de unidad educativa, carrera técnica y duración del período pedagógico.</p>
      </div>
      <SeccionAjustesInstitucionales />
    </div>
  )
}
