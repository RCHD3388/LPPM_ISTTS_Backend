const app = require("./app");
const { sequelizeConnection, connectDB } = require("./databases/DbConnection");
const { SIMsequelizeConnection, SIMconnectDB } = require("./databases/SimDbConnection");
const env = require("./config/env"); 

const dotenv = require('dotenv');
dotenv.config();

// setup database connection
connectDB();
SIMconnectDB();

// server
const port = env("APP_PORT") || 8000;
const server = app.listen(port, () => {
    console.log(`App running on http://localhost:${port}`);
})


// ======================
// == process handling ==
// ======================
const closeConnection = async () => {
    console.log('SIGINT received. Closing database connection...');
    sequelizeConnection.close();
    SIMsequelizeConnection.close();
    console.log('Database connection closed');
    process.exit(0);
}

process.on('SIGINT', async () => {
    await closeConnection();
});

process.on('SIGTERM', async () => {
    await closeConnection();
});
