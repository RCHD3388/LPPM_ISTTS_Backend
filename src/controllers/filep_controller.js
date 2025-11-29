const { Bank, FilePenting, Tag, Lampiran, sequelize } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");
const paginate = require("../utils/paginate");
const { JENIS_DOKUMEN } = require("../utils/constants");
const { sendNotificationEmail } = require("./../utils/email_service");

const addOne = async (req, res, next) => {
  try {
    const { title, tag, type, link } = req.body;

    let value = "";

    if (type === "file" && req.file) {
      value = `${req.file.path}`;
    } else if (type === "link" && link) {
      value = link;
    }

    // Logic add
    const tagExist = await Tag.findOne({
      where: {
        id: tag,
        status: 1,
      },
    });

    if (!tagExist) {
      return next(ApiError(HttpStatus.NOT_FOUND, "Tag not found or inactive"));
    }

    const transaction = await sequelize.transaction();
    try {

      const filePenting = await FilePenting.create({
        judul: title,
        tag_id: tagExist.id,
      }, { transaction });

      const lampiran = await Lampiran.create({
        name_lampiran: type === "file" ? req.file.originalname : link,
        sumber_lampiran: value,
        jenis_lampiran: type,
        tipe_lampiran: JENIS_DOKUMEN.FILE_PENTING,
        sumber_id: filePenting.id,
      }, { transaction });

      await transaction.commit();

      (async () => {
        try {
          await sendNotificationEmail({
            tipe: "File Penting", // Tipe notifikasi
            judul: title,        // Judul dari req.body
          });
        } catch (emailError) {
          console.error("Gagal mengirim email massal untuk File Penting:", emailError);
        }
      })();

      return res
        .status(HttpStatus.CREATED)
        .json(ApiResponse.success("File penting created successfully", {
          id: filePenting.id,
          judul: filePenting.judul,
          tag: tagExist.name,
          jenis_lampiran: lampiran.jenis_lampiran,
          value: value,
          tanggal: filePenting.tanggal
        }));

    } catch (error) {
      console.error("Transaction error in addOne:", error);
      await transaction.rollback();
      return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to add file penting. Please try again later"));
    }

  } catch (error) {
    console.error("Error in addOne:", error);
    next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Internal upload process failed")); // lempar ke globalErrorHandler
  }
};

const getAll = async (req, res, next) => {
  try {
    // 1. Gunakan paginate untuk ambil FilePenting
    const result = await paginate(
      FilePenting,
      req.query,
      {
        order: [["tanggal", "DESC"]], // urutkan dari terbaru
        // Jika butuh where tambahan, tambahkan di sini
      },
      ["judul"] // field yang bisa dicari
    );

    const filePentings = result.data;
    const meta = result.meta;

    if (filePentings.length === 0) {
      return res.status(HttpStatus.SUCCESS).json(
        ApiResponse.success("No file penting found", [], meta)
      );
    }

    // 2. Kumpulkan ID yang dibutuhkan
    const tagIds = [
      ...new Set(
        filePentings
          .map(fp => fp.tag_id)
          .filter(id => id != null) // hindari null/undefined
      )
    ];
    const fileIds = filePentings.map(fp => fp.id);

    // 3. Ambil Tag dan Lampiran secara paralel (lebih cepat)
    const [tags, lampirans] = await Promise.all([
      Tag.findAll({
        where: {
          id: tagIds,
        },
        raw: true
      }),
      Lampiran.findAll({
        where: {
          sumber_id: fileIds,
          tipe_lampiran: JENIS_DOKUMEN.FILE_PENTING // pastikan ini sesuai nilai sebenarnya
        },
        raw: true
      })
    ]);

    // 4. Buat lookup map
    const tagMap = {};
    tags.forEach(tag => {
      tagMap[tag.id] = tag.name;
    });

    const lampiranMap = {};
    lampirans.forEach(lamp => {
      lampiranMap[lamp.sumber_id] = {
        jenis_lampiran: lamp.jenis_lampiran,
        sumber_lampiran: lamp.sumber_lampiran
      };
    });

    // 5. Format data akhir
    const formattedData = filePentings.map(fp => ({
      id: fp.id,
      judul: fp.judul,
      tag: tagMap[fp.tag_id] || null,
      jenis_lampiran: lampiranMap[fp.id]?.jenis_lampiran || null,
      value: lampiranMap[fp.id]?.sumber_lampiran || null,
      tanggal: fp.tanggal
    }));

    // 6. Kirim respons
    return res.status(HttpStatus.SUCCESS).json(
      ApiResponse.success("File penting retrieved successfully", formattedData, meta)
    );

  } catch (error) {
    console.error("Error in getAll:", error);
    return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve file penting"));
  }
};

module.exports = {
  addOne,
  getAll
};
