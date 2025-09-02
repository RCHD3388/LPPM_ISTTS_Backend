const { Router } = require("express");
const scrappingRouter = require("./scrapping");
const {getAuthorArticlesByView,getAffiliationArticlesByView,getAffiliationScores, getAuthorScores} =  require("../utils/scrapping.js")

const routers = Router()

routers.use('/scrapping', scrappingRouter) 

module.exports = routers;