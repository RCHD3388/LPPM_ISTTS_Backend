const { Router } = require("express");
const milisController = require("../controllers/milis_controller");
const { authenticateToken, authorizeRole } = require("./../middlewares/auth_controller");
const upload = require("./../middlewares/upload");

const routers = Router();

routers.post(
  "/",
  authenticateToken,
  authorizeRole('2'),
  milisController.addOne
);

routers.get(
  "/",
  authenticateToken,
  authorizeRole('2'),
  milisController.getAll
);

routers.delete(
  "/:id",
  authenticateToken,
  authorizeRole('2'),
  milisController.deleteOne
);

module.exports = routers;
