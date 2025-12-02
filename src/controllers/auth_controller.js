const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const jwt = require('jsonwebtoken');
const { Dosen } = require("../models");
const env = require("../config/env");
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(env("GOOGLE_CLIENT_ID"));

async function verifyGoogleToken(token) {
    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload; // Mengandung email, name, sub, dll.
}

const googleLoginController = async (req, res, next) => {
    const { token } = req.body;
    try {
        const googlePayload = await verifyGoogleToken(token);
        const userEmail = googlePayload.email;

        console.log(userEmail)
        const dosen = await Dosen.findOne({ where: { email: userEmail, status: 1 } });
        if (!dosen) {
            throw new ApiError(HttpStatus.NOT_FOUND, 
                "Akses ditolak. Email tidak terdaftar atau tidak aktif.")
        }
        const appToken = jwt.sign(
            { id: dosen.id, email: dosen.email, role: dosen.role_id, name: dosen.name },
            env("JWT_SECRET"),
            { expiresIn: env("JWT_EXPIRATION") || "7d" } 
        );
        return res
            .status(HttpStatus.CREATED)
            .json(ApiResponse.success("Login Berhasil", {
                id: dosen.id,
                token: appToken,
                code: dosen.code,
                name: dosen.name,
                role_id: dosen.role_id,
                email: dosen.email
            }));
    } catch (error) {
        next(error)
    }
}

module.exports = {
    googleLoginController
};