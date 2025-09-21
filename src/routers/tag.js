const { Router } = require("express");
const TagController = require("../controllers/tag_controller");

const routers = Router();

routers.post("/", TagController.addOne);
routers.put("/:id", TagController.editOne);
routers.get("/:id", TagController.getOneById);
routers.get("/", TagController.getAll);

module.exports = routers;
