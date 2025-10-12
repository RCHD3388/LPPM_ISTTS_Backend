'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Pengumuman', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
      },
      judul: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isi: {
        type: Sequelize.STRING,
        allowNull: false
      },
      jumlah_lampiran: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tag_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      tanggal: {
        allowNull: false,
        type: Sequelize.DATE
      },
    })
},
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Pengumuman');
  }
};
