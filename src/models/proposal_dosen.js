'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProposalDosen extends Model {
    /**
     * Sesuai aturan proyek, blok associate ini sengaja dikosongkan.
     * Tidak ada relasi formal (foreign key) yang didefinisikan.
     */
    static associate(models) {
      // Tidak ada asosiasi yang didefinisikan di sini
    }
  }

  ProposalDosen.init(
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
      dosen_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status_kontributor: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ProposalDosen',
      tableName: 'ProposalDosen',
      timestamps: true, // Mengaktifkan createdAt dan updatedAt
    }
  );

  return ProposalDosen;
};