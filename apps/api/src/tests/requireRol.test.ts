import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { requireRol } from '../middlewares/requireRol'
import { Rol } from '@edusync/types'

function fakeReq(rol?: Rol): Request {
  return { auth: rol ? { rol } : undefined } as unknown as Request
}

function fakeRes(): Response {
  const res: Partial<Response> = {}
  res.status = vi.fn().mockReturnValue(res)
  res.json   = vi.fn().mockReturnValue(res)
  return res as Response
}

describe('requireRol', () => {
  it('deja pasar cuando el rol está en la lista permitida', () => {
    const mw   = requireRol(Rol.ADMIN_SISTEMA, Rol.CONTADOR)
    const req  = fakeReq(Rol.CONTADOR)
    const res  = fakeRes()
    const next = vi.fn() as NextFunction
    mw(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('devuelve 403 cuando un DOCENTE llama una ruta de solo CONTADOR/ADMIN', () => {
    const mw   = requireRol(Rol.ADMIN_SISTEMA, Rol.CONTADOR)
    const req  = fakeReq(Rol.DOCENTE)
    const res  = fakeRes()
    const next = vi.fn() as NextFunction
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('devuelve 403 cuando no hay sesión (req.auth ausente)', () => {
    const mw   = requireRol(Rol.ADMIN_SISTEMA)
    const req  = fakeReq(undefined)
    const res  = fakeRes()
    const next = vi.fn() as NextFunction
    mw(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
