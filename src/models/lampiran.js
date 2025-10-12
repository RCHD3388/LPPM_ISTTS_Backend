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
      name_lampiran: {
        type: DataTypes.STRING,
        allowNull: false
      },
      sumber_lampiran: { // untuk link / path file
        type: DataTypes.STRING,
        allowNull: false
      },
      tipe_lampiran: { // untuk File Penting / Pengumuman
        type: DataTypes.STRING,
        allowNull: false
      },
      jenis_lampiran: { // untuk link / url
        type: DataTypes.STRING,
        allowNull: false
      },
      sumber_id: { // untuk simpen id dari file penting atau pengumuman
        type: DataTypes.INTEGER,
        allowNull: false
      }
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
