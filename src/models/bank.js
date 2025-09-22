'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Bank extends Model {
    static associate(models) {
    
    }
  }

  Bank.init(
    {
      id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
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
      modelName: 'Bank',
      tableName: 'Bank',
      timestamps: false, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return Bank
}
