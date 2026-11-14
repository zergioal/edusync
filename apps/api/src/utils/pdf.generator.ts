import puppeteer from 'puppeteer'

async function launch() {
  return puppeteer.launch({
    headless: true,
    executablePath: process.env['PUPPETEER_EXECUTABLE_PATH'] || undefined,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })
}

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await launch()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format:          'Letter',
      printBackground: true,
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export type TipoHoja = 'carta' | 'oficio'

export async function generatePDFLandscape(html: string, hoja: TipoHoja = 'carta'): Promise<Buffer> {
  const browser = await launch()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const margin = { top: '0.7cm', right: '0.7cm', bottom: '0.7cm', left: '0.7cm' }
    const pdf = await page.pdf(
      hoja === 'oficio'
        // "Oficio" no tiene nombre propio en Puppeteer — se da directo en horizontal
        // (ancho = lado largo 33cm, alto = lado corto 21.59cm; `landscape` solo rota tamaños
        // con nombre, no width/height explícitos, así que acá no hace falta).
        ? { width: '33cm', height: '21.59cm', printBackground: true, margin }
        : { format: 'Letter', landscape: true, printBackground: true, margin },
    )
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
