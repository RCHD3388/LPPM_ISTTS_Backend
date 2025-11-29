const { Router } = require("express");
const DosenController = require("../controllers/dosen_controller");
const { authenticateToken, authorizeRole } = require("../middlewares/auth_controller")
const routers = Router();

routers.use(authenticateToken)

routers.put("/:id", DosenController.updateDosen);
routers.get("/profile/:id", DosenController.getDosenProfile);

// private + lppm only
routers.use(authorizeRole("2"))

routers.get("/", DosenController.getDosenCombobox);
routers.post("/sync", DosenController.syncDataDosen);
routers.get("/all", DosenController.getAll);
routers.get("/:id", DosenController.getDosenById);

module.exports = routers;
