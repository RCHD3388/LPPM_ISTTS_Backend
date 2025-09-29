'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Lampiran', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
      },
      lampiran: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipe: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tanggal: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
    })
},
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Attachment');
  }
};
