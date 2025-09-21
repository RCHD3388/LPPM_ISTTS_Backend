const { Bank } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");

const addOne =async (req, res, next) => {
  try {
    const { name, status } = req.body;

    if(kode == null){
      throw new ApiError(HttpStatus.BAD_REQUEST, "Bank code cannot be empty");
    }
    if(name == null){
      throw new ApiError(HttpStatus.BAD_REQUEST, "Bank name cannot be empty");
    }

    // cek apakah name sudah ada
    const exists = await Bank.findOne({
      where: {
        kode,
      },
    });
    if (exists) {
      throw new ApiError(HttpStatus.CONFLICT, "Bank code already exists");
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
    const { kode, name, status } = req.body;

    const bank = await Bank.findByPk(id);
    if (!bank) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Bank not found");
    }

    // cek duplikasi name baru
    if (kode && bank.name !== kode) {
      const exists = await Bank.findOne({
        where: {
          kode: kode,
        },
      });
      if (exists) {
        throw new ApiError(HttpStatus.CONFLICT, "New bank name already exists");
      }
      bank.kode = kode;
    }

    if (name) bank.name = name;
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
    const result = await paginate(
      Bank,
      req.query,
      {}, // opsional: where, include, dll
      ["name", "kode"] // field yang bisa dicari dengan LIKE
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
