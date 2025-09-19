const { Sequelize } = require("sequelize")
const env = require("../config/env.js")
const { databaseConfig } = require("../config/database.js")

const config = databaseConfig[env("APP_ENV") || "development"]
const sequelizeConnection = new Sequelize(
  config.NAME,
  config.USERNAME,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: "mysql",
    logging: false,
  }
)

async function connectDB() {
  try {
    await sequelizeConnection.authenticate()
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
}

module.exports = { sequelizeConnection, connectDB }

  