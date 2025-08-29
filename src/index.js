const app = require("./app");
const { seqelizeConnection, connectDB } = require("./databases/DbConnection");
const env = require("./config/env"); 

// setup database connection
connectDB();

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
    seqelizeConnection.close();
    console.log('Database connection closed');
    process.exit(0);
}

process.on('SIGINT', async () => {
    await closeConnection();
});

process.on('SIGTERM', async () => {
    await closeConnection();
});
