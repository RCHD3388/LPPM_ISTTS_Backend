const { Router } = require("express");
const ArticleController = require("../controllers/article_controller");

const routers = Router();

routers.get("/", ArticleController.getAllAffiliate);
routers.get("/dosen/:id", ArticleController.getDosen);
// routers.put("/:id", BankController.editOne);
// routers.get("/:id", BankController.getOneById);
// routers.get("/", BankController.getAll);

module.exports = routers;
