// Vercel serverless entry point — loads the pre-built Express app from tsup output
const app = require('../dist/index.js')
module.exports = app.default ?? app
