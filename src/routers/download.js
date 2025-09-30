const { Router } = require("express");
const FilepController = require("../controllers/filep_controller");
const upload = require("../middlewares/upload");
const { FilePenting, Lampiran } = require("../models");
const { JENIS_DOKUMEN } = require("../utils/constants");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");
const fs = require("fs");
const path = require("path");
const mime = require('mime-types'); // ✅ tambahkan ini (npm install mime-types)


const routers = Router();

routers.get("/:id", async (req, res, next) => { // 👈 jangan lupa tambahkan `next` di sini
  try {
    const { id } = req.params;

    // Cari lampiran
    const lampiran = await Lampiran.findOne({
      where: {
        id: id
      }
    });

    if (!lampiran) {
      return next(new ApiError(HttpStatus.NOT_FOUND, "Lampiran tidak ditemukan"));
    }

    const filePath = lampiran.sumber_lampiran;

    // Validasi keamanan: pastikan path tidak mengandung traversal
    const resolvedPath = path.resolve(filePath);
    const uploadDir = path.resolve('./uploads'); // sesuaikan folder upload-mu
    if (!resolvedPath.startsWith(uploadDir)) {
      return next(new ApiError(HttpStatus.FORBIDDEN, "Akses tidak diizinkan"));
    }

    if (!fs.existsSync(resolvedPath)) {
      return next(new ApiError(HttpStatus.NOT_FOUND, "File tidak ditemukan di server"));
    }

    // ✅ Deteksi MIME type berdasarkan ekstensi file
    const mimeType = mime.lookup(resolvedPath) || 'application/octet-stream';
    const fileName = path.basename(resolvedPath);

    // ✅ Set header yang benar
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );

    // ✅ Kirim file
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error("Download error:", error);
    return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Terjadi kesalahan server"));
  }
});

module.exports = routers;
