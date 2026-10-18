import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tests de regresión para los hallazgos de la auditoría multi-tenant: varios
// servicios resolvían un recurso por id sin verificar que perteneciera a la
// institución de quien hace el pedido — un usuario autenticado de la
// Institución A podía leer/editar un recurso de la Institución B con solo
// conocer su UUID. Acá se simula Prisma (sin tocar la base real) para probar
// cada rama de "institución correcta" vs "institución equivocada" en
// aislamiento, rápido y sin red.

const INST_A = 'inst-a'
const INST_B = 'inst-b'

// vi.hoisted: el factory de vi.mock de abajo se "hoistea" por encima de todo el
// archivo (incluso de los imports), así que mockPrisma debe nacer igual de hoisted
// para que exista cuando ese factory corre.
const mockPrisma = vi.hoisted(() => ({
  estudiante: { findUnique: vi.fn(), findFirst: vi.fn() },
  usuario:    { findUnique: vi.fn() },
  pension:    { findUnique: vi.fn() },
  asignacion: { findFirst: vi.fn() },
  paralelo:   { findFirst: vi.fn() },
  trimestre:  { findUnique: vi.fn() },
}))

vi.mock('@edusync/database', () => ({ prisma: mockPrisma }))

import { EstudiantesService } from '../services/estudiantes.service'
import { UsuariosService }    from '../services/usuarios.service'
import { PensionesService }   from '../services/pensiones.service'
import { AsistenciaService }  from '../services/asistencia.service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EstudiantesService.findOne — aislamiento multi-tenant', () => {
  const svc = new EstudiantesService()
  const estudianteDeA = {
    id: 'est-1', estado: 'ACTIVO',
    usuario: { nombre: 'Ana', apellido: 'Pérez', email: 'a@x.com', activo: true, institucion_id: INST_A },
  }

  it('devuelve el estudiante cuando la institución coincide', async () => {
    mockPrisma.estudiante.findUnique.mockResolvedValue(estudianteDeA)
    const result = await svc.findOne('est-1', INST_A)
    expect(result.id).toBe('est-1')
  })

  it('rechaza con NOT_FOUND cuando el estudiante es de OTRA institución', async () => {
    mockPrisma.estudiante.findUnique.mockResolvedValue(estudianteDeA)
    await expect(svc.findOne('est-1', INST_B)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('sin institucion_id (reuso interno) no filtra — se mantiene el comportamiento previo', async () => {
    mockPrisma.estudiante.findUnique.mockResolvedValue(estudianteDeA)
    const result = await svc.findOne('est-1')
    expect(result.id).toBe('est-1')
  })
})

describe('UsuariosService.findOne/update/remove — aislamiento multi-tenant', () => {
  const svc = new UsuariosService()
  const usuarioDeA = { id: 'usr-1', institucion_id: INST_A, rol: 'DOCENTE' }

  it('findOne devuelve el usuario cuando la institución coincide', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(usuarioDeA)
    const result = await svc.findOne('usr-1', INST_A)
    expect(result.id).toBe('usr-1')
  })

  it('findOne rechaza con NOT_FOUND cuando el usuario es de OTRA institución', async () => {
    mockPrisma.usuario.findUnique.mockResolvedValue(usuarioDeA)
    await expect(svc.findOne('usr-1', INST_B)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('PensionesService.pagar/anular/estadoCuenta — aislamiento multi-tenant', () => {
  const svc = new PensionesService()
  const pensionDeA = { id: 'pen-1', pagado: false, gestion: { institucion_id: INST_A } }

  it('pagar rechaza con NOT_FOUND cuando la pensión es de OTRA institución', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue(pensionDeA)
    await expect(
      svc.pagar('pen-1', { fecha_pago: '2026-01-01', comprobante: 'x' }, 'actor-1', INST_B),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('anular rechaza con NOT_FOUND cuando la pensión es de OTRA institución', async () => {
    mockPrisma.pension.findUnique.mockResolvedValue({ ...pensionDeA, pagado: true })
    await expect(svc.anular('pen-1', 'actor-1', INST_B)).rejects.toMatchObject({ statusCode: 404 })
  })
})

describe('AsistenciaService — aislamiento multi-tenant', () => {
  const svc = new AsistenciaService()

  it('getClase rechaza con NOT_FOUND cuando la asignación es de OTRA institución', async () => {
    mockPrisma.asignacion.findFirst.mockResolvedValue(null) // la query ya filtra por institución
    await expect(svc.getClase('asig-1', '2026-07-01', INST_B)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('getClase funciona cuando la asignación pertenece a la institución', async () => {
    mockPrisma.asignacion.findFirst.mockResolvedValue({ id: 'asig-1' })
    // @ts-expect-error — el mock no tipa todos los modelos de Prisma, solo los que usan estos tests
    mockPrisma.asistenciaClase = { findMany: vi.fn().mockResolvedValue([]) }
    const result = await svc.getClase('asig-1', '2026-07-01', INST_A)
    expect(result).toEqual([])
  })
})
