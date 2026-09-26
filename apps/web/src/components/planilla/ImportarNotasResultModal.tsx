import { Button } from '@edusync/ui'

export interface ImportarNotasResult {
  ok:           boolean
  actualizadas: number
  advertencias: string[]
  errores:      string[]
}

interface Props {
  result:  ImportarNotasResult
  onClose: () => void
}

export function ImportarNotasResultModal({ result, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-fg">
          {result.ok ? 'Notas importadas' : 'No se importó nada'}
        </h2>

        {result.ok ? (
          <p className="text-sm text-fg">
            Se actualizaron <strong>{result.actualizadas}</strong> nota{result.actualizadas !== 1 ? 's' : ''}.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-fg-muted">
              Se encontraron {result.errores.length} error{result.errores.length !== 1 ? 'es' : ''} — corrígelos en el archivo y vuelve a subirlo. No se guardó ningún cambio.
            </p>
            <ul className="space-y-1 rounded-lg bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-400 max-h-52 overflow-y-auto">
              {result.errores.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}

        {result.advertencias.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {result.ok ? 'Filas u columnas que se ignoraron:' : 'Además, se hubieran ignorado (revisa también si corresponde):'}
            </p>
            <ul className="space-y-1 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-700 dark:text-amber-400 max-h-40 overflow-y-auto">
              {result.advertencias.map((a, i) => <li key={i}>• {a}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Cerrar</Button>
        </div>
      </div>
    </div>
  )
}
