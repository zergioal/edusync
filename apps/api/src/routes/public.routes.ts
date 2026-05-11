import { Router } from 'express'
import { prisma } from '@edusync/database'

export const publicRouter = Router()

async function getInstitucion(subdominio?: string) {
  if (subdominio) {
    return prisma.institucion.findUnique({ where: { subdominio } })
  }
  return prisma.institucion.findFirst({ where: { activa: true } })
}

publicRouter.get('/config', async (req, res, next) => {
  try {
    const { subdominio } = req.query as { subdominio?: string }
    const inst = await getInstitucion(subdominio)
    if (!inst) { res.status(404).json({ error: 'NOT_FOUND', message: 'Institución no encontrada' }); return }
    res.json({
      data: {
        id:        inst.id,
        nombre:    inst.nombre,
        subdominio: inst.subdominio,
        logo_url:  inst.logo_url,
        slogan:    inst.slogan,
        qr_url:    inst.qr_url,
        whatsapp:  inst.whatsapp,
        direccion: inst.direccion,
        telefono:  inst.telefono,
      },
    })
  } catch (e) { next(e) }
})

publicRouter.get('/galeria', async (req, res, next) => {
  try {
    const { subdominio, tipo } = req.query as { subdominio?: string; tipo?: string }
    const inst = await getInstitucion(subdominio)
    if (!inst) { res.status(404).json({ error: 'NOT_FOUND', message: 'Institución no encontrada' }); return }
    const items = await prisma.galeriaItem.findMany({
      where: {
        institucion_id: inst.id,
        ...(tipo === 'FOTO' || tipo === 'VIDEO' ? { tipo } : {}),
      },
      orderBy: { publicado_en: 'desc' },
    })
    res.json({ data: items })
  } catch (e) { next(e) }
})

publicRouter.get('/anuncios', async (req, res, next) => {
  try {
    const { subdominio } = req.query as { subdominio?: string }
    const inst = await getInstitucion(subdominio)
    if (!inst) { res.status(404).json({ error: 'NOT_FOUND', message: 'Institución no encontrada' }); return }
    const anuncios = await prisma.anuncio.findMany({
      where: { institucion_id: inst.id, activo: true, visible_para: 'TODOS' },
      orderBy: { publicado_en: 'desc' },
    })
    res.json({ data: anuncios })
  } catch (e) { next(e) }
})
