import { useState, useRef, useEffect, useCallback } from 'react'
import { api, ApiError } from '../../lib/api'
import { Modal } from '../../components/ui/Modal'
import { Button } from '@edusync/ui'
import { SelectNivel } from '../../components/select/SelectNivel'
import { SelectGrado } from '../../components/select/SelectGrado'
import { SelectParalelo } from '../../components/select/SelectParalelo'
import { SelectGestion } from '../../components/select/SelectGestion'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen:    boolean
  onClose:   () => void
  onSuccess: () => void
}

interface Credentials { email: string; password: string }

interface TutorMatch {
  id:       string
  nombre:   string
  apellido: string
  email:    string
}

const STEP_LABELS = ['Datos del estudiante', 'Tutor / Padre', 'Matrícula']

// ─── TutorField ───────────────────────────────────────────────────────────────

function TutorField({
  label, nombre, setNombre, tel, setTel, email, setEmail,
  existing, setExisting, required,
}: {
  label:       string
  nombre:      string
  setNombre:   (v: string) => void
  tel:         string
  setTel:      (v: string) => void
  email:       string
  setEmail:    (v: string) => void
  existing:    TutorMatch | null
  setExisting: (t: TutorMatch | null) => void
  required?:   boolean
}) {
  const [suggestions, setSuggestions] = useState<TutorMatch[]>([])
  const [open, setOpen]               = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef  = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSuggestions([]); setOpen(false); return }
    try {
      const data = await api.get<TutorMatch[]>(
        `/usuarios?rol=PADRE_TUTOR&buscar=${encodeURIComponent(q)}`
      )
      setSuggestions(data)
      setOpen(data.length > 0)
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleNombreChange = (v: string) => {
    setNombre(v)
    setExisting(null)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 300)
  }

  const select = (t: TutorMatch) => {
    setExisting(t)
    setNombre(`${t.apellido}, ${t.nombre}`)
    setEmail(t.email)
    setSuggestions([])
    setOpen(false)
  }

  const deselect = () => {
    setExisting(null)
    setNombre('')
    setEmail('')
    setTel('')
  }

  const inputCls = 'rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">{label}</h3>

      {/* Nombre con autocomplete */}
      <div className="flex flex-col gap-1" ref={wrapRef}>
        <label className="text-sm font-medium text-gray-700">
          Apellidos y Nombres {required ? '*' : ''}
          {!existing && (
            <span className="ml-1 text-xs font-normal text-gray-400">— escribe para buscar existentes</span>
          )}
        </label>

        {existing ? (
          // Card de tutor seleccionado
          <div className="flex items-center justify-between rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-blue-900">{existing.apellido}, {existing.nombre}</p>
              <p className="text-xs text-blue-600">{existing.email}</p>
            </div>
            <button
              type="button"
              onClick={deselect}
              className="ml-3 text-blue-400 hover:text-blue-700 transition-colors text-lg leading-none"
              title="Cambiar tutor"
            >
              ×
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              value={nombre}
              onChange={e => handleNombreChange(e.target.value)}
              required={required}
              placeholder="Apellidos, Nombres"
              className={inputCls}
              autoComplete="off"
            />
            {open && suggestions.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  Padres / tutores existentes
                </p>
                {suggestions.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => select(t)}
                    className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <p className="text-sm font-medium text-gray-900">{t.apellido}, {t.nombre}</p>
                    <p className="text-xs text-gray-400">{t.email}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Teléfono — siempre visible, pero readonly si existe */}
      {!existing && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Teléfono {required ? '*' : ''}</label>
          <input type="tel" value={tel} onChange={e => setTel(e.target.value)} required={required}
            placeholder="7XXXXXXX"
            className={`${inputCls} w-48`} />
        </div>
      )}

      {/* Email — oculto si ya está pre-llenado y es existente */}
      {!existing && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Correo electrónico</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="padre@ejemplo.com"
            className={inputCls} />
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NuevoEstudianteModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0)

  // Persist last enrollment selection so successive registrations start pre-filled
  const lastEnrollRef = useRef({ gestionId: '', nivelId: '', gradoId: '', paraleloId: '' })

  // Step 1 — student data
  const [apellidoPaterno, setApellidoPaterno] = useState('')
  const [apellidoMaterno, setApellidoMaterno] = useState('')
  const [nombre,          setNombre]          = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [email,           setEmail]           = useState('')
  const [becado,          setBecado]          = useState(false)
  const [motivoBeca,      setMotivoBeca]      = useState('')

  // Step 2 — tutor data
  const [tutor1Nombre,   setTutor1Nombre]   = useState('')
  const [tutor1Tel,      setTutor1Tel]      = useState('')
  const [tutor1Email,    setTutor1Email]    = useState('')
  const [tutor1Existing, setTutor1Existing] = useState<TutorMatch | null>(null)

  const [tutor2Nombre,   setTutor2Nombre]   = useState('')
  const [tutor2Tel,      setTutor2Tel]      = useState('')
  const [tutor2Email,    setTutor2Email]    = useState('')
  const [tutor2Existing, setTutor2Existing] = useState<TutorMatch | null>(null)

  const [crearCuentaTutor, setCrearCuentaTutor] = useState(false)

  // Step 3 — enrollment
  const [gestionId,  setGestionId]  = useState('')
  const [nivelId,    setNivelId]    = useState('')
  const [gradoId,    setGradoId]    = useState('')
  const [paraleloId, setParaleloId] = useState('')

  // Result
  const [saving,      setSaving]      = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [error,       setError]       = useState('')

  const reset = () => {
    setStep(0)
    setApellidoPaterno(''); setApellidoMaterno(''); setNombre('')
    setFechaNacimiento(''); setEmail(''); setBecado(false); setMotivoBeca('')
    setTutor1Nombre(''); setTutor1Tel(''); setTutor1Email(''); setTutor1Existing(null)
    setTutor2Nombre(''); setTutor2Tel(''); setTutor2Email(''); setTutor2Existing(null)
    setCrearCuentaTutor(false)
    // Restore last enrollment selection for quick successive registrations
    const e = lastEnrollRef.current
    setGestionId(e.gestionId); setNivelId(e.nivelId); setGradoId(e.gradoId); setParaleloId(e.paraleloId)
    setSaving(false); setCredentials(null); setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const apellido = `${apellidoPaterno.trim()} ${apellidoMaterno.trim()}`.trim()
  const canStep1 = nombre.trim() && apellidoPaterno.trim() && email.trim()
  const canStep2 = tutor1Existing !== null || (tutor1Nombre.trim() !== '' && tutor1Tel.trim() !== '')
  const canStep3 = gestionId && paraleloId

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const result = await api.post<{ estudiante: unknown; credentials: Credentials }>('/estudiantes', {
        nombre,
        apellido,
        email,
        becado,
        fecha_nacimiento:    fechaNacimiento || undefined,
        motivo_beca:         becado ? motivoBeca || undefined : undefined,
        paralelo_id:         paraleloId,
        gestion_id:          gestionId,
        tutor1_existing_id:  tutor1Existing?.id,
        nombre_tutor1:       tutor1Existing ? `${tutor1Existing.apellido}, ${tutor1Existing.nombre}` : tutor1Nombre,
        telefono_tutor1:     tutor1Tel,
        email_tutor1:        tutor1Existing?.email ?? tutor1Email,
        nombre_tutor2:       tutor2Existing ? `${tutor2Existing.apellido}, ${tutor2Existing.nombre}` : tutor2Nombre || undefined,
        telefono_tutor2:     tutor2Tel  || undefined,
        email_tutor2:        (tutor2Existing?.email ?? tutor2Email) || undefined,
        crear_cuenta_tutor:  tutor1Existing ? false : crearCuentaTutor,
      })
      lastEnrollRef.current = { gestionId, nivelId, gradoId, paraleloId }
      setCredentials(result.credentials)
      setStep(3)
      onSuccess()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al registrar el estudiante')
    } finally {
      setSaving(false)
    }
  }

  const copyCredentials = () => {
    if (!credentials) return
    navigator.clipboard.writeText(`Email: ${credentials.email}\nContraseña: ${credentials.password}`)
      .then(() => alert('Credenciales copiadas al portapapeles'))
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar nuevo estudiante"
      footer={
        credentials ? (
          <div className="flex justify-end">
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <div className="flex justify-between">
            <Button variant="ghost" onClick={step === 0 ? handleClose : () => setStep(s => s - 1)} disabled={saving}>
              {step === 0 ? 'Cancelar' : '← Atrás'}
            </Button>
            <div className="flex gap-3">
              {step < 2 && (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={step === 0 ? !canStep1 : step === 1 ? !canStep2 : false}
                >
                  Siguiente →
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handleSubmit} loading={saving} disabled={!canStep3}>
                  Registrar estudiante
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {/* Stepper */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${i === step ? 'font-semibold text-gray-800' : 'text-gray-400'}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <div className="flex-1 h-px bg-gray-200" />}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1 — Student data */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Apellido Paterno *</label>
              <input type="text" value={apellidoPaterno} onChange={e => setApellidoPaterno(e.target.value)} required
                placeholder="Ej: García"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Apellido Materno</label>
              <input type="text" value={apellidoMaterno} onChange={e => setApellidoMaterno(e.target.value)}
                placeholder="Ej: Mamani"
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Nombres *</label>
            <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
              placeholder="Ej: Pedro Juan"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Fecha de nacimiento</label>
            <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Correo institucional *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              placeholder="estudiante@uepio12.edu.bo"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={becado} onChange={e => setBecado(e.target.checked)}
                className="rounded border-gray-300 text-amber-500 focus:ring-amber-500 h-4 w-4" />
              <span className="text-sm font-medium text-gray-700">
                Estudiante becado{' '}
                <span className="text-xs font-normal text-gray-400">(exento del pago de pensiones)</span>
              </span>
            </label>
            {becado && (
              <div className="flex flex-col gap-1 pl-6">
                <label className="text-sm font-medium text-gray-700">Motivo de la beca</label>
                <input type="text" value={motivoBeca} onChange={e => setMotivoBeca(e.target.value)}
                  placeholder="Ej: Beca por rendimiento académico"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — Tutor data */}
      {step === 1 && (
        <div className="space-y-5">
          <TutorField
            label="Tutor / Padre 1 (obligatorio)"
            nombre={tutor1Nombre}      setNombre={setTutor1Nombre}
            tel={tutor1Tel}            setTel={setTutor1Tel}
            email={tutor1Email}        setEmail={setTutor1Email}
            existing={tutor1Existing}  setExisting={setTutor1Existing}
            required
          />

          {/* Crear cuenta — solo si no hay tutor existente */}
          {!tutor1Existing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={crearCuentaTutor} onChange={e => setCrearCuentaTutor(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-gray-700">Crear cuenta de acceso para el tutor 1</span>
            </label>
          )}

          <div className="border-t border-gray-100 pt-4">
            <TutorField
              label="Tutor / Padre 2 (opcional)"
              nombre={tutor2Nombre}      setNombre={setTutor2Nombre}
              tel={tutor2Tel}            setTel={setTutor2Tel}
              email={tutor2Email}        setEmail={setTutor2Email}
              existing={tutor2Existing}  setExisting={setTutor2Existing}
            />
          </div>
        </div>
      )}

      {/* Step 3 — Enrollment */}
      {step === 2 && (
        <div className="space-y-4">
          <SelectGestion value={gestionId} onChange={setGestionId} required />
          <SelectNivel
            value={nivelId}
            onChange={id => { setNivelId(id); setGradoId(''); setParaleloId('') }}
            required
          />
          <SelectGrado
            value={gradoId}
            onChange={id => { setGradoId(id); setParaleloId('') }}
            nivelId={nivelId}
            required
            disabled={!nivelId}
          />
          <SelectParalelo
            value={paraleloId}
            onChange={setParaleloId}
            gradoId={gradoId}
            required
            disabled={!gradoId}
            label="Paralelo"
          />
          {nombre && apellido && gestionId && paraleloId && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 space-y-1">
              <p className="font-semibold">Resumen:</p>
              <p>Estudiante: <strong>{apellidoPaterno} {apellidoMaterno}, {nombre}</strong></p>
              <p>Email: <strong>{email}</strong></p>
              <p>
                Tutor:{' '}
                <strong>
                  {tutor1Existing
                    ? `${tutor1Existing.apellido}, ${tutor1Existing.nombre} (existente)`
                    : tutor1Nombre}
                </strong>
                {tutor1Email && !tutor1Existing && ` (${tutor1Email})`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Success / Credentials */}
      {step === 3 && credentials && (
        <div className="space-y-4 text-center py-4">
          <div className="text-5xl">🎉</div>
          <h3 className="text-lg font-bold text-gray-900">Estudiante registrado exitosamente</h3>
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-green-800">Credenciales generadas:</p>
            <div className="bg-white rounded-lg px-4 py-3 font-mono text-sm space-y-1 border border-green-100">
              <p><span className="text-gray-500">Email:</span> {credentials.email}</p>
              <p><span className="text-gray-500">Contraseña:</span> {credentials.password}</p>
            </div>
            <p className="text-xs text-green-700">El estudiante deberá cambiar su contraseña en el primer inicio de sesión.</p>
          </div>
          <Button variant="secondary" onClick={copyCredentials}>Copiar credenciales</Button>
        </div>
      )}
    </Modal>
  )
}
