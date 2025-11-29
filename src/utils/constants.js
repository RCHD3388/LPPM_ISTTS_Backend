// utils/constants.js
exports.JENIS_DOKUMEN = {
  FILE_PENTING: 'filepenting',
  PENGUMUMAN: 'pengumuman',
  PROPOSAL: 'proposal',
  LAPORAN: 'laporan'
};

exports.STATUS_PROPOSAL_LAPORAN = {
  MENUNGGU: 0,
  DISETUJUI: 1,
  DITOLAK: 2
}

exports.TIPE_PERSETUJUAN = {
  MENUNGGU: 0,
  DISETUJUI: 1,
  DISETUJUI_LAPORAN: 2,
  DITOLAK: 3
}

exports.JENIS_DOKUMEN_VALUES = Object.values(exports.JENIS_DOKUMEN);
exports.STATUS_PROPOSAL_LAPORAN = Object.values(exports.STATUS_PROPOSAL_LAPORAN);
exports.TIPE_PERSETUJUAN = Object.values(exports.TIPE_PERSETUJUAN);