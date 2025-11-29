'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Proposal', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      judul: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      jenis_proposal: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tag_id: {
        type: Sequelize.INTEGER,
        allowNull: true, // Bisa jadi opsional saat pertama dibuat
      },
      periode_id: {
        type: Sequelize.INTEGER,
        allowNull: false, // Proposal harus terikat pada satu periode
      },
      dana_diajukan: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      dana_disetujui: {
        type: Sequelize.INTEGER,
        allowNull: true, // Akan null sampai disetujui
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0, // Misal: 0 = Draft, 1 = Diajukan, 2 = Disetujui, dst.
      },
      berkas_proposal: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      persetujuan_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      // Timestamps sangat direkomendasikan untuk melacak kapan proposal dibuat/diubah
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
    await queryInterface.dropTable('Proposal');
  }
};