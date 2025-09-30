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
      name_lampiran: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sumber_lampiran: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tipe_lampiran: {
        type: Sequelize.STRING,
        allowNull: false
      },
      jenis_lampiran: {
        type: Sequelize.STRING,
        allowNull: false
      },
      sumber_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
    })
},
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Lampiran');
  }
};
