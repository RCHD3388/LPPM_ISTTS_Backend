const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const { Articles } = require("../models");

const getAllAffiliate = async (req, res, next) => {
  try {
    const result = await Articles.findAll({where:{
        sinta_id:null
    }})    
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", result.slice(0,10))
    );
  } catch (error) {
    next(error);
  }
}

const getDosen = async (req, res, next) => {
    const {id} = req.params
  try {
    const result = await Articles.findAll({where:{
        sinta_id:id
    }})    
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", result.slice(0,10))
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllAffiliate,
  getDosen
};