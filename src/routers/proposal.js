const { Router } = require("express");
const proposalController = require("../controllers/proposal_controller");
const { authenticateToken, authorizeRole } = require("./../middlewares/auth_controller");
const upload = require("./../middlewares/upload");

const routers = Router();

routers.get("/", 
    authenticateToken,
    authorizeRole("1", "2"),
    proposalController.getAllProposals);
// routers.get("/:id", proposalController.getOne);
routers.post("/", 
    authenticateToken,
    authorizeRole("1", "2"),
    upload.single("berkas_proposal"),
    proposalController.addProposal);
// routers.put("/:id", proposalController.editOne);
// routers.delete("/:id", proposalController.deleteOne);

module.exports = routers;
