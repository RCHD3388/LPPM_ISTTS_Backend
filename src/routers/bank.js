const { Router } = require("express");
const BankController = require("../controllers/bank_controller");

const routers = Router();

routers.post("/", BankController.addOne);
routers.put("/:id", BankController.editOne);
routers.get("/:id", BankController.getOneById);
routers.get("/", BankController.getAll);

module.exports = routers;
