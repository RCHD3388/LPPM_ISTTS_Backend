'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Persetujuan extends Model {
    /**
     * Sesuai aturan proyek, blok associate ini sengaja dikosongkan.
     * Tidak ada relasi formal (foreign key) yang didefinisikan.
     */
    static associate(models) {
      // Tidak ada asosiasi yang didefinisikan di sini
    }
  }

  Persetujuan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      dosen_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      tipe: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lampiran_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Persetujuan',
      tableName: 'Persetujuan',
      timestamps: true, // Mengaktifkan createdAt dan updatedAt
    }
  );

  return Persetujuan;
};