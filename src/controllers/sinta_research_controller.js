const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const { SintaScore, SintaResearches } = require("../models");
const {Op}  = require("sequelize");

function parsePersonils(personils) {
  try {
    if (Array.isArray(personils)) return personils;
    return JSON.parse(personils || "[]");
  } catch {
    return [];
  }
}
const getResearch = async (req, res, next) => {
  try {
    const researches = await SintaResearches.findAll({
      order: [["year", "DESC"]],
    });

    const formatted = researches.map((r) => ({
      id: r.id,
      title: r.title,
      leader: r.leader,
      funding: r.funding,
      personils: parsePersonils(r.personils),
      year: r.year,
      nominal: r.nominal,
    }));

    return res.json(
      ApiResponse.success("Research data retrieved successfully", formatted)
    );
  } catch (error) {
    console.error("❌ Error fetching researches:", error.message);
    next(error);
  }
};


module.exports = {
  getResearch,
};