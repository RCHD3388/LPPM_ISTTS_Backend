const { Bank } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");
const paginate = require("../utils/paginate");

const addOne = async (req, res, next) => {
  try {
    const { title, tag, type, link } = req.body;
    let value = "";
    if (type === "file" && req.file) {
      value = `${req.file.path}`;
    }else if (type === "link" && link) {
      value = link;
    }

    console.log("value:", value); // Debugging line
    console.log("Request body:", req.body); // Debugging line

    return res
      .status(HttpStatus.CREATED)
      .json(ApiResponse.success("File penting created successfully", value));
  } catch (error) {
    next(Error("Internal upload process failed")); // lempar ke globalErrorHandler
  }
};


module.exports = {
  addOne,
};
