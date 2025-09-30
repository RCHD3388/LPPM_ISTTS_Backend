const { Router } = require("express");
const FilepController = require("../controllers/filep_controller");
const upload = require("../middlewares/upload");

const routers = Router();

routers.post("/", upload.single("file"), FilepController.addOne);
routers.get("/", FilepController.getAll);

module.exports = routers;
