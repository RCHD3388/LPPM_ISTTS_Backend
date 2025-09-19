const { Sequelize } = require('sequelize')
const config = require('./../config/database') // path sesuai project kamu

const env = process.env.APP_ENV || 'development'
const dbConfig = config[env]

async function createDatabase() {
  try {
    // konek tanpa pilih database dulu
    const sequelize = new Sequelize('', dbConfig.username, dbConfig.password, {
      host: dbConfig.host,
      dialect: dbConfig.dialect,
      logging: false,
    })

    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`)
    console.log(`✅ Database "${dbConfig.database}" siap digunakan`)
    process.exit(0)
  } catch (error) {
    console.error('❌ Gagal membuat database:', error)
    process.exit(1)
  }
}

createDatabase()
