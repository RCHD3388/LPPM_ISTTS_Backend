const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");
const { Op } = require("sequelize");
const { Proposal, Dosen, Periode, Tag, Lampiran, ProposalDosen, sequelize, Persetujuan, Laporan } = require("../models");
const { JENIS_DOKUMEN, STATUS_PROPOSAL_LAPORAN, TIPE_PERSETUJUAN } = require("./../utils/constants");


const getAllRequiredProposals = async (req, res, next) => {
  try {
    const user = req.user;

    // --- LANGKAH 1: IDENTIFIKASI PROPOSAL YANG SUDAH MEMILIKI LAPORAN DISETUJUI ---
    // Kita akan mengecualikan proposal-proposal ini dari hasil akhir.
    const approvedReports = await Laporan.findAll({
      where: { status: STATUS_PROPOSAL_LAPORAN.DISETUJUI },
      attributes: ['proposal_id'],
      raw: true,
    });
    const proposalIdsWithApprovedReport = approvedReports.map(r => r.proposal_id);

    // --- LANGKAH 2: IDENTIFIKASI PERSETUJUAN YANG MEMBUTUHKAN LAPORAN ---
    const requiredApprovals = await Persetujuan.findAll({
      where: { tipe: TIPE_PERSETUJUAN.DISETUJUI_LAPORAN },
      attributes: ['id'],
      raw: true,
    });
    const persetujuanIdsRequiringReport = requiredApprovals.map(p => p.id);

    // --- LANGKAH 3: BANGUN KLAUSA WHERE UTAMA ---
    const whereClause = {
      // Kriteria 1: Proposal harus berstatus 'DISETUJUI'
      status: STATUS_PROPOSAL_LAPORAN.DISETUJUI,
      // Kriteria 2: Tipe persetujuannya harus 'DISETUJUI_LAPORAN'
      persetujuan_id: { [Op.in]: persetujuanIdsRequiringReport },
      // Kriteria 3: ID proposal TIDAK BOLEH ada di daftar yang sudah punya laporan disetujui
      id: { [Op.notIn]: proposalIdsWithApprovedReport },
    };

    // --- LANGKAH 4: TERAPKAN FILTER ROLE-BASED ACCESS CONTROL (RBAC) ---
    if (user.role === '1') { // Role Dosen
      const userProposals = await ProposalDosen.findAll({
        where: { dosen_id: user.id },
        attributes: ['proposal_id'],
        raw: true,
      });
      const userProposalIds = userProposals.map(p => p.proposal_id);

      // Jika Dosen tidak punya proposal sama sekali, kembalikan array kosong
      if (userProposalIds.length === 0) {
        return res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Tidak ada proposal yang memerlukan laporan.", []));
      }

      // Gabungkan filter RBAC dengan filter kriteria utama
      whereClause.id = {
        [Op.in]: userProposalIds, // Harus proposal milik user
        [Op.notIn]: proposalIdsWithApprovedReport // dan belum punya laporan
      };
    }
    // Jika role '2' (Ka LPPM), whereClause tidak perlu diubah lagi

    // --- LANGKAH 5: AMBIL DATA PROPOSAL YANG SUDAH TERFILTER ---
    const baseProposals = await Proposal.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      raw: true,
    });

    if (baseProposals.length === 0) {
      return res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Tidak ada proposal yang memerlukan laporan.", []));
    }

    // --- LANGKAH 6: KUMPULKAN ID & RAKIT DATA (SAMA SEPERTI getAllProposals) ---
    // Proses ini tetap sama karena kita hanya mengubah cara memfilter 'baseProposals'
    const proposalIds = baseProposals.map(p => p.id);
    const periodeIds = [...new Set(baseProposals.map(p => p.periode_id))];
    const tagIds = [...new Set(baseProposals.map(p => p.tag_id))];
    const berkasLampiranIds = [...new Set(baseProposals.map(p => p.berkas_proposal).filter(id => id))];
    const persetujuanIds = [...new Set(baseProposals.map(p => p.persetujuan_id).filter(id => id))];

    const [periodes, tags, proposalDosens, berkasLampirans, persetujuans] = await Promise.all([
      Periode.findAll({ where: { id: { [Op.in]: periodeIds } }, raw: true }),
      Tag.findAll({ where: { id: { [Op.in]: tagIds } }, raw: true }),
      ProposalDosen.findAll({ where: { proposal_id: { [Op.in]: proposalIds } }, raw: true }),
      Lampiran.findAll({ where: { id: { [Op.in]: berkasLampiranIds } }, raw: true }),
      Persetujuan.findAll({ where: { id: { [Op.in]: persetujuanIds } }, raw: true })
    ]);

    const allDosenIds = [...new Set(proposalDosens.map(pd => pd.dosen_id).concat(persetujuans.map(p => p.dosen_id)))];
    const allLampiranPersetujuanIds = [...new Set(persetujuans.map(p => p.lampiran_id))];

    const [allDosens, allLampiranPersetujuan] = await Promise.all([
      Dosen.findAll({ where: { id: { [Op.in]: allDosenIds } }, attributes: ['id', 'code', 'name'], raw: true }),
      Lampiran.findAll({ where: { id: { [Op.in]: allLampiranPersetujuanIds } }, raw: true }),
    ]);

    const periodeMap = new Map(periodes.map(p => [p.id, p]));
    const tagMap = new Map(tags.map(t => [t.id, t]));
    const berkasLampiranMap = new Map(berkasLampirans.map(l => [l.id, l]));
    const dosenMap = new Map(allDosens.map(d => [d.id, d]));
    const lampiranPersetujuanMap = new Map(allLampiranPersetujuan.map(l => [l.id, l]));

    const contributorsMap = new Map();
    proposalDosens.forEach(pd => {
      if (!contributorsMap.has(pd.proposal_id)) contributorsMap.set(pd.proposal_id, []);
      const dosen = dosenMap.get(pd.dosen_id);
      if (dosen) contributorsMap.get(pd.proposal_id).push({ ...dosen, status_kontributor: pd.status_kontributor });
    });


    const allLaporans = await Laporan.findAll({ where: { proposal_id: { [Op.in]: proposalIds } }, raw: true });
    const allLaporanPersetujuans = await Persetujuan.findAll({ where: { id: { [Op.in]: allLaporans.map(l => l.persetujuan_id) } }, raw: true });
    const allLaporanBerkas = await Lampiran.findAll({ where: { id: { [Op.in]: allLaporans.map(l => l.berkas_laporan) } }, raw: true });
    const laporanMap = new Map();
    allLaporans.forEach(laporan => {
      if (!laporanMap.has(laporan.proposal_id)) {
        laporanMap.set(laporan.proposal_id, []);
      }

      const persetujuanData = allLaporanPersetujuans.find(p => p.id === laporan.persetujuan_id) || null;
      let persetujuanLaporan = null;
      if (persetujuanData) {
        const dosenPersetujuan = dosenMap.get(persetujuanData.dosen_id) || null;
        const lampiranPersetujuan = lampiranPersetujuanMap.get(persetujuanData.lampiran_id) || null;
        persetujuanLaporan = {
          id: persetujuanData.id,
          tipe: persetujuanData.tipe,
          dosen: dosenPersetujuan ? { id: dosenPersetujuan.id, code: dosenPersetujuan.code, name: dosenPersetujuan.name } : null,
          berkas_lampiran: lampiranPersetujuan ? lampiranPersetujuan.sumber_lampiran : null
        };
      }

      laporanMap.get(laporan.proposal_id).push({
        id: laporan.id,
        status: laporan.status, // Diganti dari status_id
        catatan: laporan.catatan,
        berkas_laporan: allLaporanBerkas.find(l => l.id === laporan.berkas_laporan)?.sumber_lampiran || null,
        persetujuan: persetujuanLaporan,
        date: laporan.createdAt
      });
    });

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
        id: proposal.id, judul: proposal.judul, jenis_proposal: proposal.jenis_proposal,
        periode: periode ? { id: periode.id, name: periode.name } : null,
        tag: tag ? { id: tag.id, name: tag.name } : null,
        kontributor: contributorsMap.get(proposal.id) || [],
        dana_diajukan: proposal.dana_diajukan, dana_disetujui: proposal.dana_disetujui,
        status: proposal.status,
        berkas_proposal: berkasLampiranMap.get(proposal.berkas_proposal)?.sumber_lampiran || null,
        persetujuan: persetujuan, date: proposal.createdAt,
        laporan: laporanMap.get(proposal.id) || []
      };
    });

    res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Data proposal yang memerlukan laporan berhasil diambil.", finalResult));

  } catch (error) {
    next(error);
  }
};

const respondToLaporan = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    // 1. Ekstraksi Data
    const { id: laporanId } = req.params;
    let { catatan, status } = req.body;
    const user = req.user; // Data Ka LPPM dari middleware
    const file = req.file; // File lampiran (opsional)

    // 2. Validasi Input
    if (status === undefined) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Status tanggapan wajib diisi.");
    }

    const validStatuses = [TIPE_PERSETUJUAN.DISETUJUI, TIPE_PERSETUJUAN.DITOLAK];
    if (!validStatuses.includes(Number(status))) {
      throw new ApiError(HttpStatus.BAD_REQUEST, "Status tanggapan tidak valid. Harus 'Disetujui' atau 'Ditolak'.");
    }
    const persetujuanStatus = status
    if (status == TIPE_PERSETUJUAN.DITOLAK) {
      status = STATUS_PROPOSAL_LAPORAN.DITOLAK
    }

    // 3. Validasi Laporan
    const laporan = await Laporan.findByPk(laporanId, { transaction });
    if (!laporan) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Laporan dengan ID tersebut tidak ditemukan.");
    }
    if (laporan.status !== STATUS_PROPOSAL_LAPORAN.MENUNGGU) {
      throw new ApiError(HttpStatus.CONFLICT, "Laporan ini sudah ditanggapi sebelumnya dan tidak bisa diubah.");
    }

    // 4. Buat Lampiran (jika ada)
    let newLampiranId = null;
    if (file) {
      const lampiranPersetujuan = await Lampiran.create({
        name_lampiran: file.originalname,
        sumber_lampiran: file.path,
        jenis_lampiran: 'file',
        tipe_lampiran: JENIS_DOKUMEN.PERSETUJUAN, // Menggunakan tipe yang sama untuk konsistensi
        sumber_id: laporan.id, // Mengacu pada ID laporan
      }, { transaction });
      newLampiranId = lampiranPersetujuan.id;
    }

    // 5. Buat entri Persetujuan
    const newPersetujuan = await Persetujuan.create({
      dosen_id: user.id,
      tipe: Number(persetujuanStatus), // Status laporan menjadi tipe persetujuan
      lampiran_id: newLampiranId,
    }, { transaction });

    // 6. Update Laporan dengan data baru
    await laporan.update({
      status: Number(status),
      catatan: catatan || laporan.catatan, // Gunakan catatan baru, atau pertahankan yang lama jika tidak ada
      persetujuan_id: newPersetujuan.id,
    }, { transaction });

    // 7. Commit Transaksi
    await transaction.commit();

    res.status(HttpStatus.SUCCESS).json(
      ApiResponse.success("Tanggapan untuk laporan berhasil disimpan.", {
        laporan_id: laporan.id,
        status_baru: laporan.status,
      })
    );

  } catch (error) {
    await transaction.rollback();
    next(error);
  }
};

const getHistoryLaporan = async (req, res, next) => {
  try {
    const user = req.user;
    let proposalIdsFilter = {};

    // 1. FILTER AWAL: Tentukan proposal mana yang boleh dilihat user
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

    // setup lampiran
    const allLaporans = await Laporan.findAll({ where: { proposal_id: { [Op.in]: proposalIds } }, raw: true });
    const allLaporanPersetujuans = await Persetujuan.findAll({ where: { id: { [Op.in]: allLaporans.map(l => l.persetujuan_id) } }, raw: true });
    const allLaporanBerkas = await Lampiran.findAll({ where: { id: { [Op.in]: allLaporans.map(l => l.berkas_laporan) } }, raw: true });
    const laporanMap = new Map();
    allLaporans.forEach(laporan => {
      if (!laporanMap.has(laporan.proposal_id)) {
        laporanMap.set(laporan.proposal_id, []);
      }

      const persetujuanData = allLaporanPersetujuans.find(p => p.id === laporan.persetujuan_id) || null;
      let persetujuanLaporan = null;
      if (persetujuanData) {
        const dosenPersetujuan = dosenMap.get(persetujuanData.dosen_id) || null;
        const lampiranPersetujuan = lampiranPersetujuanMap.get(persetujuanData.lampiran_id) || null;
        persetujuanLaporan = {
          id: persetujuanData.id,
          tipe: persetujuanData.tipe,
          dosen: dosenPersetujuan ? { id: dosenPersetujuan.id, code: dosenPersetujuan.code, name: dosenPersetujuan.name } : null,
          berkas_lampiran: lampiranPersetujuan ? lampiranPersetujuan.sumber_lampiran : null
        };
      }

      laporanMap.get(laporan.proposal_id).push({
        id: laporan.id,
        status: laporan.status, // Diganti dari status_id
        catatan: laporan.catatan,
        berkas_laporan: allLaporanBerkas.find(l => l.id === laporan.berkas_laporan)?.sumber_lampiran || null,
        persetujuan: persetujuanLaporan,
        date: laporan.createdAt
      });
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
        persetujuan: persetujuan,
        date: proposal.createdAt,
        laporan: laporanMap.get(proposal.id)
      };
    });

    const cleanedFinalResults = finalResult.map((proposal) => {
      // Filter laporan sesuai status disetujui
      const filteredLaporan = Array.isArray(proposal.laporan)
        ? proposal.laporan.filter(
          (lap) => lap.status === STATUS_PROPOSAL_LAPORAN.DISETUJUI
        )
        : [];

      return {
        ...proposal,
        laporan: filteredLaporan,
      };
    });

    // Ambil hanya proposal yang punya laporan (tidak kosong)
    const proposalsWithApprovedLaporan = cleanedFinalResults.filter(
      (p) => p.laporan.length > 0
    );

    const laporanFinalResults = [];
    for (const proposal of proposalsWithApprovedLaporan) {
      const { laporan, ...proposalWithoutLaporan } = proposal; // hapus field laporan

      for (const lap of laporan) {
        laporanFinalResults.push({
          ...lap,
          proposal: proposalWithoutLaporan,
        });
      }
    }


    res.status(HttpStatus.SUCCESS).json(ApiResponse.success("Data proposal berhasil diambil.", laporanFinalResults));

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRequiredProposals,
  respondToLaporan,
  getHistoryLaporan
};
