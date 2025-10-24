const ApiResponse = require("../utils/api_response");
const HttpStatus = require("../utils/http_status");
const ApiError = require("./../utils/api_error");
const { SintaScore } = require("../models");
const {Op}  = require("sequelize");

function restoreArray(str) {
  try {
    if (!str) return [];
    if (typeof str === "string") return JSON.parse(str);
    return Array.isArray(str) ? str : [];
  } catch {
    return [];
  }
}

const getGraphHomepage = async (req, res, next) => {
  try {
    const score = await SintaScore.findOne({ where: { sinta_id: null } });
    if (!score)
      return res.status(404).json(ApiResponse.error("No SintaScore found"));

    const labels = restoreArray(score.graph_label);
    const dataArr = restoreArray(score.graph_data);

    // === Helper untuk line graph ===
    const getLineData = (labelKey) => {
      const idx = labels.findIndex((l) => l === labelKey);
      if (idx < 0 || !dataArr[idx]) return [];
      const obj = dataArr[idx];
      const categories = Array.isArray(obj.categories) ? obj.categories : [];
      const values = Array.isArray(obj.data) ? obj.data : [];
      // gabungkan jadi format {label, value}
      return categories.map((label, i) => ({
        year:label,
        value: values[i] ?? 0,
      }));
    };

    // === Quartile ===
    const quartileIndex = labels.findIndex((l) => l === "quartile");
    const quartileData =
      quartileIndex >= 0 && dataArr[quartileIndex]?.quartile
        ? dataArr[quartileIndex].quartile
        : [];

    const quartileLabels = ["Q1", "Q2", "Q3", "Q4", "No-Q"];
    const formattedQuartile = quartileLabels.map((label, i) => ({
      label,
      value: quartileData[i] ?? 0,
    }));

    // === Research Output (kalau mau ditampilkan juga) ===
    const researchOutputIndex = labels.findIndex(
      (l) => l === "research_output"
    );
    const researchOutputData =
      researchOutputIndex >= 0 && dataArr[researchOutputIndex]?.research_output
        ? dataArr[researchOutputIndex].research_output
        : [];
    const researchOutputLabels = ["Article", "Conference", "Others"];
    const formattedResearchOutput = researchOutputLabels.map((label, i) => ({
      label,
      value: researchOutputData[i] ?? 0,
    }));

    // === Line Graphs ===
    const formattedScopus = getLineData("line_graph_scopus");
    const formattedGaruda = getLineData("line_graph_garuda");
    const formattedScholar = getLineData("line_graph_googlescholar");
    const formattedResearch = getLineData("line_graph_researches");
    const formattedService = getLineData("line_graph_services");

    // === Final unified format ===
    const final_data = {
      quartile: formattedQuartile,
      research_output: formattedResearchOutput,
      scholar: formattedScholar,
      garuda:formattedGaruda,
      scopus:formattedScopus,
      research: formattedResearch,
      service: formattedService,
    };

    return res.json(
      ApiResponse.success(
        "Affiliation graph data retrieved successfully",
        final_data
      )
    );
  } catch (error) {
    console.error("❌ getGraphHomepage error:", error.message);
    return next(error);
  }
};





const getAffiliateScore = async (req, res, next) => {
  try {
    const score = await SintaScore.findOne({ where: { sinta_id: null } });

    return res.json(
      ApiResponse.success(
        "Affiliation graph data retrieved successfully",
        score
      )
    );
  } catch (error) {
    console.error("❌ getGraphHomepage error:", error.message);
    return next(error);
  }
};








const getGraphDosen = async (req, res, next) => {
    const {id} = req.params
  try {
    const score = await SintaScore.findOne({ where: { sinta_id: id } });
    if (!score)
      return res.status(404).json(ApiResponse.error("No SintaScore found"));

    const labels = restoreArray(score.graph_label);
    const dataArr = restoreArray(score.graph_data);

    // === Helper untuk line graph ===
    const getLineData = (labelKey) => {
      const idx = labels.findIndex((l) => l === labelKey);
      if (idx < 0 || !dataArr[idx]) return [];
      const obj = dataArr[idx];
      const categories = Array.isArray(obj.categories) ? obj.categories : [];
      const values = Array.isArray(obj.data) ? obj.data : [];
      // gabungkan jadi format {label, value}
      return categories.map((label, i) => ({
        year:label,
        value: values[i] ?? 0,
      }));
    };

    // === Quartile ===
    const quartileIndex = labels.findIndex((l) => l === "quartile");
    const quartileData =
      quartileIndex >= 0 && dataArr[quartileIndex]?.quartile
        ? dataArr[quartileIndex].quartile
        : [];

    const quartileLabels = ["Q1", "Q2", "Q3", "Q4", "No-Q"];
    const formattedQuartile = quartileLabels.map((label, i) => ({
      label,
      value: quartileData[i] ?? 0,
    }));

    // === Research Output (kalau mau ditampilkan juga) ===
    const researchOutputIndex = labels.findIndex(
      (l) => l === "research_output"
    );
    const researchOutputData =
      researchOutputIndex >= 0 && dataArr[researchOutputIndex]?.research_output
        ? dataArr[researchOutputIndex].research_output
        : [];
    const researchOutputLabels = ["Article", "Conference", "Others"];
    const formattedResearchOutput = researchOutputLabels.map((label, i) => ({
      label,
      value: researchOutputData[i] ?? 0,
    }));

    // === Line Graphs ===
    const formattedArticle = getLineData("line_graph_article");
    const formattedResearch = getLineData("line_graph_researches");
    const formattedService = getLineData("line_graph_services");

    // === Final unified format ===
    const final_data = {
      quartile: formattedQuartile,
      research_output: formattedResearchOutput,
      article: formattedArticle,
      research: formattedResearch,
      service: formattedService,
    };

    return res.json(
      ApiResponse.success(
        "Affiliation graph data retrieved successfully",
        final_data
      )
    );
  } catch (error) {
    console.error("❌ getGraphHomepage error:", error.message);
    return next(error);
  }
};


module.exports = {
  getGraphHomepage,
  getGraphDosen,
  getAffiliateScore
};