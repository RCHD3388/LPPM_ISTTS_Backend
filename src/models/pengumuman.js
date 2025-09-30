'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Pengumuman extends Model {
    static associate(models) {
    
    }
  }

  Pengumuman.init(
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
      isi: {
        type: DataTypes.STRING,
        allowNull: false
      },
      jumlah_lampiran: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      tag_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
    },
    {
      sequelize,
      modelName: 'Pengumuman',
      tableName: 'Pengumuman',
      createdAt: 'tanggal',
      updatedAt: false,
      timestamps: true, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return Pengumuman
}
