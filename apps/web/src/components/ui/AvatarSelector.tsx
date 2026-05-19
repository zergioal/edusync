import { useState, useEffect } from 'react'

export const AVATARS = [
  { id: 'graduation', emoji: '🎓', bg: 'bg-indigo-500',  label: 'Graduado'   },
  { id: 'books',      emoji: '📚', bg: 'bg-blue-500',    label: 'Lector'     },
  { id: 'scientist',  emoji: '🔬', bg: 'bg-purple-500',  label: 'Científico' },
  { id: 'palette',    emoji: '🎨', bg: 'bg-pink-500',    label: 'Artista'    },
  { id: 'sports',     emoji: '⚽', bg: 'bg-green-500',   label: 'Deportista' },
  { id: 'music',      emoji: '🎵', bg: 'bg-yellow-600',  label: 'Músico'     },
  { id: 'tech',       emoji: '💻', bg: 'bg-cyan-600',    label: 'Tecnología' },
  { id: 'globe',      emoji: '🌍', bg: 'bg-teal-500',    label: 'Geógrafo'   },
  { id: 'pencil',     emoji: '✏️', bg: 'bg-orange-500',  label: 'Escritor'   },
  { id: 'math',       emoji: '📐', bg: 'bg-red-500',     label: 'Matemático' },
  { id: 'trophy',     emoji: '🏆', bg: 'bg-amber-500',   label: 'Campeón'    },
  { id: 'owl',        emoji: '🦉', bg: 'bg-slate-600',   label: 'Sabio'      },
] as const

type AvatarId = typeof AVATARS[number]['id']

function storageKey(userId: string) { return `edu_avatar_${userId}` }

function resolveAvatar(userId: string) {
  const stored = localStorage.getItem(storageKey(userId)) as AvatarId | null
  return AVATARS.find(a => a.id === stored) ?? AVATARS[0]!
}

// ─── Display ──────────────────────────────────────────────────────────────────

interface DisplayProps {
  userId: string
  avatarId?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function AvatarDisplay({ userId, avatarId, size = 'lg' }: DisplayProps) {
  const av = avatarId
    ? (AVATARS.find(a => a.id === avatarId) ?? resolveAvatar(userId))
    : resolveAvatar(userId)

  const sz = {
    sm: 'h-10 w-10 text-xl rounded-xl',
    md: 'h-14 w-14 text-2xl rounded-xl',
    lg: 'h-20 w-20 text-4xl rounded-2xl',
    xl: 'h-24 w-24 text-5xl rounded-2xl',
  }[size]

  return (
    <div className={`${sz} ${av.bg} flex items-center justify-center shadow-md flex-shrink-0`}>
      <span role="img" aria-label={av.label}>{av.emoji}</span>
    </div>
  )
}

// ─── Picker modal ─────────────────────────────────────────────────────────────

interface PickerProps {
  userId: string
  onClose: () => void
  onSaved: (id: string) => void
}

export function AvatarPickerModal({ userId, onClose, onSaved }: PickerProps) {
  const [selected, setSelected] = useState<AvatarId>(() => resolveAvatar(userId).id)

  function save() {
    localStorage.setItem(storageKey(userId), selected)
    onSaved(selected)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Elige tu avatar</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {AVATARS.map(a => (
            <button
              key={a.id}
              onClick={() => setSelected(a.id)}
              title={a.label}
              className={`rounded-xl p-1.5 flex flex-col items-center gap-1 transition-all ${
                selected === a.id
                  ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105 bg-indigo-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className={`h-11 w-11 ${a.bg} rounded-xl flex items-center justify-center text-xl shadow-sm`}>
                <span role="img" aria-label={a.label}>{a.emoji}</span>
              </div>
              <span className="text-[9px] text-gray-500 leading-tight text-center">{a.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 rounded-lg">
            Cancelar
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Hook convenience ─────────────────────────────────────────────────────────

export function useAvatar(userId: string) {
  const [avatarId, setAvatarId] = useState<string>(() => resolveAvatar(userId).id)
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => {
    setAvatarId(resolveAvatar(userId).id)
  }, [userId])

  return {
    avatarId,
    showPicker,
    openPicker:  () => setShowPicker(true),
    closePicker: () => setShowPicker(false),
    onSaved:     (id: string) => setAvatarId(id),
  }
}
