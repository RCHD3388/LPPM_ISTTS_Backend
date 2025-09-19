const { Router } = require("express");
const { Periode } = require("../databases/models"); // pastikan path sesuai
const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("../utils/api_error");

const routers = Router();

/**
 * 1. Add new periode
 * POST /periodes
 * body: { name: "periodeName", status: "1" }
 */
routers.post("/periode", async (req, res, next) => {
  try {
    const { name, status } = req.body;

    // cek apakah name sudah ada
    const exists = await Periode.findByPk(name);
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
});

/**
 * 2. Edit periode (name atau status)
 * PUT /periodes/:name
 * body: { newName?: "newName", status?: "0" }
 */
routers.put("/periode/:name", async (req, res, next) => {
  try {
    const { name } = req.params;
    const { newName, status } = req.body;

    const periode = await Periode.findByPk(name);
    if (!periode) {
      throw new ApiError(HttpStatus.NOT_FOUND, "Periode not found");
    }

    // cek duplikasi name baru
    if (newName && newName !== name) {
      const exists = await Periode.findByPk(newName);
      if (exists) {
        throw new ApiError(HttpStatus.CONFLICT, "New periode name already exists");
      }
      periode.name = newName;
    }

    if (status) periode.status = status;

    await periode.save();

    return res.json(ApiResponse.success("Periode updated successfully", periode));
  } catch (error) {
    next(error);
  }
});

/**
 * 3. Get sebuah periode
 * GET /periodes/:name
 */
routers.get("/periode/:name", async (req, res, next) => {
  try {
    const { name } = req.params;

    const periode = await Periode.findByPk(name);
    if (!periode) {
      throw new ApiError(HttpStatus.NOT_FOUND, `Periode "${name}" not found`);
    }

    return res.json(ApiResponse.success("Periode retrieved successfully", periode));
  } catch (error) {
    next(error);
  }
});

/**
 * 4. Get seluruh periode
 * GET /periodes
 */
routers.get("/periode", async (req, res, next) => {
  try {
    const result = await paginate(
      Periode,
      req.query,
      {}, // opsional: where, include, dll
      ["name"] // field yang bisa dicari dengan LIKE
    );

    return res.json(
      ApiResponse.success("Periodes retrieved successfully", result.data, result.meta)
    );
  } catch (error) {
    next(error);
  }
});

module.exports = routers;
