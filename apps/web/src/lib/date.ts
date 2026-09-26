/**
 * "YYYY-MM-DD" de hoy en la zona horaria LOCAL del navegador.
 *
 * Nunca usar `new Date().toISOString().slice(0, 10)` para esto: `toISOString()` siempre da la
 * fecha en UTC, y en una zona horaria negativa (Bolivia, UTC-4) eso hace que a partir de las 20:00
 * hora local ya "sea" el día siguiente en UTC — el registro de asistencia terminaba guardándose
 * con la fecha de mañana en vez de la de hoy.
 */
export function hoyLocalStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Convierte un string de fecha sin hora ("YYYY-MM-DD") a un `Date` que representa ese mismo día
 * calendario en hora LOCAL — a diferencia de `new Date("YYYY-MM-DD")`, que el motor JS interpreta
 * siempre como medianoche UTC y que por lo tanto puede mostrar el día anterior o siguiente según
 * la zona horaria del navegador (p. ej. el nombre del día de la semana desfasado).
 */
export function parseFechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}
