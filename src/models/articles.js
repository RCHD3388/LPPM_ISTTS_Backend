'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Articles extends Model {
    static associate(models) {}
  }

  Articles.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      sinta_id: {type:DataTypes.STRING,allowNull:true},
      title: DataTypes.STRING,
      year: DataTypes.INTEGER,
      cited: DataTypes.INTEGER,
      venue: DataTypes.STRING,
      venue_link: DataTypes.STRING,
      quartile: DataTypes.STRING,
      external_link: DataTypes.STRING
    },
    {
      sequelize,
      modelName: 'Articles',
      tableName: 'Articles',
      timestamps: true
    }
  )

  return Articles
}
