const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");
const { Departement } = require("../models");

const getAllDept = async (req, res, next) => {
  try {
    const result = await Departement.findAll()    
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", result)
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDept,
};