import { Rol } from '@edusync/types'

// ─── Ruta dashboard por rol ───────────────────────────────────────────────────

const STAFF_ROLES = new Set<Rol>([
  Rol.ADMIN_SISTEMA,
  Rol.DIRECTOR,
  Rol.SECRETARIA,
  Rol.REGENTE,
  Rol.CONTADOR,
])

export function getRolDashboardPath(rol: Rol): string {
  if (rol === Rol.DIRECTOR)      return '/dashboard/director'
  if (rol === Rol.REGENTE)       return '/dashboard/regente'
  if (STAFF_ROLES.has(rol))      return '/dashboard/admin'
  if (rol === Rol.COORDINADOR)   return '/dashboard/coordinador'
  if (rol === Rol.DOCENTE)       return '/dashboard/docente'
  if (rol === Rol.ESTUDIANTE)    return '/dashboard/estudiante'
  if (rol === Rol.PADRE_TUTOR)   return '/dashboard/padre'
  return '/dashboard/admin'
}

// ─── Navegación por rol ───────────────────────────────────────────────────────

export interface NavItem {
  to:    string
  label: string
  icon:  NavIcon
}

export type NavIcon =
  | 'home' | 'users' | 'student' | 'teacher' | 'book'
  | 'calendar' | 'cash' | 'clock' | 'bell' | 'chart'
  | 'folder' | 'settings' | 'child'

export const NAV_POR_ROL: Record<string, NavItem[]> = {
  director: [
    { to: '/dashboard/director',                  label: 'Panel',                icon: 'home'     },
    { to: '/dashboard/director/estudiantes',      label: 'Estudiantes',          icon: 'student'  },
    { to: '/dashboard/director/docentes',         label: 'Docentes',             icon: 'teacher'  },
    { to: '/dashboard/director/gestiones',        label: 'Gestión',              icon: 'calendar' },
    { to: '/dashboard/director/reportes',         label: 'Reportes',             icon: 'chart'    },
    { to: '/dashboard/director/carga-horaria',    label: 'Carga Horaria',        icon: 'clock'    },
    { to: '/dashboard/director/anuncios',         label: 'Comunicados',          icon: 'bell'     },
    { to: '/dashboard/director/mensajes',         label: 'Mensajes',             icon: 'folder'   },
    { to: '/dashboard/director/auditoria',        label: 'Auditoría',            icon: 'settings' },
  ],
  regente: [
    { to: '/dashboard/regente',                   label: 'Panel',                icon: 'home'     },
    { to: '/dashboard/regente/asistencia',        label: 'Asistencia Diaria',    icon: 'users'    },
    { to: '/dashboard/regente/reporte',           label: 'Reporte Asistencia',   icon: 'chart'    },
    { to: '/dashboard/regente/inasistencias',     label: 'Comunicados Inasist.', icon: 'bell'     },
    { to: '/dashboard/regente/anuncios',          label: 'Comunicados',          icon: 'folder'   },
    { to: '/dashboard/regente/mensajes',          label: 'Mensajes',             icon: 'calendar' },
  ],
  coordinador: [
    { to: '/dashboard/coordinador',                   label: 'Panel',                icon: 'home'     },
    { to: '/dashboard/coordinador/estudiantes',       label: 'Estudiantes',          icon: 'student'  },
    { to: '/dashboard/coordinador/docentes',          label: 'Docentes',             icon: 'teacher'  },
    { to: '/dashboard/coordinador/paralelos',         label: 'Cursos y Paralelos',   icon: 'users'    },
    { to: '/dashboard/coordinador/asignaciones',      label: 'Asignación Docentes',  icon: 'book'     },
    { to: '/dashboard/coordinador/gestiones',         label: 'Gestión Académica',    icon: 'calendar' },
    { to: '/dashboard/coordinador/horarios',          label: 'Horarios',             icon: 'clock'    },
    { to: '/dashboard/coordinador/reportes',          label: 'Reportes Académicos',  icon: 'chart'    },
    { to: '/dashboard/coordinador/anuncios',          label: 'Comunicados',          icon: 'bell'     },
    { to: '/dashboard/coordinador/mensajes',          label: 'Mensajes',             icon: 'folder'   },
  ],
  admin: [
    { to: '/dashboard/admin',                label: 'Panel',             icon: 'home'     },
    { to: '/dashboard/admin/instituciones',  label: 'Instituciones',     icon: 'users'    },
    { to: '/dashboard/admin/estudiantes',    label: 'Estudiantes',       icon: 'student'  },
    { to: '/dashboard/admin/docentes',       label: 'Docentes',          icon: 'teacher'  },
    { to: '/dashboard/admin/paralelos',      label: 'Cursos y Paralelos', icon: 'users'   },
    { to: '/dashboard/admin/asignaciones',   label: 'Asignación Docentes', icon: 'book'   },
    { to: '/dashboard/admin/gestiones',      label: 'Gestión',           icon: 'calendar' },
    { to: '/dashboard/admin/calificaciones', label: 'Calificaciones',    icon: 'chart'    },
    { to: '/dashboard/admin/asistencia',     label: 'Asistencia',        icon: 'chart'    },
    { to: '/dashboard/admin/horarios',       label: 'Horarios',          icon: 'clock'    },
    { to: '/dashboard/admin/finanzas',       label: 'Finanzas',          icon: 'cash'     },
    { to: '/dashboard/admin/anuncios',       label: 'Comunicados',       icon: 'bell'     },
    { to: '/dashboard/admin/mensajes',       label: 'Mensajes',          icon: 'folder'   },
    { to: '/dashboard/admin/auditoria',      label: 'Auditoría',         icon: 'settings' },
    { to: '/dashboard/admin/configuracion',  label: 'Configuración',     icon: 'settings' },
  ],
  secretaria: [
    { to: '/dashboard/admin',                label: 'Panel',          icon: 'home'     },
    { to: '/dashboard/admin/estudiantes',    label: 'Estudiantes',    icon: 'student'  },
    { to: '/dashboard/admin/gestiones',      label: 'Gestión',        icon: 'calendar' },
    { to: '/dashboard/admin/anuncios',       label: 'Comunicados',    icon: 'bell'     },
    { to: '/dashboard/admin/mensajes',       label: 'Mensajes',       icon: 'folder'   },
    { to: '/dashboard/admin/configuracion',  label: 'Configuración',  icon: 'settings' },
  ],
  contador: [
    { to: '/dashboard/admin',                label: 'Panel',          icon: 'home'     },
    { to: '/dashboard/admin/estudiantes',    label: 'Estudiantes',    icon: 'student'  },
    { to: '/dashboard/admin/finanzas',       label: 'Finanzas',       icon: 'cash'     },
    { to: '/dashboard/admin/anuncios',       label: 'Comunicados',    icon: 'bell'     },
    { to: '/dashboard/admin/mensajes',       label: 'Mensajes',       icon: 'folder'   },
  ],
  docente: [
    { to: '/dashboard/docente',                   label: 'Mi Panel',      icon: 'home'    },
    { to: '/dashboard/docente/asignaciones',      label: 'Mis Materias',  icon: 'book'    },
    { to: '/dashboard/docente/calificaciones',    label: 'Calificaciones', icon: 'chart'  },
    { to: '/dashboard/docente/tareas',            label: 'Tareas',        icon: 'folder'  },
    { to: '/dashboard/docente/asistencia',        label: 'Asistencia',    icon: 'users'   },
    { to: '/dashboard/docente/horario',           label: 'Mi Horario',    icon: 'clock'   },
    { to: '/dashboard/docente/anuncios',          label: 'Comunicados',   icon: 'bell'    },
    { to: '/dashboard/docente/mensajes',          label: 'Mensajes',      icon: 'calendar'},
  ],
  estudiante: [
    { to: '/dashboard/estudiante',                label: 'Mi Panel',      icon: 'home'     },
    { to: '/dashboard/estudiante/notas',          label: 'Mis Notas',     icon: 'book'     },
    { to: '/dashboard/estudiante/boletin',        label: 'Mi Boletín',    icon: 'folder'   },
    { to: '/dashboard/estudiante/asistencia',     label: 'Asistencia',    icon: 'chart'    },
    { to: '/dashboard/estudiante/tareas',         label: 'Mis Tareas',    icon: 'calendar' },
    { to: '/dashboard/estudiante/horario',        label: 'Mi Horario',    icon: 'clock'    },
    { to: '/dashboard/estudiante/anuncios',       label: 'Comunicados',   icon: 'bell'     },
    { to: '/dashboard/estudiante/mensajes',       label: 'Mensajes',      icon: 'users'    },
  ],
  padre: [
    { to: '/dashboard/padre',                     label: 'Mi Panel',      icon: 'home'     },
    { to: '/dashboard/padre/hijos',               label: 'Mis Hijos',     icon: 'child'    },
    { to: '/dashboard/padre/notas',               label: 'Notas',         icon: 'book'     },
    { to: '/dashboard/padre/boletin',             label: 'Boletín',       icon: 'folder'   },
    { to: '/dashboard/padre/asistencia',          label: 'Asistencia',    icon: 'calendar' },
    { to: '/dashboard/padre/pensiones',           label: 'Pensiones',     icon: 'cash'     },
    { to: '/dashboard/padre/anuncios',            label: 'Comunicados',   icon: 'bell'     },
    { to: '/dashboard/padre/mensajes',            label: 'Mensajes',      icon: 'users'    },
  ],
}

export function getNavGroup(rol: Rol): NavItem[] {
  switch (rol) {
    case Rol.DIRECTOR:     return NAV_POR_ROL['director']    ?? []
    case Rol.REGENTE:      return NAV_POR_ROL['regente']     ?? []
    case Rol.SECRETARIA:   return NAV_POR_ROL['secretaria']  ?? []
    case Rol.CONTADOR:     return NAV_POR_ROL['contador']    ?? []
    case Rol.ADMIN_SISTEMA: return NAV_POR_ROL['admin']      ?? []
    case Rol.COORDINADOR:  return NAV_POR_ROL['coordinador'] ?? []
    case Rol.DOCENTE:      return NAV_POR_ROL['docente']     ?? []
    case Rol.ESTUDIANTE:   return NAV_POR_ROL['estudiante']  ?? []
    case Rol.PADRE_TUTOR:  return NAV_POR_ROL['padre']       ?? []
    default:               return NAV_POR_ROL['admin']       ?? []
  }
}

export const ROL_LABELS: Record<Rol, string> = {
  [Rol.ADMIN_SISTEMA]: 'Admin. Sistema',
  [Rol.DIRECTOR]:      'Director/a',
  [Rol.COORDINADOR]:   'Coordinador/a',
  [Rol.SECRETARIA]:    'Secretaría',
  [Rol.REGENTE]:       'Regente',
  [Rol.CONTADOR]:      'Contador/a',
  [Rol.DOCENTE]:       'Docente',
  [Rol.ESTUDIANTE]:    'Estudiante',
  [Rol.PADRE_TUTOR]:   'Padre/Tutor',
}
