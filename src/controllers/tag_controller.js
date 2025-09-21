const { Tag } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");

const addOne =async (req, res, next) => {
  try {
    const { name, status } = req.body;

    // cek apakah name sudah ada
    const exists = await Tag.findOne({
      where: {
        name,
      },
    });
    if (exists) {
      throw new ApiError(HttpStatus.CONFLICT, "Tag name already exists");
    }

    const tag = await Tag.create({
      name,
      status: status ?? "1",
    });

    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.success("Tag created successfully", tag));
  } catch (error) {
    next(error); // lempar ke globalErrorHandler
  }
};

const editOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const tag = await Tag.findByPk(id);
    if (!tag) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Tag not found");
    }

    // cek duplikasi name baru
    if (name && tag.name !== name) {
      const exists = await Tag.findOne({
        where: {
          name: name,
        },
      });
      if (exists) {
        throw new ApiError(HttpStatus.CONFLICT, "New tag name already exists");
      }
      tag.name = name;
    }

    if (status) tag.status = status;

    await tag.save();

    return res.json(ApiResponse.success("Tag updated successfully", tag));
  } catch (error) {
    next(error);
  }
};

const getOneById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findByPk(id);
    if (!tag) {
      throw new ApiError(HttpStatus.NOT_FOUND, `Tag "${tag.name}" not found`);
    }

    return res.json(ApiResponse.success("Tag retrieved successfully", tag));
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await paginate(
      Tag,
      req.query,
      {}, // opsional: where, include, dll
      ["name"] // field yang bisa dicari dengan LIKE
    );

    // console.log(result.meta)
    return res.json(
      ApiResponse.success("Tags retrieved successfully", result.data, result.meta)
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
