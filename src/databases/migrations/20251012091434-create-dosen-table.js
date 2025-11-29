'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Dosen', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code: Sequelize.STRING,
      name: Sequelize.STRING,
      email: Sequelize.STRING,
      sinta_id: Sequelize.STRING,
      bank_id: Sequelize.STRING,
      account_no: Sequelize.STRING,
      account_name: Sequelize.STRING,
      role_id: Sequelize.STRING,
      pp_url: Sequelize.STRING,
      departemen_id: Sequelize.STRING,
      status: Sequelize.INTEGER,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('Dosen');
  }
};

