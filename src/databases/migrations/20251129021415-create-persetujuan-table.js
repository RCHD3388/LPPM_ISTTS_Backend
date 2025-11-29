'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Persetujuan', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // TIDAK ADA 'references' sesuai aturan proyek
      },
      tipe: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // Misal: 0 = Menunggu, 1 = Disetujui, 2 = Ditolak
      },
      lampiran_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // TIDAK ADA 'references' sesuai aturan proyek
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
    await queryInterface.dropTable('Persetujuan');
  }
};