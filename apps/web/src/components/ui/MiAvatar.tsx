import { useAuth } from '../../context/AuthContext'
import { Icon } from './Icon'

interface Props {
  /** Si se pasa, aparece el botón de editar (lápiz) superpuesto. */
  onEditar?: () => void
}

/** Avatar circular del usuario actual: su foto real si la subió, o sus iniciales.
 *  Para los paneles (Admin, Coordinador, Secretaría, Regente, Contador) que solo
 *  tienen un encabezado de bienvenida, sin la "profile card" grande de Docente/Director. */
export function MiAvatar({ onEditar }: Props) {
  const { user } = useAuth()

  return (
    <div className="relative flex-shrink-0">
      {user?.foto_url ? (
        <img src={user.foto_url} alt="" className="h-14 w-14 rounded-xl object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-bold text-white">
          {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
        </div>
      )}
      {onEditar && (
        <button
          type="button"
          onClick={onEditar}
          title="Cambiar foto"
          className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow hover:bg-indigo-700 transition-colors"
        >
          <Icon name="pencil" className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}
