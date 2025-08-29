const dotenv = require("dotenv");
dotenv.config({path: "./config.env"})
module.exports = (envname) => {
    return process.env[envname];
}