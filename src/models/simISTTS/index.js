const { Sequelize } = require("sequelize")
const env = require("../../config/env.js")
const { SIMConnectionDatabaseConfig } = require("../../config/database.js")

const config = SIMConnectionDatabaseConfig[env("APP_ENV") || "development"]
const sequelize = new Sequelize(
  config.DATABASE,
  config.USERNAME,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: "mysql",
    logging: false,
  }
)

const db = {}

db.Sequelize = Sequelize
db.sequelize = sequelize

// Import semua model di sini
db.SimKaryawan = require("./sim_karyawan.js")(sequelize, Sequelize.DataTypes)
db.SimDosen = require("./sim_dosen.js")(sequelize, Sequelize.DataTypes)


module.exports = db
