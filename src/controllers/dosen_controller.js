const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const { Dosen, SintaScore } = require("../models");
const {Op}  = require("sequelize");
const { singularize } = require("sequelize/lib/utils");

const getDosenCombobox = async (req, res, next) => {
  try {
    const result = await Dosen.findAll()
    const score = await SintaScore.findAll({where:{
        sinta_id:{
            [Op.ne]:null
        }
    }})
    
    const comboBoxItem = result.map((d,index)=>{
        const dosen_score = score.find((s)=>s.dataValues.sinta_id == d.dataValues.sinta_id)
        return {
            id:d.dataValues.sinta_id,
            nama_dosen:d.dataValues.name,
            overall_sinta:dosen_score.dataValues.overall_score,
            three_year_score:dosen_score.dataValues.three_year,
            pp_url:d.dataValues.pp_url
        } 
    })

    console.log(comboBoxItem);
    

    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", comboBoxItem)
    );
  } catch (error) {
    next(error);
  }
}

const getDosenById = async (req, res, next) => {
    const {id} = req.params
  try {
    const result = await Dosen.findOne({where:{
        sinta_id:id
    }})
    const score = await SintaScore.findOne({where:{
        sinta_id:id
    }})
    
    const final_data = {
        name:result.dataValues.name,
        sintaId:result.dataValues.sinta_id,
        overall_sinta:score.dataValues.overall_score,
        three_year_score:score.dataValues.three_year,
        pp_url:result.dataValues.pp_url
    }
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", final_data)
    );
  } catch (error) {
    next(error);
  }
}



module.exports = {
  getDosenCombobox,
  getDosenById,
};