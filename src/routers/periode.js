const { Router } = require("express");
const PeriodeController = require("../controllers/periode_controller");
const { authenticateToken, authorizeRole } = require("../middlewares/auth_controller");

const routers = Router();

routers.post("/", authenticateToken, authorizeRole("2"),PeriodeController.addOne);
routers.put("/:id", authenticateToken, authorizeRole("2"), PeriodeController.editOne);
routers.get("/:id", PeriodeController.getOneById);
routers.get("/", PeriodeController.getAll);

module.exports = routers;
