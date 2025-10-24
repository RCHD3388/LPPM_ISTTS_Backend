'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Departement', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      nama: Sequelize.STRING,
      sinta_overall:Sequelize.INTEGER,
      sinta_3yr:Sequelize.INTEGER,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Departement');
  }
};
