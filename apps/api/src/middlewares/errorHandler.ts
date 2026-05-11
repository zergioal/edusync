import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@edusync/database'
import { ZodError } from 'zod'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

const isDev = process.env['NODE_ENV'] !== 'production'

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {

  // Errores de aplicación conocidos
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error:   true,
      code:    err.code ?? 'APP_ERROR',
      message: err.message,
    })
    return
  }

  // Zod — validación
  if (err instanceof ZodError) {
    res.status(400).json({
      error:   true,
      code:    'VALIDATION_ERROR',
      message: 'Datos inválidos',
      details: err.flatten().fieldErrors,
    })
    return
  }

  // Prisma — constraint único
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    const fields = (err.meta?.['target'] as string[] | undefined)?.join(', ') ?? 'campo'
    res.status(409).json({
      error:   true,
      code:    'DUPLICATE_ENTRY',
      message: `Ya existe un registro con ese ${fields}`,
    })
    return
  }

  // Prisma — registro no encontrado
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
    res.status(404).json({
      error:   true,
      code:    'NOT_FOUND',
      message: 'Registro no encontrado',
    })
    return
  }

  // Prisma — foreign key violation
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
    res.status(400).json({
      error:   true,
      code:    'FOREIGN_KEY_ERROR',
      message: 'Referencia a un registro que no existe',
    })
    return
  }

  // JWT inválido
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      error:   true,
      code:    'UNAUTHORIZED',
      message: 'Token inválido o expirado',
    })
    return
  }

  // Error genérico
  console.error('[errorHandler]', err)
  res.status(500).json({
    error:   true,
    code:    'INTERNAL_ERROR',
    message: 'Error interno del servidor',
    ...(isDev ? { details: err.message, stack: err.stack } : {}),
  })
}
