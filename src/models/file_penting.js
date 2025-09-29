'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class FilePenting extends Model {
    static associate(models) {
    
    }
  }

  FilePenting.init(
    {
      id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
      },
      judul: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tag_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
      lampiran_id: {
        type: DataTypes.STRING,
        allowNull: false
      },
    },
    {
      sequelize,
      modelName: 'FilePenting',
      tableName: 'FilePenting',
      timestamps: false, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return FilePenting
}
