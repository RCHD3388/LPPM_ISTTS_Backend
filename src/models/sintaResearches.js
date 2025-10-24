'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SintaResearch extends Model {
    static associate(models) {}
  }

  SintaResearch.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      leader: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      funding: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      personils: {
        type: DataTypes.TEXT, // JSON string (array nama + url)
        allowNull: true,
      },
      year: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      nominal: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'SintaResearch',
      tableName: 'SintaResearches',
      timestamps: true,
    }
  );

  return SintaResearch;
};
