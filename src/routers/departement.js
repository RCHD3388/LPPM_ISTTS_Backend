const { Router } = require("express");
const DepartementController = require("../controllers/departement_controller");

const routers = Router();

routers.get("/", DepartementController.getAllDept);

module.exports = routers;
