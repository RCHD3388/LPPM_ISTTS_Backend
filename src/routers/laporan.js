const { Router } = require("express");
const laporanController = require("../controllers/laporan_controller");
const { authenticateToken, authorizeRole } = require("./../middlewares/auth_controller");
const upload = require("./../middlewares/upload");

const routers = Router();

routers.get("/required", 
    authenticateToken,
    authorizeRole("1", "2"),
    laporanController.getAllRequiredProposals);

routers.post(
  "/:id/respond",
  authenticateToken,
  authorizeRole('2'), // HANYA role '2' (Ka LPPM) yang bisa mengakses
  upload.single("lampiran"), // 'lampiran' adalah nama field opsional untuk file
  laporanController.respondToLaporan
);

module.exports = routers;
