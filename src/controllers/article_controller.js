const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const { Articles } = require("../models");

const getAllAffiliate = async (req, res, next) => {
  try {
    const result = await Articles.findAll({where:{
        sinta_id:null
    }})    

    const formattedArticle = result.reduce(
      (acc, item) => {
        const type = item.dataValues.type?.toLowerCase() || "";

        if (type === "scopus") {
          acc.scopus.push(item);
        } else if (type === "garuda") {
          acc.garuda.push(item);
        } else if (type === "googlescholar" || type === "scholar") {
          acc.scholar.push(item);
        }

        return acc; // penting! agar accumulator diteruskan
      },
      { scopus: [], garuda: [], scholar: [] } // initial accumulator
    );
    console.log("✅ formattedArticle:", formattedArticle);
    return res.json(
      ApiResponse.success("Affiliation Articles retrieved successfully", formattedArticle)
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