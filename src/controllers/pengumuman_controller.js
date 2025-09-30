const { Bank, FilePenting, Tag, Lampiran, sequelize, Pengumuman } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");
const paginate = require("../utils/paginate");
const { JENIS_DOKUMEN } = require("../utils/constants");

const addOne = async (req, res, next) => {
  try {
    const { title, tag, body, links = [] } = req.body; // links: array of URLs

    // Validasi minimal ada file atau link
    const hasFiles = req.files && req.files.length > 0;
    const hasLinks = Array.isArray(links) && links.length > 0;

    console.log(links)
    console.log(req.files)

    if (!hasFiles && !hasLinks) {
      return next(new ApiError(HttpStatus.BAD_REQUEST, "Harus ada minimal 1 file atau 1 link"));
    }

    // Cari tag
    const tagExist = await Tag.findOne({
      where: { id: tag, status: '1' }
    });
    if (!tagExist) {
      return next(new ApiError(HttpStatus.NOT_FOUND, "Tag tidak ditemukan atau tidak aktif"));
    }

    const transaction = await sequelize.transaction();
    try {
      // Buat Pengumuman (bisa pakai model Pengumuman atau FilePenting dengan tipe 'pengumuman')
      // Asumsi: kamu punya model Pengumuman terpisah
      const pengumuman = await Pengumuman.create({
        judul: title,
        isi: body,
        jumlah_lampiran: (hasFiles ? req.files.length : 0) + (hasLinks ? links.length : 0),
        tag_id: tagExist.id,
      }, { transaction });

      const lampiranPromises = [];

      // 1. Tambahkan semua file yang diupload
      if (hasFiles) {
        req.files.forEach(file => {
          lampiranPromises.push(
            Lampiran.create({
              name_lampiran: file.originalname,
              sumber_lampiran: file.path,
              jenis_lampiran: "file",
              tipe_lampiran: JENIS_DOKUMEN.PENGUMUMAN, // pastikan konstanta ada
              sumber_id: pengumuman.id,
            }, { transaction })
          );
        });
      }

      // 2. Tambahkan semua link
      if (hasLinks) {
        links.forEach(link => {
          if (typeof link === 'string' && link.trim()) {
            lampiranPromises.push(
              Lampiran.create({
                name_lampiran: link, // atau beri judul default
                sumber_lampiran: link,
                jenis_lampiran: "link",
                tipe_lampiran: JENIS_DOKUMEN.PENGUMUMAN,
                sumber_id: pengumuman.id,
              }, { transaction })
            );
          }
        });
      }

      await Promise.all(lampiranPromises);
      await transaction.commit();

      // Respons
      return res.status(HttpStatus.CREATED).json(
        ApiResponse.success("Pengumuman berhasil dibuat", {
          id: pengumuman.id,
          judul: pengumuman.judul,
          isi: pengumuman.isi,
          tag: tagExist.nama,
          jumlah_lampiran: pengumuman.jumlah_lampiran,
          tanggal: pengumuman.tanggal
        })
      );

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error("Error in Pengumuman addOne:", error);
    return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal membuat pengumuman"));
  }
};

const getAll = async (req, res, next) => {
  try {
    // 1. Gunakan paginate untuk ambil FilePenting
    const result = await paginate(
      Pengumuman,
      req.query,
      {
        order: [["tanggal", "DESC"]], // urutkan dari terbaru
        // Jika butuh where tambahan, tambahkan di sini
      },
      ["judul"] // field yang bisa dicari
    );

    const pengumumans = result.data;
    const meta = result.meta;

    if (pengumumans.length === 0) {
      return res.status(HttpStatus.SUCCESS).json(
        ApiResponse.success("No file penting found", [], meta)
      );
    }

    // 2. Kumpulkan ID yang dibutuhkan
    const tagIds = [
      ...new Set(
        pengumumans
          .map(fp => fp.tag_id)
          .filter(id => id != null) // hindari null/undefined
      )
    ];
    const fileIds = pengumumans.map(fp => fp.id);

    // 3. Ambil Tag dan Lampiran secara paralel (lebih cepat)
    const [tags] = await Promise.all([
      Tag.findAll({
        where: {
          id: tagIds,
        },
        raw: true
      })
    ]);

    // 4. Buat lookup map
    const tagMap = {};
    tags.forEach(tag => {
      tagMap[tag.id] = tag.name;
    });

    // 5. Format data akhir
    const formattedData = pengumumans.map(fp => ({
      id: fp.id,
      judul: fp.judul,
      isi: fp.isi,
      tag: tagMap[fp.tag_id] || null,
      jumlah_lampiran: fp.jumlah_lampiran,
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


const getOne = async (req, res, next) => {
  const { id } = req.params;
  try {

    const pengumuman = await Pengumuman.findOne({
      where: { id },
    });

    if (!pengumuman) {
      return next(ApiError(HttpStatus.NOT_FOUND, "Pengumuman not found"));
    }

    const tag = await Tag.findOne({
      where: { id: pengumuman.tag_id },
    });

    const lampirans = await Lampiran.findAll({
      where: { sumber_id: pengumuman.id },
    });

    const formattedData = {
      id: pengumuman.id,
      judul: pengumuman.judul,
      isi: pengumuman.isi,
      tag: tag ? tag.name : "",
      jumlah_lampiran: pengumuman.jumlah_lampiran,
      tanggal: pengumuman.tanggal,
      lampirans: lampirans.map(lamp => ({
        id: lamp.id,
        name_lampiran: lamp.name_lampiran,
        sumber_lampiran: lamp.sumber_lampiran,
        jenis_lampiran: lamp.jenis_lampiran,
      }))
    }

    // 6. Kirim respons
    return res.status(HttpStatus.SUCCESS).json(
      ApiResponse.success("File penting retrieved successfully", formattedData)
    );

  } catch (error) {
    return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to retrieve file penting"));
  }
};

const deleteOne = async (req, res, next) => {
  const { id } = req.params;

  try {
    const pengumuman = await Pengumuman.findOne({
      where: { id }
    });

    if (!pengumuman) {
      return next(new ApiError(HttpStatus.NOT_FOUND, "Pengumuman tidak ditemukan"));
    }

    const transaction = await sequelize.transaction();

    try {
      // 1. Delete lampiran yang sumbernya adalah pengumuman itu
      await Lampiran.destroy({
        where: {
          sumber_id: id
        },
        transaction
      });

      // 2. Delete pengumuman itu
      await Pengumuman.destroy({
        where: { id },
        transaction
      });

      await transaction.commit();

      return res.status(HttpStatus.SUCCESS).json(
        ApiResponse.success("Berhasil menghapus pengumuman")
      );

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    return next(new ApiError(HttpStatus.INTERNAL_SERVER_ERROR, "Gagal menghapus pengumuman"));
  }
};

module.exports = {
  addOne,
  getAll,
  getOne,
  deleteOne
};
