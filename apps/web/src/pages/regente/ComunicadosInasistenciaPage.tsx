import { useState, useEffect, useRef } from 'react'
import { api } from '../../lib/api'
import { useGestionActiva } from '../../hooks/useGestionActiva'
import { useToast } from '../../components/ui/Toast'
import { Spinner, Badge } from '@edusync/ui'

interface Paralelo { id: string; nombre: string; nivel: string }

interface EstudianteAlerta {
  estudiante_id:   string
  nombre:          string
  apellido:        string
  ausentes:        number
  total:           number
  porcentaje_asistencia: number | null
  motivo: 'CONSECUTIVAS' | 'MENSUALES'
}

export default function ComunicadosInasistenciaPage() {
  const toast    = useToast()
  const toastRef = useRef(toast)
  toastRef.current = toast
  const { trimestreActual } = useGestionActiva()

  const [paralelos,  setParalelos]  = useState<Paralelo[]>([])
  const [paraleloId, setParaleloId] = useState('')
  const [alertas,    setAlertas]    = useState<EstudianteAlerta[]>([])
  const [loading,    setLoading]    = useState(false)
  const [whatsapp,   setWhatsapp]   = useState('')

  useEffect(() => {
    api.get<Paralelo[]>('/asistencia/paralelos-regente')
      .then(setParalelos)
      .catch(() => toastRef.current.error('Error al cargar paralelos'))

    api.get<{ whatsapp?: string }>('/public/info')
      .then(info => { if (info.whatsapp) setWhatsapp(info.whatsapp) })
      .catch(() => {})
  }, [])

  async function buscar() {
    if (!paraleloId || !trimestreActual) return
    setLoading(true)
    try {
      const data = await api.get<Array<{
        estudiante_id: string; nombre: string; apellido: string
        presentes: number; ausentes: number; tardanzas: number; total: number
        porcentaje_asistencia: number | null; dias: Array<{ fecha: string; estado: string }>
      }>>(
        `/asistencia/diaria/reporte?paralelo_id=${paraleloId}&fecha_inicio=${trimestreActual.fecha_inicio.slice(0,10)}&fecha_fin=${trimestreActual.fecha_fin.slice(0,10)}`,
      )

      const resultado: EstudianteAlerta[] = []

      for (const est of data) {
        const diasOrdenados = est.dias.sort((a, b) => a.fecha.localeCompare(b.fecha))

        // Detectar más de 3 ausencias consecutivas
        let consecutivas = 0; let maxConsec = 0
        for (const d of diasOrdenados) {
          if (d.estado === 'AUSENTE') { consecutivas++; maxConsec = Math.max(maxConsec, consecutivas) }
          else consecutivas = 0

        }

        // Contar ausencias totales en el mes actual
        const mesActual = new Date().getMonth()
        const ausentesMes = diasOrdenados.filter(d => {
          const m = new Date(d.fecha).getMonth()
          return m === mesActual && d.estado === 'AUSENTE'
        }).length

        if (maxConsec > 3) {
          resultado.push({ ...est, motivo: 'CONSECUTIVAS' })
        } else if (ausentesMes > 5) {
          resultado.push({ ...est, motivo: 'MENSUALES' })
        }
      }

      setAlertas(resultado)
    } catch {
      toastRef.current.error('Error al buscar alertas')
    } finally {
      setLoading(false)
    }
  }

  function mensajeWhatsApp(est: EstudianteAlerta): string {
    const texto = encodeURIComponent(
      `Estimado padre/tutor de ${est.nombre} ${est.apellido}: ` +
      `Su hijo/a ha tenido ${est.ausentes} ausencia(s) ${est.motivo === 'CONSECUTIVAS' ? 'consecutivas' : 'en el mes actual'}. ` +
      `Por favor comuníquese con la institución. Gracias.`,
    )
    return whatsapp
      ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${texto}`
      : `https://wa.me/?text=${texto}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Comunicados por Inasistencia</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Estudiantes con &gt;3 ausencias consecutivas o &gt;5 ausencias en el mes
        </p>
      </div>

      {/* Selector */}
      <div className="flex items-end gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paralelo</label>
          <select
            value={paraleloId}
            onChange={e => setParaleloId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— Seleccionar —</option>
            {paralelos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.nivel})</option>)}
          </select>
        </div>
        <button
          onClick={buscar}
          disabled={!paraleloId || !trimestreActual}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Buscar alertas
        </button>
      </div>

      {/* Resultados */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : alertas.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">
            {paraleloId ? 'Sin alertas de inasistencia para este paralelo' : 'Selecciona un paralelo para buscar alertas'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 text-left">Estudiante</th>
                <th className="px-5 py-3 text-center">Ausencias</th>
                <th className="px-5 py-3 text-center">% Asistencia</th>
                <th className="px-5 py-3 text-center">Motivo</th>
                <th className="px-5 py-3 text-right">Contactar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alertas.map(est => (
                <tr key={est.estudiante_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{est.apellido}, {est.nombre}</td>
                  <td className="px-5 py-3 text-center text-red-600 font-semibold">{est.ausentes}</td>
                  <td className="px-5 py-3 text-center">
                    {est.porcentaje_asistencia !== null
                      ? <Badge variant="danger">{est.porcentaje_asistencia}%</Badge>
                      : <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={est.motivo === 'CONSECUTIVAS' ? 'danger' : 'warning'}>
                      {est.motivo === 'CONSECUTIVAS' ? 'Consecutivas' : 'Mensuales'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <a
                      href={mensajeWhatsApp(est)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600"
                    >
                      WhatsApp
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
