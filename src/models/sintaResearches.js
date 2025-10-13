'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class SintaResearches extends Model {
    static associate(models) {}
  }

  SintaResearches.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      dosen_sinta_id: {type:DataTypes.STRING,allowNull:true},
      title: {type:DataTypes.STRING,allowNull:true},
      year: {type:DataTypes.INTEGER,allowNull:true},
      cited: {type:DataTypes.INTEGER,allowNull:true},
      venue: {type:DataTypes.STRING,allowNull:true},
      venue_link: {type:DataTypes.STRING,allowNull:true},
      quartile: {type:DataTypes.STRING,allowNull:true},
      external_link: {type:DataTypes.STRING,allowNull:true}
    },
    {
      sequelize,
      modelName: 'SintaResearches',
      tableName: 'SintaResearches',
      timestamps: true
    }
  )

  return SintaResearches
}
