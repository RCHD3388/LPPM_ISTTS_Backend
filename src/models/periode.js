'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Periode extends Model {
    static associate(models) {
    
    }
  }

  Periode.init(
    {
      name: {
        primaryKey: true,
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "1",
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Periode',
      tableName: 'Periode',
      timestamps: false, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return Periode
}
