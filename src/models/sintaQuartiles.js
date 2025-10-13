'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class SintaQuartiles extends Model {
    static associate(models) {}
  }

  SintaQuartiles.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      sinta_id: DataTypes.STRING,
      q1_value: DataTypes.FLOAT,
      q2_value: DataTypes.FLOAT,
      q3_value: DataTypes.FLOAT,
      q4_value: DataTypes.FLOAT,
      no_q_value: DataTypes.FLOAT,
      research_articles: DataTypes.INTEGER,
      research_conference: DataTypes.INTEGER,
      research_others: DataTypes.INTEGER
    },
    {
      sequelize,
      modelName: 'SintaQuartiles',
      tableName: 'SintaQuartiles',
      timestamps: true
    }
  )

  return SintaQuartiles
}
