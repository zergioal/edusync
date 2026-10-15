// Plantilla del mensaje de WhatsApp para convocar a un estudiante/tutor a una
// entrevista. Se guarda editada en localStorage (conveniencia por navegador,
// no es información que deba sincronizarse ni leerse desde el backend).

export const PLANTILLA_DEFAULT =
  'Buenos días les escribe {DOCENTE} ({MATERIA}) de la UE PIO XII, comunicar que su hijo/a {ESTUDIANTE} tiene muchas observaciones de indisciplina y rendimiento academico. Se le convoca a entrevista para el día {FECHA} a hrs. {HORA}.'

export interface VariablesPlantilla {
  docente:    string
  materia:    string
  estudiante: string
  fecha:      string
  hora:       string
}

export function renderPlantilla(tpl: string, v: VariablesPlantilla): string {
  return tpl
    .split('{DOCENTE}').join(v.docente)
    .split('{MATERIA}').join(v.materia)
    .split('{ESTUDIANTE}').join(v.estudiante)
    .split('{FECHA}').join(v.fecha)
    .split('{HORA}').join(v.hora)
}

/** Inverso de renderPlantilla: a partir del mensaje final (ya editado a mano) y
 *  los valores usados para generarlo, reconstruye una plantilla con tokens —
 *  así lo que el docente cambió en el TEXTO se conserva para el próximo envío,
 *  sin arrastrar el nombre/fecha de este estudiante en particular. */
export function extraerPlantilla(mensaje: string, v: VariablesPlantilla): string {
  let tpl = mensaje
  if (v.estudiante) tpl = tpl.split(v.estudiante).join('{ESTUDIANTE}')
  if (v.docente)    tpl = tpl.split(v.docente).join('{DOCENTE}')
  if (v.materia)    tpl = tpl.split(v.materia).join('{MATERIA}')
  if (v.fecha)      tpl = tpl.split(v.fecha).join('{FECHA}')
  if (v.hora)       tpl = tpl.split(v.hora).join('{HORA}')
  return tpl
}

const STORAGE_KEY = 'edusync.whatsapp.entrevista.v1'

export interface PlantillaGuardada {
  template: string
  materia:  string
}

export function cargarPlantillaGuardada(): PlantillaGuardada {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PlantillaGuardada
  } catch { /* localStorage no disponible — se usa el default */ }
  return { template: PLANTILLA_DEFAULT, materia: '' }
}

export function guardarPlantilla(data: PlantillaGuardada): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}
