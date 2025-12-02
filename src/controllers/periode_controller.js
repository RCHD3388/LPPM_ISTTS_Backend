const { Periode } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");

const addOne =async (req, res, next) => {
  try {
    const { name, status } = req.body;

    // cek apakah name sudah ada
    const exists = await Periode.findOne({
      where: {
        name,
      },
    });
    if (exists) {
      throw new ApiError(HttpStatus.CONFLICT, "Periode name already exists");
    }

    const periode = await Periode.create({
      name,
      status: status ?? "1",
    });

    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.success("Periode created successfully", periode));
  } catch (error) {
    next(error); // lempar ke globalErrorHandler
  }
};

const editOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const periode = await Periode.findByPk(id);
    if (!periode) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Periode not found");
    }

    // cek duplikasi name baru
    if (name && periode.name !== name) {
      const exists = await Periode.findOne({
        where: {
          name: name,
        },
      });
      if (exists) {
        throw new ApiError(HttpStatus.CONFLICT, "New periode name already exists");
      }
      periode.name = name;
    }

    if (status) periode.status = status;

    await periode.save();

    return res.json(ApiResponse.success("Periode updated successfully", periode));
  } catch (error) {
    next(error);
  }
};

const getOneById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const periode = await Periode.findByPk(id);
    if (!periode) {
      throw new ApiError(HttpStatus.NOT_FOUND, `Periode "${periode.name}" not found`);
    }

    return res.json(ApiResponse.success("Periode retrieved successfully", periode));
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {

    let q  = { ...req.query }
    q.sortBy = "name";
    q.order = "DESC";

    const result = await paginate(
      Periode,
      q,
      {}, // opsional: where, include, dll
      ["name"] // field yang bisa dicari dengan LIKE
    );

    // console.log(result.meta)
    return res.json(
      ApiResponse.success("Periodes retrieved successfully", result.data, result.meta)
    );
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addOne,
  editOne,
  getOneById,
  getAll
};
