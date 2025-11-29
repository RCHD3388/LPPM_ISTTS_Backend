const { Milis } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");

const addOne =async (req, res, next) => {
  try {
    const { nama } = req.body;

    // cek apakah name sudah ada
    const exists = await Milis.findOne({
      where: {
        nama,
      },
    });
    if (exists) {
      throw new ApiError(HttpStatus.CONFLICT, "Milis name already exists");
    }

    const milis = await Milis.create({
      nama,
    });

    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.success("Milis created successfully", milis));
  } catch (error) {
    next(error); // lempar ke globalErrorHandler
  }
};

const deleteOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log (id);
    const milis = await Milis.findByPk(id);
    if (!Milis) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Milis not found");
    }

    await Milis.destroy({ where: { id } });

    return res.json(ApiResponse.success("Milis deleted successfully", Milis));
  } catch (error) {
    next(error);
  }
};


const getAll = async (req, res, next) => {
  try {
    const result = await paginate(
      Milis,
      req.query,
      {}, // opsional: where, include, dll
      ["nama"] // field yang bisa dicari dengan LIKE
    );

    // console.log(result.meta)
    return res.json(
      ApiResponse.success("Miliss retrieved successfully", result.data, result.meta)
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addOne,
  deleteOne,
  getAll
};
