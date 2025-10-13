const { Router } = require("express");
const DosenController = require("../controllers/dosen_controller");

const routers = Router();

routers.get("/", DosenController.getDosenCombobox);
routers.get("/:id", DosenController.getDosenById);



module.exports = routers;
