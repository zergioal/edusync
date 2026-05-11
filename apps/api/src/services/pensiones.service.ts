import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import type { Rol } from '@edusync/types'
import { crearNotificacion } from './comunicacion.service'

const MES_NOMBRES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function diasMora(mes: number, anno: number): number {
  const inicio = new Date(anno, mes - 1, 1)
  const hoy    = new Date()
  if (hoy < inicio) return 0
  return Math.floor((hoy.getTime() - inicio.getTime()) / 86_400_000)
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface ResumenNivel {
  cantidad:       number
  monto_unitario: number
  total:          number
}

export class PensionesService {
  // ── Generar mes ─────────────────────────────────────────────────────────────
  // RN-10: becados nunca generan pensión
  // RN-11: requiere tarifas configuradas

  async generarMes(institucion_id: string, gestion_id: string, mes: number) {
    const gestion = await prisma.gestion.findFirst({ where: { id: gestion_id, institucion_id } })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')

    // RN-11: verificar que existan tarifas
    const tarifas = await prisma.tarifaPension.findMany({
      where:   { gestion_id },
      include: { nivel: true },
    })
    if (tarifas.length === 0) {
      throw new AppError(
        400,
        'Debes configurar las tarifas de pensión para esta gestión antes de generar los cobros.',
        'TARIFAS_REQUERIDAS',
      )
    }
    const tarifaMap = new Map(tarifas.map(t => [t.nivel_id, t]))

    // Obtener todas las matrículas con la cadena paralelo → grado → nivel
    const matriculas = await prisma.matricula.findMany({
      where:   { gestion_id },
      include: {
        paralelo:  { include: { grado: { include: { nivel: true } } } },
        estudiante: { select: { id: true, becado: true } },
      },
    })

    let creadas = 0
    let omitidas_becados     = 0
    let omitidas_duplicadas  = 0

    const porNivel: Record<string, ResumenNivel> = {}
    for (const t of tarifas) {
      porNivel[t.nivel.nombre] = { cantidad: 0, monto_unitario: Number(t.monto), total: 0 }
    }

    for (const m of matriculas) {
      // RN-10: skip becados
      if (m.estudiante.becado) { omitidas_becados++; continue }

      const nivel_id   = m.paralelo.grado.nivel_id
      const nivelNombre = m.paralelo.grado.nivel.nombre
      const tarifa     = tarifaMap.get(nivel_id)
      if (!tarifa) continue // sin tarifa para ese nivel → skip silencioso

      try {
        await prisma.pension.create({
          data: {
            estudiante_id: m.estudiante_id,
            gestion_id,
            mes,
            nivel_id,
            monto: tarifa.monto,
          },
        })
        creadas++
        const nr = porNivel[nivelNombre]
        if (nr) { nr.cantidad++; nr.total += Number(tarifa.monto) }
      } catch {
        omitidas_duplicadas++
      }
    }

    const monto_total_a_cobrar = Object.values(porNivel).reduce((s, r) => s + r.total, 0)

    return {
      creadas,
      omitidas_becados,
      omitidas_duplicadas,
      por_nivel: porNivel,
      monto_total_a_cobrar,
    }
  }

  // ── Preview de generación (sin crear) ────────────────────────────────────────

  async previewMes(institucion_id: string, gestion_id: string, mes: number) {
    const gestion = await prisma.gestion.findFirst({ where: { id: gestion_id, institucion_id } })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')

    const tarifas = await prisma.tarifaPension.findMany({
      where:   { gestion_id },
      include: { nivel: true },
    })
    if (tarifas.length === 0) {
      return { tarifas_configuradas: false, por_nivel: {}, becados_count: 0, monto_total: 0, ya_generado: false }
    }
    const tarifaMap = new Map(tarifas.map(t => [t.nivel_id, t]))

    const matriculas = await prisma.matricula.findMany({
      where:   { gestion_id },
      include: {
        paralelo:   { include: { grado: { include: { nivel: true } } } },
        estudiante: { select: { id: true, becado: true } },
      },
    })

    // Verificar si ya fue generado
    const yaExiste = await prisma.pension.findFirst({ where: { gestion_id, mes } })

    let becados_count = 0
    const porNivel: Record<string, ResumenNivel> = {}
    for (const t of tarifas) {
      porNivel[t.nivel.nombre] = { cantidad: 0, monto_unitario: Number(t.monto), total: 0 }
    }

    for (const m of matriculas) {
      if (m.estudiante.becado) { becados_count++; continue }
      const nivel_id    = m.paralelo.grado.nivel_id
      const nivelNombre = m.paralelo.grado.nivel.nombre
      const tarifa      = tarifaMap.get(nivel_id)
      if (!tarifa) continue
      const nr = porNivel[nivelNombre]
      if (nr) { nr.cantidad++; nr.total += Number(tarifa.monto) }
    }

    const monto_total = Object.values(porNivel).reduce((s, r) => s + r.total, 0)

    return {
      tarifas_configuradas: true,
      por_nivel:    porNivel,
      becados_count,
      monto_total,
      ya_generado:  !!yaExiste,
    }
  }

  // ── Listar ──────────────────────────────────────────────────────────────────

  async findAll(institucion_id: string, filters: {
    gestion_id?:   string
    mes?:          number
    paralelo_id?:  string
    nivel_id?:     string
    estado?:       string
    buscar?:       string
    estudiante_id?: string
  }) {
    let gestionIds: string[]
    if (filters.gestion_id) {
      gestionIds = [filters.gestion_id]
    } else {
      const gs = await prisma.gestion.findMany({ where: { institucion_id }, select: { id: true } })
      gestionIds = gs.map(g => g.id)
    }

    let estudianteIds: string[] | undefined
    if (filters.estudiante_id) {
      estudianteIds = [filters.estudiante_id]
    } else if (filters.paralelo_id) {
      const mats = await prisma.matricula.findMany({
        where: { paralelo_id: filters.paralelo_id, gestion_id: { in: gestionIds } },
        select: { estudiante_id: true },
      })
      estudianteIds = mats.map(m => m.estudiante_id)
    }

    const pensiones = await prisma.pension.findMany({
      where: {
        gestion_id:    { in: gestionIds },
        ...(filters.mes      ? { mes: filters.mes }           : {}),
        ...(filters.nivel_id ? { nivel_id: filters.nivel_id } : {}),
        ...(filters.estado === 'pagado'    ? { pagado: true }  : {}),
        ...(filters.estado === 'pendiente' ? { pagado: false } : {}),
        ...(estudianteIds ? { estudiante_id: { in: estudianteIds } } : {}),
      },
      include: {
        estudiante: {
          include: {
            usuario:   { select: { nombre: true, apellido: true } },
            matriculas: {
              where:   { gestion_id: { in: gestionIds } },
              include: { paralelo: { include: { grado: true } } },
              take:    1,
            },
          },
        },
        gestion: { select: { anno: true } },
        nivel:   { select: { nombre: true } },
      },
      orderBy: [
        { mes: 'asc' },
        { estudiante: { usuario: { apellido: 'asc' } } },
      ],
    })

    const filtered = filters.buscar
      ? pensiones.filter(p => {
          const term = filters.buscar!.toLowerCase()
          const { nombre, apellido } = p.estudiante.usuario
          return (
            nombre.toLowerCase().includes(term)  ||
            apellido.toLowerCase().includes(term) ||
            p.estudiante.codigo.toLowerCase().includes(term)
          )
        })
      : pensiones

    return filtered.map(p => {
      const mat = p.estudiante.matriculas[0]
      return {
        id:    p.id,
        estudiante: {
          id:       p.estudiante.id,
          codigo:   p.estudiante.codigo,
          nombre:   p.estudiante.usuario.nombre,
          apellido: p.estudiante.usuario.apellido,
          paralelo: mat ? { letra: mat.paralelo.letra, grado: mat.paralelo.grado.nombre } : null,
        },
        nivel:       p.nivel?.nombre ?? null,
        mes:         p.mes,
        nombre_mes:  MES_NOMBRES[p.mes - 1] ?? '',
        monto:       Number(p.monto),
        pagado:      p.pagado,
        fecha_pago:  p.fecha_pago,
        comprobante: p.comprobante,
        dias_mora:   p.pagado ? 0 : diasMora(p.mes, p.gestion.anno),
      }
    })
  }

  // ── Pagar ────────────────────────────────────────────────────────────────────

  async pagar(id: string, datos: { fecha_pago: string; comprobante: string }, registrado_por: string) {
    const pension = await prisma.pension.findUnique({ where: { id } })
    if (!pension) throw new AppError(404, 'Pensión no encontrada', 'NOT_FOUND')
    if (pension.pagado) throw new AppError(409, 'Esta pensión ya está pagada', 'ALREADY_PAID')

    const [updated] = await prisma.$transaction([
      prisma.pension.update({
        where: { id },
        data: {
          pagado:      true,
          fecha_pago:  new Date(datos.fecha_pago),
          comprobante: datos.comprobante,
          anulado_por: null,
          anulado_en:  null,
        },
      }),
      prisma.pago.create({
        data: {
          pension_id:    id,
          registrado_por,
          fecha:         new Date(datos.fecha_pago),
          comprobante:   datos.comprobante,
        },
      }),
    ])

    // Notify student and parents
    const pensionConEst = await prisma.pension.findUnique({
      where:   { id },
      include: {
        estudiante: {
          include: {
            usuario: { select: { id: true } },
            relaciones_padre: { include: { padre: true } },
          },
        },
        gestion: { select: { anno: true } },
      },
    })
    if (pensionConEst) {
      const mesNombre  = MES_NOMBRES[(pensionConEst.mes - 1)] ?? `Mes ${pensionConEst.mes}`
      const titulo     = `Pago registrado — ${mesNombre} ${pensionConEst.gestion.anno}`
      const cuerpo     = `El pago de pensión correspondiente a ${mesNombre} fue registrado correctamente.`
      const notif      = { tipo: 'PAGO' as const, titulo, cuerpo, referencia_id: id, referencia_tipo: 'Pension' }
      const notifTargets = [
        pensionConEst.estudiante.usuario.id,
        ...pensionConEst.estudiante.relaciones_padre.map(r => r.padre_id),
      ]
      await Promise.all(notifTargets.map(uid => crearNotificacion({ usuario_id: uid, ...notif }).catch(() => {})))
    }

    return updated
  }

  // ── Anular ───────────────────────────────────────────────────────────────────

  async anular(id: string, anulado_por: string) {
    const pension = await prisma.pension.findUnique({ where: { id } })
    if (!pension) throw new AppError(404, 'Pensión no encontrada', 'NOT_FOUND')
    if (!pension.pagado) throw new AppError(409, 'Esta pensión no está pagada', 'NOT_PAID')
    return prisma.pension.update({
      where: { id },
      data: { pagado: false, fecha_pago: null, comprobante: null, anulado_por, anulado_en: new Date() },
    })
  }

  // ── Estado de cuenta ─────────────────────────────────────────────────────────

  async estadoCuenta(estudiante_id: string, gestion_id?: string) {
    const estudiante = await prisma.estudiante.findUnique({
      where:   { id: estudiante_id },
      include: {
        usuario:    { select: { nombre: true, apellido: true, institucion_id: true } },
        matriculas: {
          include:  { paralelo: { include: { grado: true } }, gestion: true },
          orderBy:  { gestion: { anno: 'desc' } },
          take: 1,
        },
      },
    })
    if (!estudiante) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')

    // RN-10: si es becado, retornar estado especial
    if (estudiante.becado) {
      return {
        becado:      true,
        motivo_beca: estudiante.motivo_beca,
        mensaje:     'Este estudiante está exento del pago de pensiones.',
        estudiante: {
          id:       estudiante.id,
          nombre:   estudiante.usuario.nombre,
          apellido: estudiante.usuario.apellido,
          codigo:   estudiante.codigo,
          paralelo: null,
        },
        gestion: null,
        meses:   [],
        resumen: { total_pagado: 0, total_pendiente: 0, meses_pagados: 0, meses_pendientes: 0, al_dia: true },
      }
    }

    let targetId = gestion_id
    if (!targetId) {
      const g = await prisma.gestion.findFirst({
        where: { institucion_id: estudiante.usuario.institucion_id, activa: true },
      })
      if (!g) throw new AppError(404, 'No hay gestión activa', 'NOT_FOUND')
      targetId = g.id
    }

    const gestion = await prisma.gestion.findUnique({ where: { id: targetId } })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')

    const pensiones = await prisma.pension.findMany({
      where:   { estudiante_id, gestion_id: targetId },
      orderBy: { mes: 'asc' },
    })

    const mat   = estudiante.matriculas[0]
    const meses = pensiones.map(p => ({
      id:          p.id,
      mes:         p.mes,
      nombre_mes:  MES_NOMBRES[p.mes - 1] ?? '',
      monto:       Number(p.monto),
      pagado:      p.pagado,
      fecha_pago:  p.fecha_pago,
      comprobante: p.comprobante,
      dias_mora:   p.pagado ? 0 : diasMora(p.mes, gestion.anno),
    }))

    const total_pagado     = meses.filter(m => m.pagado).reduce((s, m) => s + m.monto, 0)
    const total_pendiente  = meses.filter(m => !m.pagado).reduce((s, m) => s + m.monto, 0)
    const meses_pagados    = meses.filter(m => m.pagado).length
    const meses_pendientes = meses.filter(m => !m.pagado).length
    const mesActual        = new Date().getMonth() + 1
    const pensionMes       = pensiones.find(p => p.mes === mesActual)
    const al_dia           = pensionMes ? pensionMes.pagado : true

    return {
      becado:  false,
      estudiante: {
        id:       estudiante.id,
        nombre:   estudiante.usuario.nombre,
        apellido: estudiante.usuario.apellido,
        codigo:   estudiante.codigo,
        paralelo: mat ? `${mat.paralelo.grado.nombre} "${mat.paralelo.letra}"` : null,
      },
      gestion:  { id: gestion.id, anno: gestion.anno },
      meses,
      resumen:  { total_pagado, total_pendiente, meses_pagados, meses_pendientes, al_dia },
    }
  }

  // ── Morosidad ────────────────────────────────────────────────────────────────

  async morosidad(institucion_id: string, filters: { gestion_id?: string; paralelo_id?: string }) {
    let gestion_id = filters.gestion_id
    if (!gestion_id) {
      const g = await prisma.gestion.findFirst({ where: { institucion_id, activa: true } })
      if (!g) throw new AppError(404, 'No hay gestión activa', 'NOT_FOUND')
      gestion_id = g.id
    }

    let estudianteIds: string[] | undefined
    if (filters.paralelo_id) {
      const mats = await prisma.matricula.findMany({
        where: { paralelo_id: filters.paralelo_id, gestion_id },
        select: { estudiante_id: true },
      })
      estudianteIds = mats.map(m => m.estudiante_id)
    }

    const pendientes = await prisma.pension.findMany({
      where: {
        gestion_id,
        pagado: false,
        ...(estudianteIds ? { estudiante_id: { in: estudianteIds } } : {}),
      },
      include: {
        estudiante: {
          include: {
            usuario:   { select: { nombre: true, apellido: true } },
            nivel:     { select: { nombre: true } },
            matriculas: {
              where:   { gestion_id },
              include: { paralelo: { include: { grado: true } } },
              take:    1,
            },
          },
        },
        nivel: { select: { nombre: true } },
      },
    })

    const byStudent = new Map<string, typeof pendientes>()
    for (const p of pendientes) {
      if (!byStudent.has(p.estudiante_id)) byStudent.set(p.estudiante_id, [])
      byStudent.get(p.estudiante_id)!.push(p)
    }

    const results = await Promise.all(
      Array.from(byStudent.entries()).map(async ([, ps]) => {
        const est = ps[0]!.estudiante
        const mat = est.matriculas[0]
        const ultimoPago = await prisma.pago.findFirst({
          where:   { pension: { estudiante_id: est.id, gestion_id } },
          orderBy: { fecha: 'desc' },
        })
        return {
          estudiante: { id: est.id, nombre: est.usuario.nombre, apellido: est.usuario.apellido, codigo: est.codigo },
          paralelo: mat ? { letra: mat.paralelo.letra, grado: mat.paralelo.grado.nombre } : null,
          nivel:    est.nivel?.nombre ?? ps[0]?.nivel?.nombre ?? null,
          monto_mensual:          Number(ps[0]?.monto ?? 0),
          meses_pendientes:       ps.length,
          monto_total_pendiente:  ps.reduce((s, p) => s + Number(p.monto), 0),
          ultimo_pago:            ultimoPago?.fecha ?? null,
        }
      })
    )

    return results.sort((a, b) => b.meses_pendientes - a.meses_pendientes)
  }

  // ── Mi estado financiero ──────────────────────────────────────────────────────

  async miEstadoFinanciero(usuario_id: string, institucion_id: string, rol: Rol) {
    const mesActual  = new Date().getMonth() + 1
    const gestion    = await prisma.gestion.findFirst({ where: { institucion_id, activa: true } })
    const institucion = await prisma.institucion.findUnique({ where: { id: institucion_id } })

    const baseResp = {
      bloqueado: false, becado: false, mes_activo: mesActual, deuda_pendiente: 0,
      mensaje:   'Sin gestión activa',
      qr_pago_url: institucion?.qr_url ?? null,
      whatsapp:    institucion?.whatsapp ?? null,
      hijos: [] as Array<{ id: string; nombre: string; apellido: string; bloqueado: boolean; becado: boolean; monto_pendiente: number }>,
    }

    if (!gestion) return baseResp

    let estudianteIds: string[] = []

    if (rol === 'ESTUDIANTE') {
      const est = await prisma.estudiante.findFirst({ where: { usuario_id }, select: { id: true, becado: true } })
      if (est) {
        // RN-10: becado nunca bloqueado
        if (est.becado) {
          const e = await prisma.estudiante.findUnique({
            where: { id: est.id },
            include: { usuario: { select: { nombre: true, apellido: true } } },
          })
          return {
            ...baseResp, becado: true,
            mensaje: 'Eres estudiante becado. Tienes acceso completo.',
            hijos: [{ id: est.id, nombre: e?.usuario.nombre ?? '', apellido: e?.usuario.apellido ?? '', bloqueado: false, becado: true, monto_pendiente: 0 }],
          }
        }
        estudianteIds = [est.id]
      }
    } else if (rol === 'PADRE_TUTOR') {
      const rels = await prisma.relacionPadreHijo.findMany({
        where:  { padre_id: usuario_id },
        select: { estudiante_id: true },
      })
      estudianteIds = rels.map(r => r.estudiante_id)
    }

    if (estudianteIds.length === 0) return { ...baseResp, mensaje: 'Sin estudiantes vinculados' }

    const pensiones = await prisma.pension.findMany({
      where: {
        estudiante_id: { in: estudianteIds },
        gestion_id:    gestion.id,
        mes:           mesActual,
        pagado:        false,
      },
    })

    const deuda_pendiente = pensiones.reduce((s, p) => s + Number(p.monto), 0)
    const bloqueado = pensiones.length > 0

    const hijos = await Promise.all(
      estudianteIds.map(async estId => {
        const est = await prisma.estudiante.findUnique({
          where:   { id: estId },
          include: { usuario: { select: { nombre: true, apellido: true } } },
        })
        const esBecado = est?.becado ?? false
        const pension  = !esBecado ? pensiones.find(p => p.estudiante_id === estId) : undefined
        return {
          id:              estId,
          nombre:          est?.usuario.nombre  ?? '',
          apellido:        est?.usuario.apellido ?? '',
          bloqueado:       !esBecado && !!pension,
          becado:          esBecado,
          monto_pendiente: pension ? Number(pension.monto) : 0,
        }
      })
    )

    return {
      bloqueado,
      becado:          false,
      mes_activo:      mesActual,
      deuda_pendiente,
      mensaje:         bloqueado
        ? `Tiene pensiones pendientes del mes de ${MES_NOMBRES[mesActual - 1] ?? ''}. Regularice para acceder al sistema académico.`
        : '¡Sus pagos están al día!',
      qr_pago_url:     institucion?.qr_url   ?? null,
      whatsapp:        institucion?.whatsapp  ?? null,
      hijos,
    }
  }
}
