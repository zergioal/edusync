import { useState, useEffect, useMemo } from 'react'
import { Icon } from './Icon'
import { Button } from '@edusync/ui'
import { esCelularBoliviano, limpiarNumero } from '../../lib/telefono'
import { useAuth } from '../../context/AuthContext'
import {
  renderPlantilla, extraerPlantilla,
  cargarPlantillaGuardada, guardarPlantilla,
  type VariablesPlantilla,
} from '../../lib/plantillaWhatsApp'

function formatFechaEntrevista(fechaISO: string): string {
  const [y, m, d] = fechaISO.split('-').map(Number)
  const date = new Date(y!, m! - 1, d!) // fecha local — evita el corrimiento de interpretar "yyyy-mm-dd" como UTC
  const dia  = date.toLocaleDateString('es-BO', { weekday: 'long' })
  return `${dia} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

interface Props {
  numero:           string | null | undefined
  estudianteNombre: string
}

/** Como WhatsAppButton, pero para docentes: antes de ir a WhatsApp, abre un modal
 *  para fijar materia/fecha/hora de la entrevista y editar el mensaje. Lo que se
 *  edite queda como plantilla para los próximos envíos (ver plantillaWhatsApp.ts). */
export function WhatsAppEntrevistaButton({ numero, estudianteNombre }: Props) {
  const { user } = useAuth()
  const habilitado = esCelularBoliviano(numero)
  const [open, setOpen] = useState(false)

  if (!habilitado) {
    return (
      <span
        title="No disponible — número fijo o sin registrar"
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-fg-muted opacity-50"
      >
        <Icon name="whatsapp" className="h-3.5 w-3.5" /> WhatsApp
      </span>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-green-700"
      >
        <Icon name="whatsapp" className="h-3.5 w-3.5" /> WhatsApp
      </button>
      {open && (
        <EntrevistaModal
          numero={numero!}
          estudianteNombre={estudianteNombre}
          docenteNombre={user ? `Prof. ${user.nombre} ${user.apellido}` : 'Prof.'}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function EntrevistaModal({
  numero, estudianteNombre, docenteNombre, onClose,
}: {
  numero:            string
  estudianteNombre:  string
  docenteNombre:     string
  onClose:           () => void
}) {
  const guardada = useMemo(() => cargarPlantillaGuardada(), [])
  const [materia, setMateria] = useState(guardada.materia)
  const [fecha,   setFecha]   = useState('')
  const [hora,    setHora]    = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tocado,  setTocado]  = useState(false)

  const vars: VariablesPlantilla = useMemo(() => ({
    docente:    docenteNombre,
    materia,
    estudiante: estudianteNombre,
    fecha:      fecha ? formatFechaEntrevista(fecha) : '',
    hora,
  }), [docenteNombre, materia, estudianteNombre, fecha, hora])

  // Mientras el docente no haya tocado el mensaje a mano, se regenera con cada
  // cambio de materia/fecha/hora — en cuanto edita el texto directamente, deja
  // de pisarse automáticamente (solo "Restablecer" lo vuelve a sincronizar).
  useEffect(() => {
    if (tocado) return
    setMensaje(renderPlantilla(guardada.template, vars))
  }, [vars, tocado, guardada.template])

  const faltaCompletar = !materia.trim() || !fecha || !hora

  const handleEnviar = () => {
    guardarPlantilla({ template: extraerPlantilla(mensaje, vars), materia })
    const href = `https://wa.me/591${limpiarNumero(numero)}?text=${encodeURIComponent(mensaje)}`
    window.open(href, '_blank', 'noopener,noreferrer')
    onClose()
  }

  const inputClass = 'rounded-lg border border-border px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-fg">Convocar a entrevista por WhatsApp</h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Materia</span>
            <input value={materia} onChange={e => setMateria(e.target.value)}
              placeholder="Ej: Matemáticas" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Fecha de la entrevista</span>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Hora</span>
            <input type="time" value={hora} onChange={e => setHora(e.target.value)} className={inputClass} />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-fg-muted uppercase tracking-wide">Mensaje</span>
          <textarea
            value={mensaje}
            onChange={e => { setMensaje(e.target.value); setTocado(true) }}
            rows={6}
            className={inputClass}
          />
        </label>
        {tocado && (
          <button type="button" onClick={() => setTocado(false)}
            className="text-xs font-semibold text-brand hover:text-brand-hover">
            Restablecer mensaje según la plantilla
          </button>
        )}
        <p className="text-xs text-fg-muted">El mensaje que envíes se recuerda como plantilla para los próximos envíos.</p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleEnviar} disabled={faltaCompletar}>Enviar por WhatsApp</Button>
        </div>
      </div>
    </div>
  )
}
