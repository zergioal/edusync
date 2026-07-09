import 'dotenv/config'
import app from './app'

// Exportar para Vercel serverless (module.exports.default = app)
export default app

// En local y Railway/Render arranca el servidor HTTP normalmente
if (!process.env['VERCEL']) {
  const PORT = process.env['PORT'] ?? 4000
  app.listen(PORT, () => {
    console.log(`🚀 API EduSync corriendo en http://localhost:${PORT}`)
  })
}
