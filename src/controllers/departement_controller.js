const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");
const { Departement, Dosen } = require("../models");

const getAllDept = async (req, res, next) => {
  try {
    const result = await Departement.findAll()    

    const final_data = await Promise.all(result.map(async(d)=>{
      const jumlahDosen = await Dosen.count({
        where:{
          departemen_id:d.dataValues.id
        }
      })
      return {
        ...d.dataValues,
        jumlah:jumlahDosen
      }
    }))
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", final_data)
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDept,
};