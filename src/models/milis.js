'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Milis extends Model {
    static associate(models) {
    
    }
  }

  Milis.init(
    {
      id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
      },
      nama: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Milis',
      tableName: 'Milis',
      timestamps: false, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return Milis
}
