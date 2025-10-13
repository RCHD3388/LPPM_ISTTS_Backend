'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class SintaScore extends Model {
    static associate(models) {}
  }

  SintaScore.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      sinta_id: {
        type:DataTypes.STRING,
        allowNull:true
    },
      overall_score: {
        type:DataTypes.FLOAT,
        allowNull:true
    },
      three_year: {type:DataTypes.FLOAT,allowNull:true},
      affiliation_overall: {type:DataTypes.FLOAT,allowNull:true},
      affiliation_three_year: {type:DataTypes.FLOAT,allowNull:true},
      graph_label: {type:DataTypes.TEXT,allowNull:true},
      graph_data: {type:DataTypes.TEXT,allowNull:true},
      graph_type: {type:DataTypes.STRING,allowNull:true}
    },
    {
      sequelize,
      modelName: 'SintaScore',
      tableName: 'SintaScore',
      timestamps: true
    }
  )

  return SintaScore
}
