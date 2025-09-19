const ApiResponse = require("../utils/ApiResponse");
const HttpStatus = require("../utils/httpStatus");

function globalErrorHandler(err, req, res, next) {
  console.error("❌ Global Error Handler:", err);

  const statusCode = err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR;
  const message = err.message || "Internal Server Error";

  // cek environment
  const isDev = process.env.NODE_ENV === "development";

  const errorResponse = ApiResponse.error(message);

  // kalau development, tambahkan trace error
  if (isDev) {
    errorResponse.trace = err.stack;
  }

  return res.status(statusCode).json(errorResponse);
}

module.exports = globalErrorHandler;
