'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ProposalDosen', {
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
      dosen_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        // TIDAK ADA 'references' sesuai aturan proyek
      },
      status_kontributor: {
        type: Sequelize.STRING,
        allowNull: false, // Misal: "Ketua", "Anggota"
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
    await queryInterface.dropTable('ProposalDosen');
  }
};