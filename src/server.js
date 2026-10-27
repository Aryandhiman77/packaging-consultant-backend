import 'dotenv/config'
import { createApp } from './app.js'
import { connectDatabase } from './config/database.js'
import { syncEnvAdmin } from './services/syncEnvAdmin.js'

const port = Number(process.env.PORT || 5050)
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packaging-consultant'

try {
  await connectDatabase(mongoUri)
  await syncEnvAdmin()
  const app = createApp()
  app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`)
  })
} catch (error) {
  console.error('Unable to start API:', error.message)
  process.exit(1)
}
