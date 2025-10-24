const { Router } = require("express");
const ResearchController = require("../controllers/sinta_research_controller");

const routers = Router();

routers.get("/", ResearchController.getResearch);



module.exports = routers;
