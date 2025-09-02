const express = require("express")
const routers = require("./routers")
const path = require("path")
const helmet = require("helmet")
const morgan = require("morgan")
const rateLimit = require('express-rate-limit');
const cookieParser = require("cookie-parser")
const cors = require("cors")
const env = require("./config/env")

const app = express();

// Use a conservative rate limit (adjust as needed)
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false
}));

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