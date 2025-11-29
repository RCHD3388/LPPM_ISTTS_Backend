'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Laporan', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      proposal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // TIDAK ADA 'references' sesuai aturan proyek
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Misal: 0 = Draft, 1 = Diajukan, 2 = Disetujui, dst.
      },
      catatan: {
        type: Sequelize.TEXT, // Menggunakan TEXT untuk catatan yang mungkin panjang
        allowNull: true,
      },
      berkas_laporan: {
        type: Sequelize.INTEGER,
        allowNull: true, // Berkas bisa diunggah belakangan
      },
      persetujuan_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Persetujuan akan ada setelah laporan diajukan
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Laporan');
  }
};