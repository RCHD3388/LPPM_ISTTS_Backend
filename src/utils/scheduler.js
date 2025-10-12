// scheduler-inline-json.js
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { url } = require('inspector');

const BASE_URL = process.env.SCRAPER_BASE_URL || 'http://localhost:8000';

// daftar endpoint scraping
const SCRAPE_ENDPOINTS = [
  {name:"fetch_all_author", url:`${BASE_URL}/api/v1/scrapping/authors?affiliationId=2136`},
  {name:"fetch_all_departement", url:`${BASE_URL}/api/v1/scrapping/departments?affiliationId=2136/072021`},
  {name:"update_affiliation",url:`${BASE_URL}/api/v1/scrapping/score?affiliationId=2136`},
  {name:"update_affiliation_articles",url:`${BASE_URL}/api/v1/scrapping/articles?affiliationId=2136`},
  {name:"update_affiliation_chart", url:`${BASE_URL}/api/v1/scrapping/charts?affiliationId=2136`},
  {name:"update_affiliation_line_graph", url:`${BASE_URL}/api/v1/scrapping/activity?affiliationId=2136`},
  {name:"update_affiliation_stats", url:`${BASE_URL}/api/v1/scrapping/stats?affiliationId=2136`}
  // { name: 'articles', url: `${BASE_URL}/sinta/articles?affiliationId=2136&view=scopus&limit=10` },
  // { name: 'charts',   url: `${BASE_URL}/sinta/charts?affiliationId=2136&view=scopus&engine=browser` },
  // { name: 'stats',    url: `${BASE_URL}/sinta/stats?affiliationId=2136&view=scopus` },
  // { name: 'activity', url: `${BASE_URL}/sinta/activity?affiliationId=2136&view=services&engine=browser` }
];

// folder output opsional
const OUTPUT_DIR = path.join(__dirname, 'scrape-results');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// === Core Function: Scrape all endpoints ===
async function runScraping({ saveToFile = false } = {}) {
  const startedAt = new Date();
  const results = [];

  for (const ep of SCRAPE_ENDPOINTS) {
    const item = {
      name: ep.name,
      url: ep.url,
      ok: false,
      status: null,
      file: null,
      error: null,
      data: null
    };

    try {
      const res = await axios.get(ep.url, { timeout: 120000 });
      item.ok = true;
      item.status = res.status;
      item.data = res.data;

      if (saveToFile) {
        // const fname = `${ep.name}-${startedAt.toISOString().slice(0, 10)}.json`;
        // const fpath = path.join(OUTPUT_DIR, fname);
        // fs.writeFileSync(fpath, JSON.stringify(res.data, null, 2));
        // item.file = fpath;
        console.log("saved");
        
      }
    } catch (err) {
      item.error = err?.message || String(err);
    }

    results.push(item);
  }

  const authors = results.filter((r)=> r.name == "fetch_all_author")[0]
  const departements = results.filter((r)=> r.name == "fetch_all_departement")[0]

  const finishedAt = new Date();
  return {
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    total: results.length,
    endpoints: results,
    authors:authors.data.length,
    departements:departements.data.length
  };
}

// === Cron scheduler (manual trigger) ===
let cronJob = null;
function startCron() {
  if (cronJob) return false;
  cronJob = cron.schedule('0 9 */3 * *', async () => {
    await runScraping({ saveToFile: true }).catch(() => {});
  });
  cronJob.start();
  return true;
}
function stopCron() {
  if (!cronJob) return false;
  cronJob.stop();
  cronJob = null;
  return true;
}



module.exports = { runScraping, startCron, stopCron };
