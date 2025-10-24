const { Router } = require("express");
const scrappingRouter = require("./scrapping");
const tagRouter = require("./tag.js");
const periodeRouter = require("./periode.js");
const bankRouter = require("./bank.js");
const filepentingRouter = require("./filepenting.js");
const pengumumanController = require("./pengumuman.js");
const downloadRouter = require("./download.js");
const articleRouter = require("./article.js")
const dosenRouter = require("./dosen.js")
const sintaScoreRouter = require("./sinta_score.js")
const departementRouter = require("./departement.js")
const researchRouter = require("./sinta_researches.js")

const routers = Router()

routers.use('/scrapping', scrappingRouter) 
routers.use('/tag', tagRouter) 
routers.use('/periode', periodeRouter) 
routers.use('/bank', bankRouter)
routers.use('/filepenting', filepentingRouter)
routers.use('/pengumuman', pengumumanController)
routers.use('/download', downloadRouter)
routers.use("/article",articleRouter)
routers.use("/dosen",dosenRouter)
routers.use("/score",sintaScoreRouter)
routers.use("/departement",departementRouter)
routers.use("/research",researchRouter)



module.exports = routers;