const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const { Dosen, SintaScore, Departement } = require("../models");
const { SimDosen, SimKaryawan } = require("../models/simISTTS");
const { Op } = require("sequelize");
const { singularize } = require("sequelize/lib/utils");
const paginate = require("../utils/paginate");

const getDosenCombobox = async (req, res, next) => {
  try {
    const result = await Dosen.findAll()
    const score = await SintaScore.findAll({
      where: {
        sinta_id: {
          [Op.ne]: null
        }
      }
    })

    const comboBoxItem = await Promise.all(
      result.map(async (d) => {
        // Cari score dosen
        const dosen_score = score.find(
          (s) => s.dataValues.sinta_id === d.dataValues.sinta_id
        );

        // Ambil data departemen
        const department = await Departement.findOne({
          where: { id: d?.dataValues?.departemen_id || null },
        });

        // Nama departemen (bisa undefined)
        const deptNama = department?.dataValues?.nama || "-";

        // Buat hasil mapping
        return {
          id: d.dataValues.sinta_id,
          nama_dosen: d.dataValues.name,
          overall_sinta: dosen_score?.dataValues?.overall_score || 0,
          three_year_score: dosen_score?.dataValues?.three_year || 0,
          pp_url: d.dataValues.pp_url || null,
          department: deptNama,
        };
      })
    );

    const filtered = comboBoxItem.filter((data) => data.id != null);

    console.log(filtered);


    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", filtered)
    );
  } catch (error) {
    next(error);
  }
}

const getDosenById = async (req, res, next) => {
  const { id } = req.params
  try {
    const result = await Dosen.findOne({
      where: {
        sinta_id: id
      }
    })
    const score = await SintaScore.findOne({
      where: {
        sinta_id: id
      }
    })

    const final_data = {
      name: result.dataValues.name,
      sintaId: result.dataValues.sinta_id,
      overall_sinta: score.dataValues.overall_score,
      three_year_score: score.dataValues.three_year,
      pp_url: result.dataValues.pp_url
    }
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", final_data)
    );
  } catch (error) {
    next(error);
  }
}

const getAll = async (req, res, next) => {
  try {
    const result = await paginate(
      Dosen,
      req.query,
      {}, // opsional: where, include, dll
      ["name"] // field yang bisa dicari dengan LIKE
    );

    return res.json(
      ApiResponse.success("Dosen retrieved successfully", result.data, result.meta)
    );
  } catch (error) {
    next(error);
  }
}

const syncDataDosen = async (req, res, next) => {
  try {
    const listDosen = await SimDosen.findAll({
      attributes: ["dosenKode", "dosenNamaSk", "karyawanNip", "dosenStatus"],
      where: {
        dosenStatus: {
          [Op.not]: 0,
        },
        karyawanNip: {
          [Op.not]: null,
          [Op.ne]: "",
        },
        dosenNamaSk: {
          [Op.not]: null,
          [Op.ne]: "",
        },
      },
      raw: true,
    });

    if (listDosen.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Tidak ada data dosen aktif yang ditemukan di sumber.",
        data: [],
      });
    }

    const allNips = listDosen.map((dosen) => dosen.karyawanNip);

    const listKaryawan = await SimKaryawan.findAll({
      attributes: ["karyawanNip", "karyawanEmail"],
      where: {
        karyawanNip: {
          [Op.in]: allNips,
        },
        karyawanEmail: {
          [Op.not]: null,
          [Op.ne]: "",
        },
      },
      raw: true,
    });

    const karyawanMap = new Map(
      listKaryawan.map((karyawan) => [karyawan.karyawanNip, karyawan])
    );

    const sourceDosens = [];
    for (const dosen of listDosen) {
      const matchingKaryawan = karyawanMap.get(dosen.karyawanNip);
      if (matchingKaryawan) {
        sourceDosens.push({
          code: dosen.dosenKode,
          email: matchingKaryawan.karyawanEmail,
          name: dosen.dosenNamaSk,
          status: dosen.dosenStatus,
        });
      }
    }

    // --- BAGIAN SINKRONISASI DIMULAI DI SINI ---

    const existingDosens = await Dosen.findAll({ raw: true });
    const existingDosenMap = new Map(
      existingDosens.map((d) => [d.code, d])
    );
    const sourceDosenCodes = new Set(sourceDosens.map((d) => d.code));

    const toCreate = [];
    const toUpdate = [];

    for (const sourceDosen of sourceDosens) {
      const existingDosen = existingDosenMap.get(sourceDosen.code);

      if (!existingDosen) {
        // Data baru, tambahkan ke daftar 'create'
        toCreate.push(sourceDosen);
      } else {
        // Data sudah ada, periksa perubahan
        const payloadToUpdate = {};
        if (sourceDosen.name !== existingDosen.name) payloadToUpdate.name = sourceDosen.name;
        if (sourceDosen.email !== existingDosen.email) payloadToUpdate.email = sourceDosen.email;
        // Selalu update status agar sinkron dengan data sumber
        if (sourceDosen.status !== existingDosen.status) payloadToUpdate.status = sourceDosen.status;

        if (Object.keys(payloadToUpdate).length > 0) {
          toUpdate.push({
            code: sourceDosen.code,
            payload: payloadToUpdate,
          });
        }
      }
    }

    // Identifikasi dosen yang harus dinonaktifkan
    const codesToDeactivate = existingDosens
      .filter((d) => !sourceDosenCodes.has(d.code) && d.status !== 0)
      .map((d) => d.code);

    // Jalankan semua operasi database dalam satu transaksi
    const transaction = await Dosen.sequelize.transaction();
    try {
      if (toCreate.length > 0) {
        await Dosen.bulkCreate(toCreate, { transaction });
      }

      if (toUpdate.length > 0) {
        await Promise.all(
          toUpdate.map((item) =>
            Dosen.update(item.payload, {
              where: { code: item.code },
              transaction, // <<-- KUNCI PERBAIKAN DI SINI
            })
          )
        );
      }

      if (codesToDeactivate.length > 0) {
        await Dosen.update(
          { status: 0 },
          { where: { code: { [Op.in]: codesToDeactivate } }, transaction }
        );
      }

      // ----- add template -----
      const specialKALPPMDosenCode = "AAAA";
      const specialDosenCode = "BBBB";
      await Dosen.destroy({
        where: { code: specialDosenCode },
        transaction,
      });
      await Dosen.destroy({
        where: { code: specialKALPPMDosenCode },
        transaction,
      });
      await Dosen.create({
        code: specialKALPPMDosenCode,
        name: "Richard Rafer Guy",
        email: "richard.r22@mhs.istts.ac.id",
        role_id: '2', // Sesuai model, role_id adalah STRING
        status: 1,
      }, { transaction });
      await Dosen.create({
        code: specialDosenCode,
        name: "Rafer",
        email: "rraferg33@gmail.com",
        role_id: '1', // Sesuai model, role_id adalah STRING
        status: 1,
      }, { transaction });
      // ----- add template -----

      await transaction.commit();
    } catch (dbError) {
      await transaction.rollback();
      throw dbError; // Lempar error database agar ditangkap oleh catch utama
    }

    res.status(200)
      .json(ApiResponse.success("Data dosen berhasil disinkronisasi", {
        created: toCreate.length,
        updated: toUpdate.length,
        deactivated: codesToDeactivate.length,
      }));

  } catch (error) {
    next(error);
  }
};

const updateDosen = async (req, res, next) => {
  try {
    // 1. Ambil data dari request
    const { id: targetDosenId } = req.params;
    const updateData = req.body;
    const requestingUser = req.user; // Data dari middleware authenticateToken

    // 2. Cari dosen yang akan di-update di database
    const dosenToUpdate = await Dosen.findByPk(targetDosenId);
    if (!dosenToUpdate) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Data dosen dengan ID tersebut tidak ditemukan.");
    }

    const payloadToUpdate = {};
    let isUpdateAllowed = false;

    // --- LOGIKA OTORISASI ---

    // KASUS 1: Ka LPPM (role '2') mengubah role dosen lain (atau diri sendiri)
    // Mereka HANYA boleh mengubah 'role_id'
    if (requestingUser.role === '2' && updateData.role_id !== undefined) {
        isUpdateAllowed = true;
        // Hanya ambil 'role_id' dari body, abaikan yang lain
        payloadToUpdate.role_id = updateData.role_id;
    }
    
    // KASUS 2: Pengguna (role apapun) mengubah data dirinya sendiri
    if (String(requestingUser.id) === String(targetDosenId)) {
        isUpdateAllowed = true;
        
        // Daftar field yang boleh diubah oleh diri sendiri
        const allowedSelfUpdateFields = ['sinta_id', 'bank_id', 'account_no', 'account_name'];

        // Filter data yang masuk, hanya ambil yang diizinkan
        for (const field of allowedSelfUpdateFields) {
            if (updateData[field] !== undefined) {
                payloadToUpdate[field] = updateData[field];
            }
        }
    }

    // 3. Validasi akhir sebelum eksekusi
    if (!isUpdateAllowed) {
      throw new ApiError(HttpStatus.FORBIDDEN, "Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.");
    }

    if (Object.keys(payloadToUpdate).length === 0) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Tidak ada data valid yang dikirimkan untuk diperbarui. Pastikan Anda mengirim field yang benar.");
    }

    // 4. Lakukan update ke database
    await dosenToUpdate.update(payloadToUpdate);

    // 5. Kirim respons sukses
    res.status(HttpStatus.SUCCESS).json(
        ApiResponse.success("Data dosen berhasil diperbarui.", dosenToUpdate)
    );

  } catch (error) {
    next(error);
  }
};

const getDosenProfile = async (req, res, next) => {
  try {
    const { id: targetDosenId } = req.params; 
    const requestingUser = req.user;

    if (String(requestingUser.id) !== String(targetDosenId)) {
      throw new ApiError(
        HttpStatus.FORBIDDEN, 
        "Akses ditolak. Anda hanya dapat melihat profil Anda sendiri."
      );
    }

    const dosenProfile = await Dosen.findByPk(targetDosenId);
    if (!dosenProfile) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Profil dosen tidak ditemukan.");
    }
    res.status(HttpStatus.SUCCESS).json(
      ApiResponse.success("Profil dosen berhasil diambil.", dosenProfile)
    );
    
  } catch (error) {
    next(error);
  }
}; 

module.exports = {
  getDosenCombobox,
  getDosenById,
  getAll,
  syncDataDosen,
  updateDosen,
  getDosenProfile
};