const { Router } = require("express");
const DosenController = require("../controllers/dosen_controller");
const { authenticateToken, authorizeRole } = require("../middlewares/auth_controller")
const routers = Router();

routers.use(authenticateToken)

routers.put("/:id", DosenController.updateDosen);
routers.get("/profile/:id", DosenController.getDosenProfile);
routers.get("/all", DosenController.getAll);
// private + lppm only
routers.use(authorizeRole("2"))

routers.get("/", DosenController.getDosenCombobox);
routers.post("/sync", DosenController.syncDataDosen);
routers.get("/:id", DosenController.getDosenById);

module.exports = routers;
