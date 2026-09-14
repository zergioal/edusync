import { SeccionTurnosHorarios } from '../../components/configuracion/SeccionTurnosHorarios'

export default function HorariosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-fg">Turnos y horarios por nivel</h1>
        <p className="text-sm text-fg-muted mt-0.5">Activa los turnos en uso y configura el horario de cada nivel educativo.</p>
      </div>
      <SeccionTurnosHorarios />
    </div>
  )
}
