const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");
const { Op } = require("sequelize");
const { Proposal, Dosen, Periode, Tag, Lampiran, ProposalDosen, sequelize, Persetujuan } = require("../models");
const { JENIS_DOKUMEN, STATUS_PROPOSAL_LAPORAN } = require("../utils/constants");

const addProposal = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    // 1. Ekstraksi dan Validasi Input Awal
    const { judul, jenis_proposal, periode_id, tag_id, dana_diajukan } = req.body;
    let { kontributor_ids } = req.body; // Array ID dosen kontributor
    const leader = req.user; // User yang login (dari middleware authenticateToken)
    const file = req.file;

    if (!file) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Berkas proposal wajib diunggah.");
    }
    if (!judul || !jenis_proposal || !periode_id || !tag_id || !dana_diajukan) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Semua field wajib diisi: judul, jenis, periode, tag, dan dana.");
    }
    if (isNaN(dana_diajukan) || Number(dana_diajukan) < 0) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Dana yang diajukan harus bernilai angka dan minimal 0.");
    }
    
    // Handle jika kontributor_ids dikirim sebagai string JSON dari form-data
    if (typeof kontributor_ids === 'string') {
      try {
        kontributor_ids = JSON.parse(kontributor_ids);
      } catch (e) {
        throw new ApiError(HttpStatus.BAD_REQUEST, "Format daftar kontributor tidak valid.");
      }
    } else if (!Array.isArray(kontributor_ids)) {
        kontributor_ids = []; // Default ke array kosong jika tidak ada
    }

    // 2. Validasi Dependensi (Periode, Tag, Dosen)
    const [periode, tag] = await Promise.all([
      Periode.findByPk(periode_id, { transaction }),
      Tag.findByPk(tag_id, { transaction })
    ]);

    if (!periode) throw new ApiError(HttpStatus.NOT_FOUND, "Periode yang dipilih tidak valid.");
    if (!tag) throw new ApiError(HttpStatus.NOT_FOUND, "Tag yang dipilih tidak valid.");

    const allDosenIds = [...new Set([...kontributor_ids, leader.id])]; // Gabungkan & hilangkan duplikat
    const foundDosens = await Dosen.findAll({
      where: { id: { [Op.in]: allDosenIds } },
      attributes: ['id'],
      transaction
    });

    if (foundDosens.length !== allDosenIds.length) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Satu atau lebih ID dosen kontributor tidak ditemukan.");
    }

    // 3. Buat entri Proposal
    const newProposal = await Proposal.create({
      judul,
      jenis_proposal,
      periode_id,
      tag_id,
      dana_diajukan: Number(dana_diajukan),
      status: STATUS_PROPOSAL_LAPORAN.MENUNGGU,
    }, { transaction });

    // 4. Buat entri Lampiran untuk berkas proposal
    const lampiranProposal = await Lampiran.create({
      name_lampiran: file.originalname,
      sumber_lampiran: file.path,
      jenis_lampiran: 'file', // Tipe sumbernya adalah file upload
      tipe_lampiran: JENIS_DOKUMEN.PROPOSAL,
      sumber_id: newProposal.id,
    }, { transaction });

    // 5. Update proposal dengan ID lampiran yang baru dibuat
    await newProposal.update({ berkas_proposal: lampiranProposal.id }, { transaction });

    // 6. Siapkan dan buat entri ProposalDosen (bulk create)
    const proposalDosenData = kontributor_ids
      .filter(id => id !== leader.id) // Pastikan leader tidak terduplikasi
      .map(dosenId => ({
        proposal_id: newProposal.id,
        dosen_id: dosenId,
        status_kontributor: 'Kontributor'
      }));
    
    // Tambahkan leader
    proposalDosenData.push({
      proposal_id: newProposal.id,
      dosen_id: leader.id,
      status_kontributor: 'Leader'
    });
    
    await ProposalDosen.bulkCreate(proposalDosenData, { transaction });

    // 7. Commit transaksi jika semua berhasil
    await transaction.commit();

    res.status(HttpStatus.CREATED).json(
      ApiResponse.success("Proposal berhasil diajukan.", {
        id: newProposal.id,
        judul: newProposal.judul,
      })
    );

  } catch (error) {
    await transaction.rollback();
    next(error); // Lempar ke global error handler
  }
};

const getAllProposals = async (req, res, next) => {
  try {
    const user = req.user;
    let proposalIdsFilter = {};

    // 1. FILTER AWAL: Tentukan proposal mana yang boleh dilihat user
    if (user.role === '1') { // Role Dosen
      const userProposals = await ProposalDosen.findAll({
        where: { dosen_id: user.id },
        attributes: ['proposal_id'],
        raw: true,
      });
      const ids = userProposals.map(p => p.proposal_id);
      if (ids.length === 0) {
        return res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Tidak ada proposal yang ditemukan.", []));
      }
      proposalIdsFilter = { id: { [Op.in]: ids } };
    }
    // Jika user.role === '2' (Ka LPPM), proposalIdsFilter tetap kosong, artinya ambil semua.

    const baseProposals = await Proposal.findAll({
      where: proposalIdsFilter,
      order: [['createdAt', 'DESC']],
      raw: true,
    });

    if (baseProposals.length === 0) {
      return res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Tidak ada proposal yang ditemukan.", []));
    }

    // 2. KUMPULKAN SEMUA ID TERKAIT
    const proposalIds = baseProposals.map(p => p.id);
    const periodeIds = [...new Set(baseProposals.map(p => p.periode_id))];
    const tagIds = [...new Set(baseProposals.map(p => p.tag_id))];
    const berkasLampiranIds = [...new Set(baseProposals.map(p => p.berkas_proposal).filter(id => id))];
    const persetujuanIds = [...new Set(baseProposals.map(p => p.persetujuan_id).filter(id => id))];

    // 3. AMBIL SEMUA DATA TERKAIT SECARA MASSAL
    const [periodes, tags, proposalDosens, berkasLampirans, persetujuans] = await Promise.all([
      Periode.findAll({ where: { id: { [Op.in]: periodeIds } }, raw: true }),
      Tag.findAll({ where: { id: { [Op.in]: tagIds } }, raw: true }),
      ProposalDosen.findAll({ where: { proposal_id: { [Op.in]: proposalIds } }, raw: true }),
      Lampiran.findAll({ where: { id: { [Op.in]: berkasLampiranIds } }, raw: true }),
      Persetujuan.findAll({ where: { id: { [Op.in]: persetujuanIds } }, raw: true })
    ]);
    
    // Ambil data dosen & lampiran yang terkait dengan persetujuan & kontributor
    const allDosenIds = [...new Set(proposalDosens.map(pd => pd.dosen_id).concat(persetujuans.map(p => p.dosen_id)))];
    const allLampiranPersetujuanIds = [...new Set(persetujuans.map(p => p.lampiran_id))];
    
    const [allDosens, allLampiranPersetujuan] = await Promise.all([
        Dosen.findAll({ where: { id: { [Op.in]: allDosenIds } }, attributes: ['id', 'code', 'name'], raw: true }),
        Lampiran.findAll({ where: { id: { [Op.in]: allLampiranPersetujuanIds } }, raw: true }),
    ]);

    // 4. BUAT PETA (MAP) UNTUK PENCARIAN CEPAT
    const periodeMap = new Map(periodes.map(p => [p.id, p]));
    const tagMap = new Map(tags.map(t => [t.id, t]));
    const berkasLampiranMap = new Map(berkasLampirans.map(l => [l.id, l]));
    const dosenMap = new Map(allDosens.map(d => [d.id, d]));
    const lampiranPersetujuanMap = new Map(allLampiranPersetujuan.map(l => [l.id, l]));

    const contributorsMap = new Map();
    proposalDosens.forEach(pd => {
      if (!contributorsMap.has(pd.proposal_id)) {
        contributorsMap.set(pd.proposal_id, []);
      }
      const dosen = dosenMap.get(pd.dosen_id);
      if (dosen) {
        contributorsMap.get(pd.proposal_id).push({ ...dosen, status_kontributor: pd.status_kontributor });
      }
    });

    // 5. RAKIT RESPONS AKHIR
    const finalResult = baseProposals.map(proposal => {
      const periode = periodeMap.get(proposal.periode_id) || null;
      const tag = tagMap.get(proposal.tag_id) || null;
      const persetujuanData = persetujuans.find(p => p.id === proposal.persetujuan_id) || null;
      
      let persetujuan = null;
      if (persetujuanData) {
          const dosenPersetujuan = dosenMap.get(persetujuanData.dosen_id) || null;
          const lampiranPersetujuan = lampiranPersetujuanMap.get(persetujuanData.lampiran_id) || null;
          persetujuan = {
              id: persetujuanData.id,
              tipe: persetujuanData.tipe,
              dosen: dosenPersetujuan ? { id: dosenPersetujuan.id, code: dosenPersetujuan.code, name: dosenPersetujuan.name } : null,
              berkas_lampiran: lampiranPersetujuan ? lampiranPersetujuan.sumber_lampiran : null
          };
      }

      return {
        id: proposal.id,
        judul: proposal.judul,
        jenis_proposal: proposal.jenis_proposal,
        periode: periode ? { id: periode.id, name: periode.name } : null,
        tag: tag ? { id: tag.id, name: tag.name } : null,
        kontributor: contributorsMap.get(proposal.id) || [],
        dana_diajukan: proposal.dana_diajukan,
        dana_disetujui: proposal.dana_disetujui,
        status: proposal.status,
        berkas_proposal: berkasLampiranMap.get(proposal.berkas_proposal)?.sumber_lampiran || null,
        persetujuan: persetujuan
      };
    });

    res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Data proposal berhasil diambil.", finalResult));

  } catch (error) {
    next(error);
  }
};

module.exports = {
    addProposal,
    getAllProposals
};
