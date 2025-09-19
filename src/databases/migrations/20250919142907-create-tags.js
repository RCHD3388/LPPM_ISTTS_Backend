'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Tag', {
      name: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "1",
        allowNull: false
      },
    })
},
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Tag')
  }
};
