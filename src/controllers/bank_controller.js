const { Bank } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");

const addOne =async (req, res, next) => {
  try {
    const { name, status } = req.body;

    // cek apakah name sudah ada
    const exists = await Bank.findOne({
      where: {
        name,
      },
    });
    if (exists) {
      throw new ApiError(HttpStatus.CONFLICT, "Bank name already exists");
    }

    const bank = await Bank.create({
      name,
      status: status ?? "1",
    });

    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.success("Bank created successfully", bank));
  } catch (error) {
    next(error); // lempar ke globalErrorHandler
  }
};

const editOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const bank = await Bank.findByPk(id);
    if (!bank) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Bank not found");
    }

    // cek duplikasi name baru
    if (name && bank.name !== name) {
      const exists = await Bank.findOne({
        where: {
          name: name,
        },
      });
      if (exists) {
        throw new ApiError(HttpStatus.CONFLICT, "New bank name already exists");
      }
      bank.name = name;
    }

    if (status) bank.status = status;

    await bank.save();

    return res.json(ApiResponse.success("Bank updated successfully", bank));
  } catch (error) {
    next(error);
  }
};

const getOneById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const bank = await Bank.findByPk(id);
    if (!bank) {
      throw new ApiError(HttpStatus.NOT_FOUND, `Bank "${bank.name}" not found`);
    }

    return res.json(ApiResponse.success("Bank retrieved successfully", bank));
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    let q  = { ...req.query }
    q.sortBy = "name";
    q.order = "ASC";

    const result = await paginate(
      Bank,
      q,
      {}, // opsional: where, include, dll
      ["name"] // field yang bisa dicari dengan LIKE
    );

    // console.log(result.meta)
    return res.json(
      ApiResponse.success("Banks retrieved successfully", result.data, result.meta)
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
