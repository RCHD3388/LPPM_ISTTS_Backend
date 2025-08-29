const { Sequelize } = require("sequelize")
const env = require("../config/env.js")
const database = require("../config/database.js")

const databaseConfig = database[env("APP_ENV") || "development"]
const sequelizeConnection = new Sequelize(
  databaseConfig.NAME,
  databaseConfig.USERNAME,
  databaseConfig.PASSWORD,
  {
    host: databaseConfig.HOST,
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

  