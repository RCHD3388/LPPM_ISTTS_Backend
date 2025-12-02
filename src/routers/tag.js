const { Router } = require("express");
const TagController = require("../controllers/tag_controller");
const { authenticateToken, authorizeRole } = require("../middlewares/auth_controller");

const routers = Router();

routers.post("/", authenticateToken, authorizeRole("2"), TagController.addOne);
routers.put("/:id", authenticateToken, authorizeRole("2"), TagController.editOne);
routers.get("/:id", TagController.getOneById);
routers.get("/", TagController.getAll);

module.exports = routers;
