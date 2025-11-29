const { Router } = require("express");
const authRouter = require("./auth.js")
const scrappingRouter = require("./scrapping");
const tagRouter = require("./tag.js");
const periodeRouter = require("./periode.js");
const bankRouter = require("./bank.js");
const filepentingRouter = require("./filepenting.js");
const pengumumanRouter = require("./pengumuman.js");
const laporanRouter = require("./laporan.js");
const proposalRouter = require("./proposal.js")
const downloadRouter = require("./download.js");
const articleRouter = require("./article.js")
const dosenRouter = require("./dosen.js")
const sintaScoreRouter = require("./sinta_score.js")
const departementRouter = require("./departement.js")
const researchRouter = require("./sinta_researches.js")

const routers = Router()

routers.use("/auth", authRouter)
routers.use('/scrapping', scrappingRouter) 
routers.use('/tag', tagRouter) 
routers.use('/periode', periodeRouter) 
routers.use('/bank', bankRouter)
routers.use('/filepenting', filepentingRouter)
routers.use('/pengumuman', pengumumanRouter)
routers.use('/laporan', laporanRouter)
routers.use('/proposal', proposalRouter)
routers.use('/download', downloadRouter)
routers.use("/article",articleRouter)
routers.use("/dosen",dosenRouter)
routers.use("/score",sintaScoreRouter)
routers.use("/departement",departementRouter)
routers.use("/research",researchRouter)



module.exports = routers;