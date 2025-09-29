const { Router } = require("express");
const scrappingRouter = require("./scrapping");
const tagRouter = require("./tag.js");
const periodeRouter = require("./periode.js");
const bankRouter = require("./bank.js");
const filepentingRouter = require("./filepenting.js");

const routers = Router()

routers.use('/scrapping', scrappingRouter) 
routers.use('/tag', tagRouter) 
routers.use('/periode', periodeRouter) 
routers.use('/bank', bankRouter)
routers.use('/filepenting', filepentingRouter)

module.exports = routers;