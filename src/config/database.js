module.exports = databaseConfig = {
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

