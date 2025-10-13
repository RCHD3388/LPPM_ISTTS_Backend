const { Router } = require("express");
const ScoreController = require("../controllers/sinta_score_controller");

const routers = Router();

routers.get("/", ScoreController.getGraphHomepage);
routers.get("/dosen/:id",ScoreController.getGraphDosen)
routers.get("/affiliate",ScoreController.getAffiliateScore)



module.exports = routers;
