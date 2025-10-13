'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Departement extends Model {
    static associate(models) {}
  }

  Departement.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      nama: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Departement',
      tableName: 'Departement',
      timestamps: true
    }
  )

  return Departement
}
