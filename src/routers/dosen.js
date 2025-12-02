const { Router } = require("express");
const DosenController = require("../controllers/dosen_controller");
const { authenticateToken, authorizeRole } = require("../middlewares/auth_controller")
const routers = Router();

routers.put("/:id", authenticateToken, DosenController.updateDosen);
routers.get("/profile/:id", DosenController.getDosenProfile);
routers.get("/all", authenticateToken, DosenController.getAll);


routers.get("/", DosenController.getDosenCombobox);
routers.post("/sync", authenticateToken, authorizeRole("2"), DosenController.syncDataDosen);
routers.get("/:id", DosenController.getDosenById);

module.exports = routers;