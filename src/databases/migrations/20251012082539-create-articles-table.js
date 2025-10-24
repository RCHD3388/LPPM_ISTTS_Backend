'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Articles', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      sinta_id:Sequelize.STRING,
      title: Sequelize.STRING,
      year: Sequelize.INTEGER,
      cited: Sequelize.INTEGER,
      venue: Sequelize.STRING,
      venue_link: Sequelize.STRING,
      quartile: Sequelize.STRING,
      type:Sequelize.STRING,
      external_link: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Articles');
  }
};
