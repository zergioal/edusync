import rateLimit from 'express-rate-limit'

/** Login/refresh — el punto de entrada más sensible a fuerza bruta: 6 intentos por IP
 *  cada 15 min. skipSuccessfulRequests: un login correcto no consume el cupo — solo
 *  cuentan los fallidos, que es lo que AuthController usa para avisar "te quedan N". */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:    6,
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,
  message: { error: true, code: 'TOO_MANY_ATTEMPTS', message: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
})

/** Resto de la API — freno general contra abuso/DoS básico, generoso para no afectar el uso normal. */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit:    600,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: true, code: 'TOO_MANY_REQUESTS', message: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
})
