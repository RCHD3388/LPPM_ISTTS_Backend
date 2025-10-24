'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('SintaResearches', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      leader: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      funding: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      personils: {
        type: Sequelize.TEXT, // disimpan dalam JSON string
        allowNull: true,
      },
      year: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      nominal: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('SintaResearches');
  },
};
