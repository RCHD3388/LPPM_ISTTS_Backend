'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FilePenting', {
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
      tag_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
      lampiran_id: {
        type: Sequelize.STRING,
        allowNull: false
      },
    })
},
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('FilePenting');
  }
};
