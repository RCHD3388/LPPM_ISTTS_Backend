const { Sequelize } = require("sequelize")
const env = require("../config/env.js")
const { databaseConfig } = require("../config/database.js")

const config = databaseConfig[env("APP_ENV") || "development"]
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
db.Tag = require("./tag.js")(sequelize, Sequelize.DataTypes)
db.Periode = require("./periode.js")(sequelize, Sequelize.DataTypes)
db.Bank = require("./bank.js")(sequelize, Sequelize.DataTypes)
db.FilePenting = require("./file_penting.js")(sequelize, Sequelize.DataTypes)
db.Lampiran = require("./lampiran.js")(sequelize, Sequelize.DataTypes)
db.Pengumuman = require("./pengumuman.js")(sequelize, Sequelize.DataTypes)


module.exports = db
