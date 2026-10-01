import { useMisCursos } from '../../hooks/useMisCursos'
import { abbreviateGrado } from '../../lib/cursoDisplay'

interface Props {
  value:    string
  onChange: (id: string) => void
  label?:   string
}

/** Selector de curso acotado a los propios del docente (dicta materia o es asesor). */
export function SelectMiCurso({ value, onChange, label = 'Curso' }: Props) {
  const { cursos, loading } = useMisCursos()

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-fg">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={loading}
        className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand disabled:bg-bg disabled:text-fg-muted"
      >
        <option value="">{loading ? 'Cargando…' : '— Seleccionar curso —'}</option>
        {cursos.map(c => (
          <option key={c.id} value={c.id}>
            {abbreviateGrado(c.grado.nombre, c.letra)} · {c.grado.nivel.nombre}
          </option>
        ))}
      </select>
    </div>
  )
}
