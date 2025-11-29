'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Proposal extends Model {
    /**
     * Sesuai aturan proyek, blok associate ini sengaja dikosongkan.
     * Tidak ada relasi formal yang didefinisikan.
     */
    static associate(models) {
      // Tidak ada asosiasi yang didefinisikan di sini
    }
  }

  Proposal.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      judul: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      jenis_proposal: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      tag_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      periode_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      dana_diajukan: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      dana_disetujui: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      berkas_proposal: {
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
      modelName: 'Proposal',
      tableName: 'Proposal',
      timestamps: true, // Mengaktifkan createdAt dan updatedAt
    }
  );

  return Proposal;
};