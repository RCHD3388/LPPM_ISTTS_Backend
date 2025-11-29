const dotenv = require("dotenv");
dotenv.config({path: "./.env"})
module.exports = (envname) => {
    return process.env[envname];
}