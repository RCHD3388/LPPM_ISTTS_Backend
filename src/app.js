const express = require("express")
const routers = require("./routers")
const path = require("path")
const helmet = require("helmet")
const morgan = require("morgan")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const env = require("./config/env")

const app = express();

app.use(express.static(path.join(__dirname, '/public')));

// serving static files
app.use(express.static(path.join(__dirname, '/public')));

// using security HTTP Header
app.use(helmet());

// body and cookie parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// set development logging
if (env("APP_ENV") === 'development') {
    app.use(morgan("dev"));
}

app.use(cors());

app.use("/api/v1", routers);

module.exports = app;