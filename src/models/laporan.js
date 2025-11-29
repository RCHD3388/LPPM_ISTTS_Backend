'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Laporan extends Model {
    /**
     * Sesuai aturan proyek, blok associate ini sengaja dikosongkan.
     * Tidak ada relasi formal (foreign key) yang didefinisikan.
     */
    static associate(models) {
      // Tidak ada asosiasi yang didefinisikan di sini
    }
  }

  Laporan.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      proposal_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      catatan: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      berkas_laporan: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      persetujuan_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Laporan',
      tableName: 'Laporan',
      timestamps: true, // Mengaktifkan createdAt dan updatedAt
    }
  );

  return Laporan;
};