const { Router } = require("express");
const BankController = require("../controllers/bank_controller");

const routers = Router();

routers.post("/", authenticateToken, authorizeRole("2"), BankController.addOne);
routers.put("/:id", authenticateToken, authorizeRole("2"), BankController.editOne);
routers.get("/:id", BankController.getOneById);
routers.get("/", BankController.getAll);

module.exports = routers;
