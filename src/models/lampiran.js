'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Lampiran extends Model {
    static associate(models) {
    
    }
  }

  Lampiran.init(
    {
      id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
      },
      lampiran: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tipe: {
        type: DataTypes.STRING,
        allowNull: false
      },
      tanggal: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      },
    },
    {
      sequelize,
      modelName: 'Lampiran',
      tableName: 'Lampiran',
      timestamps: false, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return Lampiran
}
