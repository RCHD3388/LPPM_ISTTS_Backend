const { Sequelize } = require("sequelize")
const env = require("../config/env.js")
const { databaseConfig } = require("../config/database.js")

const config = databaseConfig[env("APP_ENV") || "development"]
const sequelize = new Sequelize(
  config.DATABASE,
  config.USERNAME,
  config.PASSWORD,
  {
    host: config.HOST,
    dialect: "mysql",
    logging: false,
  }
)

const db = {}

db.Sequelize = Sequelize
db.sequelize = sequelize

// Import semua model di sini
db.Tag = require("./tag.js")(sequelize, Sequelize.DataTypes)
db.Periode = require("./periode.js")(sequelize, Sequelize.DataTypes)
db.Bank = require("./bank.js")(sequelize, Sequelize.DataTypes)
db.Proposal = require("./proposal.js")(sequelize, Sequelize.DataTypes)
db.FilePenting = require("./file_penting.js")(sequelize, Sequelize.DataTypes)
db.Lampiran = require("./lampiran.js")(sequelize, Sequelize.DataTypes)
db.Pengumuman = require("./pengumuman.js")(sequelize, Sequelize.DataTypes)
db.Laporan = require("./laporan.js")(sequelize, Sequelize.DataTypes)
db.ProposalDosen = require("./proposal_dosen.js")(sequelize, Sequelize.DataTypes)
db.Persetujuan = require("./persetujuan.js")(sequelize, Sequelize.DataTypes)
db.Milis = require("./milis.js")(sequelize, Sequelize.DataTypes)

db.Articles = require("./articles.js")(sequelize,Sequelize.DataTypes)
db.Departement = require("./departement.js")(sequelize,Sequelize.DataTypes)
db.Dosen = require("./dosen.js")(sequelize,Sequelize.DataTypes)
db.SintaResearches = require("./sintaResearches.js")(sequelize,Sequelize.DataTypes)
db.SintaScore = require("./sintaScore.js")(sequelize,Sequelize.DataTypes)


module.exports = db
