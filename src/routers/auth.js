const { Router } = require("express");
const AuthController = require("../controllers/auth_controller");

const routers = Router();

routers.post("/google-login", AuthController.googleLoginController);


module.exports = routers;
