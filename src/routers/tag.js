const { Router } = require("express");
const { Tag } = require("../models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const paginate = require("../utils/paginate");

const routers = Router();

/**
 * 1. Add new tag
 * POST /tags
 * body: { name: "tagName", status: "1" }
 */
routers.post("/", async (req, res, next) => {
  try {
    const { name, status } = req.body;

    // cek apakah name sudah ada
    const exists = await Tag.findByPk(name);
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
});

/**
 * 2. Edit tag (name atau status)
 * PUT /tags/:name
 * body: { newName?: "newName", status?: "0" }
 */
routers.put("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const { newName, status } = req.body;

    const tag = await Tag.findByPk(name);
    if (!tag) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Tag not found");
    }

    // cek duplikasi name baru
    if (newName && newName !== name) {
      const exists = await Tag.findByPk(newName);
      if (exists) {
        throw new ApiError(HttpStatus.CONFLICT, "New tag name already exists");
      }
      tag.name = newName;
    }

    if (status) tag.status = status;

    await tag.save();

    return res.json(ApiResponse.success("Tag updated successfully", tag));
  } catch (error) {
    next(error);
  }
});

/**
 * 3. Get sebuah tag
 * GET /tags/:name
 */
routers.get("/:name", async (req, res, next) => {
  try {
    const { name } = req.params;

    const tag = await Tag.findByPk(name);
    if (!tag) {
      throw new ApiError(HttpStatus.NOT_FOUND, `Tag "${name}" not found`);
    }

    return res.json(ApiResponse.success("Tag retrieved successfully", tag));
  } catch (error) {
    next(error);
  }
});

/**
 * 4. Get seluruh tag
 * GET /tags
 */
routers.get("/", async (req, res, next) => {
  try {
    const result = await paginate(
      Tag,
      req.query,
      {}, // opsional: where, include, dll
      ["name"] // field yang bisa dicari dengan LIKE
    );

    return res.json(
      ApiResponse.success("Tags retrieved successfully", result.data, result.meta)
    );
  } catch (error) {
    next(error);
  }
});

module.exports = routers;
