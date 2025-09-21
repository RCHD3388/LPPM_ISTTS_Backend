const { Router } = require("express");
const PeriodeController = require("../controllers/periode_controller");

const routers = Router();

routers.post("/", PeriodeController.addOne);
routers.put("/:id", PeriodeController.editOne);
routers.get("/:id", PeriodeController.getOneById);
routers.get("/", PeriodeController.getAll);

module.exports = routers;
