import { prisma } from '@edusync/database'
import { AppError } from '../middlewares/errorHandler'
import { getSupabaseAdmin } from '../lib/supabase'
import { updateAuthEmail } from '../lib/supabaseSync'

const EST_INCLUDE = {
  usuario: { select: { nombre: true, apellido: true, email: true, activo: true } },
  nivel:   true,
  matriculas: {
    include: {
      paralelo: { include: { grado: { include: { nivel: true } } } },
      gestion:  { select: { id: true, anno: true, activa: true } },
    },
    orderBy: { gestion: { anno: 'desc' as const } },
  },
  relaciones_padre: {
    include: { padre: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } } },
  },
} as const

async function nextCodigo(institucion_id: string, anno: number): Promise<string> {
  const count = await prisma.estudiante.count({ where: { usuario: { institucion_id } } })
  return `EST-${anno}-${String(count + 1).padStart(3, '0')}`
}

async function createSupabaseUser(email: string, password: string): Promise<string> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (!error) return data.user.id

  // Supabase already has this email — can happen when a previous registration
  // created the auth user but failed before writing the Prisma record (orphaned).
  const isEmailConflict = error.message.toLowerCase().includes('already been registered')
    || error.message.toLowerCase().includes('already registered')

  if (isEmailConflict) {
    // Search for the orphaned Supabase auth user and reuse its ID
    const { data: listing } = await supabase.auth.admin.listUsers({ perPage: 1000, page: 1 })
    const orphan = listing?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (orphan) {
      const existing = await prisma.usuario.findFirst({ where: { supabase_auth_id: orphan.id } })
      if (!existing) return orphan.id   // orphaned — safe to reuse
    }
    throw new AppError(409, 'Ya existe un usuario con ese correo electrónico', 'DUPLICATE_EMAIL')
  }

  throw new AppError(422, `Error creando cuenta: ${error.message}`, 'AUTH_ERROR')
}

export class EstudiantesService {
  async findAll(institucion_id: string, filters: { gestion_id?: string; paralelo_id?: string; buscar?: string }) {
    const { gestion_id, paralelo_id, buscar } = filters
    return prisma.estudiante.findMany({
      where: {
        usuario: {
          institucion_id,
          ...(buscar ? {
            OR: [
              { nombre:   { contains: buscar, mode: 'insensitive' } },
              { apellido: { contains: buscar, mode: 'insensitive' } },
            ],
          } : {}),
        },
        ...(gestion_id || paralelo_id ? {
          matriculas: {
            some: {
              ...(gestion_id  ? { gestion_id }  : {}),
              ...(paralelo_id ? { paralelo_id } : {}),
            },
          },
        } : {}),
      },
      include: {
        usuario:  { select: { nombre: true, apellido: true, email: true, activo: true } },
        matriculas: {
          ...(gestion_id ? { where: { gestion_id } } : {}),
          include: { paralelo: { include: { grado: { include: { nivel: true } } } } },
          orderBy: { gestion: { anno: 'desc' as const } },
          take:    1,
        },
        relaciones_padre: {
          include: { padre: { select: { id: true, nombre: true, apellido: true, email: true, telefono: true } } },
          take:    1,
        },
      },
      orderBy: [
        { usuario: { apellido: 'asc' } },
        { usuario: { nombre:   'asc' } },
      ],
    })
  }

  async findOne(id: string) {
    const est = await prisma.estudiante.findUnique({ where: { id }, include: EST_INCLUDE })
    if (!est) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')
    return est
  }

  async matricular(
    institucion_id: string,
    data: {
      nombre:           string
      apellido:         string
      email:            string
      paralelo_id:      string
      gestion_id:       string
      nombre_tutor1:    string
      telefono_tutor1:  string
      email_tutor1:     string
      nombre_tutor2?:   string
      telefono_tutor2?: string
      email_tutor2?:    string
      crear_cuenta_tutor:   boolean
      tutor1_existing_id?:  string
      becado?:              boolean
      motivo_beca?:         string
      fecha_nacimiento?:    string
      sexo?:                'M' | 'F'
    }
  ) {
    // Derive nivel_id from paralelo
    const paralelo = await prisma.paralelo.findUnique({
      where:   { id: data.paralelo_id },
      include: { grado: { include: { nivel: true } } },
    })
    if (!paralelo) throw new AppError(404, 'Paralelo no encontrado', 'NOT_FOUND')

    const gestion = await prisma.gestion.findUnique({ where: { id: data.gestion_id } })
    if (!gestion) throw new AppError(404, 'Gestión no encontrada', 'NOT_FOUND')

    // Check email not already registered
    const existing = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existing) throw new AppError(409, 'Ya existe un usuario con ese correo', 'DUPLICATE_EMAIL')

    const password = `Estudiante${gestion.anno}#`

    // Create Supabase auth user for student
    const authId  = await createSupabaseUser(data.email, password)
    const codigo  = await nextCodigo(institucion_id, gestion.anno)

    // Create usuario + estudiante + matricula in one transaction
    const estudiante = await prisma.estudiante.create({
      data: {
        codigo,
        nivel:       { connect: { id: paralelo.grado.nivel.id } },
        becado:      data.becado ?? false,
        ...(data.becado && data.motivo_beca ? { motivo_beca: data.motivo_beca } : {}),
        ...(data.fecha_nacimiento ? { fecha_nacimiento: new Date(data.fecha_nacimiento) } : {}),
        ...(data.sexo ? { sexo: data.sexo } : {}),
        usuario: {
          create: {
            supabase_auth_id: authId,
            email:            data.email,
            nombre:           data.nombre,
            apellido:         data.apellido,
            rol:              'ESTUDIANTE' as const,
            institucion_id,
          },
        },
        matriculas: {
          create: { paralelo_id: data.paralelo_id, gestion_id: data.gestion_id },
        },
      },
      include: EST_INCLUDE,
    })

    // Link tutor 1
    let tutor1Id: string | null = data.tutor1_existing_id ?? null

    if (!tutor1Id && data.crear_cuenta_tutor && data.email_tutor1) {
      const tutorExisting = await prisma.usuario.findUnique({ where: { email: data.email_tutor1 } })
      if (tutorExisting) {
        tutor1Id = tutorExisting.id
      } else {
        const tutorPassword = `Tutor${gestion.anno}#`
        const tutorAuthId   = await createSupabaseUser(data.email_tutor1, tutorPassword)
        const [apellidoT, nombreT] = data.nombre_tutor1.split(',').map(s => s.trim())
        const tutorUsuario  = await prisma.usuario.create({
          data: {
            supabase_auth_id: tutorAuthId,
            email:            data.email_tutor1,
            nombre:           nombreT ?? data.nombre_tutor1,
            apellido:         apellidoT ?? '',
            rol:              'PADRE_TUTOR' as const,
            institucion_id,
            ...(data.telefono_tutor1 ? { telefono: data.telefono_tutor1 } : {}),
          },
        })
        tutor1Id = tutorUsuario.id
      }
    }

    if (tutor1Id) {
      await prisma.relacionPadreHijo.upsert({
        where:  { padre_id_estudiante_id: { padre_id: tutor1Id, estudiante_id: estudiante.id } },
        create: { padre_id: tutor1Id, estudiante_id: estudiante.id },
        update: {},
      })
    }

    return { estudiante, credentials: { email: data.email, password } }
  }

  async update(
    id: string,
    data: {
      nombre?:           string
      apellido?:         string
      email?:            string
      activo?:           boolean
      becado?:           boolean
      motivo_beca?:      string | null
      fecha_nacimiento?: string | null
      sexo?:             'M' | 'F' | null
    },
  ) {
    const est = await this.findOne(id)

    const usuarioData: Record<string, unknown> = {}
    if (data.nombre   !== undefined) usuarioData.nombre   = data.nombre
    if (data.apellido !== undefined) usuarioData.apellido = data.apellido
    if (data.activo   !== undefined) usuarioData.activo   = data.activo

    if (data.email !== undefined && data.email !== est.usuario.email) {
      const emailTaken = await prisma.usuario.findUnique({ where: { email: data.email } })
      if (emailTaken) throw new AppError(409, 'Ya existe un usuario con ese correo', 'DUPLICATE_EMAIL')

      const usuario = await prisma.usuario.findUnique({
        where:  { id: est.usuario_id },
        select: { supabase_auth_id: true },
      })
      await updateAuthEmail(usuario!.supabase_auth_id, data.email)
      usuarioData.email = data.email
    }

    const estData: Record<string, unknown> = {}
    if (data.becado      !== undefined) estData.becado      = data.becado
    if (data.motivo_beca !== undefined) estData.motivo_beca = data.motivo_beca ?? null
    if (data.sexo        !== undefined) estData.sexo        = data.sexo ?? null
    if (data.fecha_nacimiento !== undefined) {
      estData.fecha_nacimiento = data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : null
    }

    await prisma.$transaction(async tx => {
      if (Object.keys(usuarioData).length > 0)
        await tx.usuario.update({ where: { id: est.usuario_id }, data: usuarioData })
      if (Object.keys(estData).length > 0)
        await tx.estudiante.update({ where: { id }, data: estData })
    })

    return this.findOne(id)
  }

  async linkPadre(
    estudiante_id: string,
    data: { padre_id?: string; nombre?: string; apellido?: string; email?: string; telefono?: string },
  ) {
    const est = await prisma.estudiante.findUnique({
      where:  { id: estudiante_id },
      select: { id: true, usuario: { select: { institucion_id: true } } },
    })
    if (!est) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')

    let padre_id = data.padre_id

    if (!padre_id) {
      if (!data.nombre || !data.apellido || !data.email) {
        throw new AppError(422, 'Se requiere padre_id o nombre/apellido/email para crear uno nuevo', 'VALIDATION')
      }
      const existing = await prisma.usuario.findUnique({ where: { email: data.email } })
      if (existing) throw new AppError(409, 'Ya existe un usuario con ese correo', 'DUPLICATE_EMAIL')

      const password = `Padre2026#`
      const authId    = await createSupabaseUser(data.email, password)
      const tutorUsuario = await prisma.usuario.create({
        data: {
          supabase_auth_id: authId,
          email:            data.email,
          nombre:           data.nombre,
          apellido:         data.apellido,
          rol:              'PADRE_TUTOR' as const,
          institucion_id:   est.usuario.institucion_id,
          ...(data.telefono ? { telefono: data.telefono } : {}),
        },
      })
      padre_id = tutorUsuario.id
    }

    await prisma.relacionPadreHijo.upsert({
      where:  { padre_id_estudiante_id: { padre_id, estudiante_id } },
      create: { padre_id, estudiante_id },
      update: {},
    })

    return this.findOne(estudiante_id)
  }

  async unlinkPadre(estudiante_id: string, padre_id: string) {
    await prisma.relacionPadreHijo.delete({
      where: { padre_id_estudiante_id: { padre_id, estudiante_id } },
    }).catch(() => {
      throw new AppError(404, 'Relación no encontrada', 'NOT_FOUND')
    })
    return this.findOne(estudiante_id)
  }

  async remove(id: string) {
    const est = await prisma.estudiante.findUnique({
      where:  { id },
      select: { usuario_id: true, usuario: { select: { supabase_auth_id: true } } },
    })
    if (!est) throw new AppError(404, 'Estudiante no encontrado', 'NOT_FOUND')

    await prisma.usuario.delete({ where: { id: est.usuario_id } })
    getSupabaseAdmin().auth.admin.deleteUser(est.usuario.supabase_auth_id).catch(() => {})
  }
}
