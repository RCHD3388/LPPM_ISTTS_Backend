const { Sequelize } = require("sequelize")
const env = require("../config/env.js")
const { SIMConnectionDatabaseConfig } = require("../config/database.js")

const config = SIMConnectionDatabaseConfig[env("APP_ENV") || "development"]
const SIMsequelizeConnection = new Sequelize(
  config.NAME,
  config.USERNAME,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: "mysql",
    logging: false,
  }
)

async function SIMconnectDB() {
  try {
    await SIMsequelizeConnection.authenticate()
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = { SIMsequelizeConnection, SIMconnectDB }

  