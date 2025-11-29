const env = require("../config/env");
const ApiError = require("../utils/api_error");
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) throw new ApiError(HttpStatus.UNAUTHORIZED, "Anda tidak memiliki otorisasi yang tepat");

  jwt.verify(token, env("JWT_SECRET"), (err, user) => {
    if (err) throw new ApiError(HttpStatus.FORBIDDEN, "Token tidak valid"); // Forbidden (token tidak valid)
    req.user = user; // 'user' adalah payload dari JWT (id, email, role)
    next();
  });
};

const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Pastikan data user sudah ada dari middleware authenticateToken
    if (!req.user || !req.user.role) {
      // Ini adalah kasus error internal jika middleware tidak diatur dengan benar
      throw new ApiError(
        HttpStatus.INTERNAL_SERVER_ERROR, 
        "User role not found. Ensure authenticateToken middleware runs first."
      );
    }

    const userRole = req.user.role;

    // 2. Cek apakah role user termasuk dalam daftar role yang diizinkan
    if (allowedRoles.includes(userRole)) {
      // Jika diizinkan, lanjutkan ke controller/middleware berikutnya
      return next(); 
    } else {
      // Jika tidak diizinkan, lempar error Forbidden
      throw new ApiError(
        HttpStatus.FORBIDDEN, 
        "Access Denied. You do not have permission to access this resource."
      );
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
}