'use strict'
const { Model } = require('sequelize')

module.exports = (sequelize, DataTypes) => {
  class Dosen extends Model {
    static associate(models) {}
  }

  Dosen.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      code: {type:DataTypes.STRING,allowNull:true},
      name: {type:DataTypes.STRING,allowNull:true},
      name_tanpa_gelar: {type:DataTypes.STRING,allowNull:true},
      email: {type:DataTypes.STRING,allowNull:true},
      sinta_id: {type:DataTypes.STRING,allowNull:true},
      bank_id: {type:DataTypes.STRING,allowNull:true},
      account_no: {type:DataTypes.STRING,allowNull:true},
      account_name: {type:DataTypes.STRING,allowNull:true},
      role_id: {type:DataTypes.STRING,allowNull:true, defaultValue:"1"},
      pp_url: {type:DataTypes.STRING,allowNull:true},
      departemen_id: {type:DataTypes.STRING,allowNull:true},
      status: {type:DataTypes.INTEGER,defaultValue:1,allowNull:false},
    },
    {
      sequelize,
      modelName: 'Dosen',
      tableName: 'Dosen',
      timestamps: true
    }
  )

  return Dosen
}
