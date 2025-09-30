const { Router } = require("express");
const PengumumanController = require("../controllers/pengumuman_controller");
const upload = require("../middlewares/upload");

const routers = Router();

routers.post("/", upload.array("files"), PengumumanController.addOne);
routers.get("/", PengumumanController.getAll);
routers.get("/:id", PengumumanController.getOne);
routers.delete("/:id", PengumumanController.deleteOne);

module.exports = routers;
