'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SintaScore', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      sinta_id:Sequelize.STRING,
      overall_score: Sequelize.FLOAT,
      three_year: Sequelize.FLOAT,
      affiliation_overall: Sequelize.FLOAT,
      affiliation_three_year: Sequelize.FLOAT,
      graph_label: Sequelize.TEXT,
      graph_data: Sequelize.TEXT,
      graph_type:Sequelize.STRING,

      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('SintaScore');
  }
};
