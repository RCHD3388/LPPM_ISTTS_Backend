const dotenv = require('dotenv');
dotenv.config();

const databaseConfig = {
    development: {
        HOST: process.env.MYSQL_DEVELOPMENT_HOST || 'localhost',
        USERNAME: process.env.MYSQL_DEVELOPMENT_USERNAME || 'root',
        PASSWORD: process.env.MYSQL_DEVELOPMENT_PASSWORD || '',
        DATABASE: process.env.MYSQL_DEVELOPMENT_NAME || 'LPPM_ISTTS_DB',
    },
    production: {
        HOST: process.env.MYSQL_PRODUCTION_HOST || 'localhost',
        USERNAME: process.env.MYSQL_PRODUCTION_USERNAME || 'root',
        PASSWORD: process.env.MYSQL_PRODUCTION_PASSWORD || '',
        DATABASE: process.env.MYSQL_PRODUCTION_NAME || 'LPPM_ISTTS_DB',
    },
};

const SIMConnectionDatabaseConfig = {
    development: {
        HOST: process.env.SIM_MYSQL_DEVELOPMENT_HOST || 'localhost',
        USERNAME: process.env.SIM_MYSQL_DEVELOPMENT_USERNAME || 'root',
        PASSWORD: process.env.SIM_MYSQL_DEVELOPMENT_PASSWORD || '',
        DATABASE: process.env.SIM_MYSQL_DEVELOPMENT_NAME || 'SIM_ISTTS_DB',
    },
    production: {
        HOST: process.env.SIM_MYSQL_PRODUCTION_HOST || 'localhost',
        USERNAME: process.env.SIM_MYSQL_PRODUCTION_USERNAME || 'root',
        PASSWORD: process.env.SIM_MYSQL_PRODUCTION_PASSWORD || '',
        DATABASE: process.env.SIM_MYSQL_PRODUCTION_NAME || 'SIM_ISTTS_DB',
    },
};

// Adapter untuk sequelize-cli (format standar)
const sequelizeCLIConfig = {
  development: {
    username: databaseConfig.development.USERNAME,
    password: databaseConfig.development.PASSWORD,
    database: databaseConfig.development.DATABASE,
    host: databaseConfig.development.HOST,
    dialect: 'mysql',
  },
  production: {
    username: databaseConfig.production.USERNAME,
    password: databaseConfig.production.PASSWORD,
    database: databaseConfig.production.DATABASE,
    host: databaseConfig.production.HOST,
    dialect: 'mysql',
  },
}

module.exports = {
  databaseConfig,      // dipakai aplikasi
  SIMConnectionDatabaseConfig,
  ...sequelizeCLIConfig // dipakai sequelize-cli
}