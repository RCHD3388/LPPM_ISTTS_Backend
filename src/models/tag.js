'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Tag extends Model {
    static associate(models) {
    
    }
  }

  Tag.init(
    {
      id: {
        primaryKey: true,
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        unique: true,
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
      modelName: 'Tag',
      tableName: 'Tag',
      timestamps: false, // karena migration kamu tidak punya createdAt & updatedAt
    }
  )

  return Tag
}
