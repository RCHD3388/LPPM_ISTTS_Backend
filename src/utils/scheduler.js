// scheduler-inline-json.js
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { url } = require('inspector');
const { SintaScore, Articles, Departement, Dosen } = require('../models');
const departement = require('../models/departement');
const https = require("https")

const BASE_URL = process.env.SCRAPER_BASE_URL || 'http://localhost:8000';

// ✅ Buat axios instance baru dengan agent Keep-Alive dimatikan
const axiosInstance = axios.create({
  httpsAgent: new https.Agent({ keepAlive: false }),
  timeout: 120000,
});

// Helper delay
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 🔁 Safe GET dengan retry otomatis
async function safeGet(url, retries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axiosInstance.get(url);
      return res;
    } catch (err) {
      console.warn(`⚠️ Request failed [${attempt}/${retries}] for ${url}: ${err.message}`);
      if (attempt === retries) throw err;
      await sleep(delayMs);
    }
  }
}

// Ganti axios.get dengan safeGet di runScraping()
// daftar endpoint scraping
const SCRAPE_ENDPOINTS = [
  {name:"update_affiliation",url:`${BASE_URL}/api/v1/scrapping/score?affiliationId=2136`},
  {name:"update_affiliation_articles",url:`${BASE_URL}/api/v1/scrapping/articles?affiliationId=2136`},
  {name:"update_affiliation_chart", url:`${BASE_URL}/api/v1/scrapping/charts?affiliationId=2136`},
  {name:"update_affiliation_line_graph", url:`${BASE_URL}/api/v1/scrapping/activity?affiliationId=2136`},
  // {name:"update_affiliation_stats", url:`${BASE_URL}/api/v1/scrapping/stats?affiliationId=2136`},
  {name:"fetch_all_departement", url:`${BASE_URL}/api/v1/scrapping/departments?affiliationId=2136/072021`},
  {name:"fetch_all_author", url:`${BASE_URL}/api/v1/scrapping/authors?affiliationId=2136`},
  // { name: 'articles', url: `${BASE_URL}/sinta/articles?affiliationId=2136&view=scopus&limit=10` },
  // { name: 'charts',   url: `${BASE_URL}/sinta/charts?affiliationId=2136&view=scopus&engine=browser` },
  // { name: 'stats',    url: `${BASE_URL}/sinta/stats?affiliationId=2136&view=scopus` },
  // { name: 'activity', url: `${BASE_URL}/sinta/activity?affiliationId=2136&view=services&engine=browser` }
];

function dumpArray(arr) {
  if (!Array.isArray(arr)) return null
  return JSON.stringify(arr)
}

function restoreArray(str) {
  try {
    return JSON.parse(str)
  } catch {
    return []
  }
}

// folder output opsional
const OUTPUT_DIR = path.join(__dirname, 'scrape-results');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);


// === Core Function: Scrape all endpoints ===
async function runScraping({ saveToFile = false } = {}) {
  const startedAt = new Date();
  const results = [];

  console.log(`🚀 [${startedAt.toISOString()}] Starting scraping for ${SCRAPE_ENDPOINTS.length} endpoints...\n`);

  for (const ep of SCRAPE_ENDPOINTS) {
    const item = {
      name: ep.name,
      url: ep.url,
      ok: false,
      status: null,
      file: null,
      error: null,
      data: null,
    };

    console.log(`🔹 Running endpoint: ${ep.name}`);

    try {
      // const res = await axios.get(ep.url);
      const res = await safeGet(ep.url);
      item.ok = true;
      item.status = res.status;
      item.data = res.data;

      if (saveToFile) {
        const fname = `${ep.name}-${startedAt.toISOString().slice(0, 10)}.json`;
        const fpath = path.join(OUTPUT_DIR, fname);
        fs.writeFileSync(fpath, JSON.stringify(res.data, null, 2));
        item.file = fpath;
        console.log(`💾 Saved result to ${fpath}`);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch ${ep.name}:`, err.message);
      item.error = err?.message || String(err);
      results.push(item);
      continue; // skip ke endpoint berikut
    }

    try {
      if (item.name === "update_affiliation") {
        console.log("📊 Updating affiliation score...");
        const affiliateData = item.data?.data;
        if (!affiliateData) throw new Error("Missing affiliation data");

        const exists = await SintaScore.findOne({ where: { sinta_id: null } });
        if (!exists) {
          await SintaScore.create({
            sinta_id: null,
            overall_score: affiliateData.scores.overall,
            three_year: affiliateData.scores.three_year,
            affiliation_overall: affiliateData.scores.productivity,
            affiliation_three_year: affiliateData.scores.productivity.three_year,
            graph_label: dumpArray([]),
            graph_data: dumpArray([]),
            graph_type: dumpArray([]),
          });
          console.log("✅ Created new SintaScore record (affiliation).");
        } else {
          await SintaScore.update(
            {
              overall_score: affiliateData.scores.overall,
              three_year: affiliateData.scores.three_year,
              affiliation_overall: affiliateData.scores.productivity,
              affiliation_three_year: affiliateData.scores.productivity.three_year,
            },
            { where: { sinta_id: null } }
          );
          console.log("🔁 Updated existing SintaScore record (affiliation).");
        }
      }

      else if (item.name === "update_affiliation_articles") {
        console.log("📰 Inserting affiliation articles...");
        const affiliateData = item.data?.data || [];
        if (!Array.isArray(affiliateData)) throw new Error("Invalid article data");

        for (const art of affiliateData) {
          try {
            const exists = await Articles.findOne({
              where: { title: art.title, venue_link: art.venue_link || "" },
            });
            if (!exists) {
              await Articles.create({
                sinta_id: null,
                title: art.title,
                year: art.year,
                cited: art.cited,
                venue: Array.isArray(art.venue)?dumpArray(art.venue):art.venue,
                venue_link: art.venue_link || "",
                quartile: art.quartile,
                external_link: art.external_link,
              });
              console.log(`✅ Added article: ${art.title}`);
            }
          } catch (err) {
            console.warn(`⚠️ Failed to insert article ${art.title}:`, err.message);
          }
        }
      }

      else if (item.name === "update_affiliation_chart") {
        console.log("📈 Updating affiliation charts...");
        const affiliateData = item.data?.data || {};
        if (!affiliateData) throw new Error("Chart data missing");

        const quartile = affiliateData.quartile || [];
        const researchOutput = affiliateData.researchOutput || [];

        const graphLabels = ["quartile", "research_output"];
        const graphTypes = ["pie", "pie"];
        const graphData = [
          { quartile: quartile.map((q) => q.value) },
          { research_output: researchOutput.map((r) => r.value) },
        ];

        const dumpArray = (arr) => (Array.isArray(arr) ? JSON.stringify(arr) : "[]");

        let existing = await SintaScore.findOne({ where: { sinta_id: null } });
        if (!existing) {
          await SintaScore.create({
            sinta_id: null,
            graph_type: dumpArray(graphTypes),
            graph_label: dumpArray(graphLabels),
            graph_data: JSON.stringify(graphData),
          });
          console.log("✅ Created SintaScore chart record.");
        } else {
          let labels = JSON.parse(existing.graph_label || "[]");
          let data = JSON.parse(existing.graph_data || "[]");
          let types = JSON.parse(existing.graph_type || "[]");

          for (const [i, label] of graphLabels.entries()) {
            const idx = labels.indexOf(label);
            if (idx >= 0) {
              data[idx] = graphData[i];
              types[idx] = graphTypes[i];
            } else {
              labels.push(label);
              data.push(graphData[i]);
              types.push(graphTypes[i]);
            }
          }

          await existing.update({
            graph_label: JSON.stringify(labels),
            graph_data: JSON.stringify(data),
            graph_type: JSON.stringify(types),
          });
          console.log("🔁 Updated SintaScore chart record.");
        }
      }

      else if (item.name === "update_affiliation_line_graph") {
        console.log("📊 Updating affiliation line graphs...");
        const lineData = item.data?.data?.data || [];

        let existing = await SintaScore.findOne({ where: { sinta_id: null } });
        if (!existing) {
          await SintaScore.create({
            sinta_id: null,
            graph_type: "[]",
            graph_label: "[]",
            graph_data: "[]",
          });
          existing = await SintaScore.findOne({ where: { sinta_id: null } });
        }

        let labels = JSON.parse(existing.graph_label || "[]");
        let data = JSON.parse(existing.graph_data || "[]");
        let types = JSON.parse(existing.graph_type || "[]");

        for (const chart of lineData) {
          const view = chart.view || "article";
          const label = `line_graph_${view}`;
          const type = "line";
          const categories = chart.categories || [];
          const series = chart.series?.[0]?.data || [];

          const entry = { label, categories, data: series };
          const idx = labels.indexOf(label);
          if (idx >= 0) {
            data[idx] = entry;
            types[idx] = type;
          } else {
            labels.push(label);
            data.push(entry);
            types.push(type);
          }
        }

        await existing.update({
          graph_label: JSON.stringify(labels),
          graph_data: JSON.stringify(data),
          graph_type: JSON.stringify(types),
        });

        console.log("✅ Updated/added line graphs (article/researches/services).");
      }

      else if (item.name === "fetch_all_departement") {
        console.log("🏫 Fetching all departments...");
        const departmentData = item.data?.data?.departments || [];

        for (const d of departmentData) {
          try {
            const exist = await Departement.findOne({ where: { nama: d.name } });
            if (!exist) {
              await Departement.create({ nama: d.name });
              console.log(`✅ Added department: ${d.name}`);
            }
          } catch (err) {
            console.warn(`⚠️ Failed to insert department ${d}:`, err.message);
          }
        }
      }

      else if (item.name === "fetch_all_author") {
        console.log("👩‍🏫 Fetching all authors...");
        const authorData = item.data?.data?.authors || [];

        for (const a of authorData) {
          try {
            console.log(`\n🔹 Processing author ${a.name} (${a.authorId})`);

            // cek & bersihkan department
            const cleanDept = a.department.name.replace(/\s*\([A-Z0-9]+\)\s*$/, "");
            const dept = await Departement.findOne({ where: { nama: cleanDept } });

            // create/update dosen
            const exist = await Dosen.findOne({ where: { sinta_id: a.authorId } });
            if (exist) {
              await Dosen.update(
                { departement_id: dept?.id || null, pp_url: a.imageUrl },
                { where: { sinta_id: a.authorId } }
              );
            } else {
              await Dosen.create({
                name: a.name,
                sinta_id: a.authorId,
                departement_id: dept?.id || null,
                pp_url: a.imageUrl,
              });
            }
            
            

            // fetch endpoint tambahan
            await processAuthorEndpoints(a.authorId, a.name);

            await SintaScore.update(
            {
              overall_score: a.sintaScoreOverall,
              three_year: a.sintaScore3Yr,
              affiliation_overall: a.affilScoreOverall,
              affiliation_three_year: a.affilScore3Yr,
            },
            { where: { sinta_id: a.authorId } }
          );

          } catch (err) {
            console.error(`❌ Error processing author ${a.name}:`, err.message);
          }
        }
      }

      results.push(item);
      console.log(`✅ Finished processing endpoint: ${ep.name}\n`);
    } catch (err) {
      console.error(`🔥 Critical error on ${ep.name}:`, err.message);
    }
  }

  console.log(`\n✅ All scraping finished at ${new Date().toISOString()}\n`);
  return results;
}
// === Subfunction: Process per-author scraping endpoints ===
async function processAuthorEndpoints(authorId, authorName) {
  console.log(`🧩 Running endpoints for author ${authorName} (${authorId})`);

  const dumpArray = (arr) => (Array.isArray(arr) ? JSON.stringify(arr) : "[]");

  try {
    // === 1️⃣ Fetch & Update Articles ===
    try {
      const articleRes = await axios.get(
        `${BASE_URL}/api/v1/scrapping/articles?authorId=${authorId}`,
        { timeout: 90000 }
      );

      const articles = articleRes.data?.data || [];
      if (!Array.isArray(articles)) throw new Error("Invalid article data");

      for (const art of articles) {
        const exists = await Articles.findOne({
          where: {
            title: art.title,
            venue_link: art.venue_link || "",
            sinta_id: authorId,
          },
        });

        if (!exists) {
          await Articles.create({
            sinta_id: authorId,
            title: art.title,
            year: art.year,
            cited: art.cited,
            venue: art.venue,
            venue_link: art.venue_link || "",
            quartile: art.quartile,
            external_link: art.external_link,
          });
          console.log(`📰 Added article for ${authorName}: ${art.title}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch articles for ${authorName}: ${err.message}`);
    }

    // === 2️⃣ Fetch & Update Charts (quartile & research output) ===
    try {
      const chartRes = await axios.get(
        `${BASE_URL}/api/v1/scrapping/charts?authorId=${authorId}`,
        { timeout: 90000 }
      );

      const chartData = chartRes.data?.data || {};
      const quartile = chartData.quartile || [];
      const researchOutput = chartData.researchOutput || [];

      const graphLabels = ["quartile", "research_output"];
      const graphTypes = ["pie", "pie"];
      const graphData = [
        { quartile: quartile.map((q) => q.value) },
        { research_output: researchOutput.map((r) => r.value) },
      ];

      let existing = await SintaScore.findOne({ where: { sinta_id: authorId } });

      if (!existing) {
        await SintaScore.create({
          sinta_id: authorId,
          graph_label: dumpArray(graphLabels),
          graph_type: dumpArray(graphTypes),
          graph_data: dumpArray(graphData),
        });
        console.log(`✅ Created new SintaScore chart data for ${authorName}`);
      } else {
        let existingLabels = [];
        let existingData = [];
        let existingTypes = [];

        try {
          existingLabels = JSON.parse(existing.graph_label || "[]");
          existingData = JSON.parse(existing.graph_data || "[]");
          existingTypes = JSON.parse(existing.graph_type || "[]");
        } catch (err) {
          console.warn(`⚠️ Parsing issue on charts for ${authorName}`);
        }

        for (const [i, label] of graphLabels.entries()) {
          const idx = existingLabels.indexOf(label);
          if (idx >= 0) {
            existingData[idx] = graphData[i];
            existingTypes[idx] = graphTypes[i];
          } else {
            existingLabels.push(label);
            existingData.push(graphData[i]);
            existingTypes.push(graphTypes[i]);
          }
        }

        await existing.update({
          graph_label: JSON.stringify(existingLabels),
          graph_data: JSON.stringify(existingData),
          graph_type: JSON.stringify(existingTypes),
        });

        console.log(`📊 Updated chart data for ${authorName}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to fetch charts for ${authorName}: ${err.message}`);
    }

    // === 3️⃣ Fetch & Update Line Graphs ===
    try {
      const lineRes = await axios.get(
        `${BASE_URL}/api/v1/scrapping/activity?authorId=${authorId}`,
        { timeout: 90000 }
      );

      const lineData = lineRes.data?.data?.data || [];

      let existing = await SintaScore.findOne({ where: { sinta_id: authorId } });
      if (!existing) {
        existing = await SintaScore.create({
          sinta_id: authorId,
          graph_label: "[]",
          graph_data: "[]",
          graph_type: "[]",
        });
      }

      let existingLabels = [];
      let existingData = [];
      let existingTypes = [];

      try {
        existingLabels = JSON.parse(existing.graph_label || "[]");
        existingData = JSON.parse(existing.graph_data || "[]");
        existingTypes = JSON.parse(existing.graph_type || "[]");
      } catch {
        console.warn(`⚠️ Parsing issue on line graph for ${authorName}`);
      }

      for (const chart of lineData) {
        const view = chart.view || "article";
        const label = `line_graph_${view}`;
        const type = "line";
        const categories = chart.categories || [];
        const series = chart.series?.[0]?.data || [];

        const graphEntry = { label, categories, data: series };
        const idx = existingLabels.indexOf(label);

        if (idx >= 0) {
          existingData[idx] = graphEntry;
          existingTypes[idx] = type;
        } else {
          existingLabels.push(label);
          existingData.push(graphEntry);
          existingTypes.push(type);
        }
      }

      await existing.update({
        graph_label: JSON.stringify(existingLabels),
        graph_data: JSON.stringify(existingData),
        graph_type: JSON.stringify(existingTypes),
      });

      console.log(`📈 Updated line graph data for ${authorName}`);
    } catch (err) {
      console.warn(`⚠️ Failed to fetch line graph for ${authorName}: ${err.message}`);
    }

    console.log(`✅ Finished processing author ${authorName}\n`);
  } catch (err) {
    console.error(`❌ Fatal error processing ${authorName}: ${err.message}`);
  }
}


// === Cron scheduler (manual trigger) ===
let cronJob = null;
// function startCron() {
//   if (cronJob) return false;
//   cronJob = cron.schedule('0 9 */3 * *', async () => {
//     await runScraping({ saveToFile: false }).catch(() => {});
//   });
//   cronJob.start();
//   return true;
// }

// function startCron() {
//   if (cronJob) return false;
//   // cronJob = cron.schedule('0 9 */3 * *', async () => {
//   cronJob = cron.schedule('*/25 * * * *', async () => {
//     try {
//       await runScraping({ saveToFile: true });
//     } catch (_) {
//       // swallow errors so the cron keeps running
//     }
//   }, {
//     timezone: 'Asia/Jakarta' // optional, aligns with your local TZ
//   });

//   cronJob.start();
//   return true;
// }


function startCron() {
  if (cronJob) return false;

  // Jadwalkan setiap 25 menit
  cronJob = cron.schedule('0 9 */3 * *', async () => {
  // cronJob = cron.schedule('*/25 * * * *', async () => {
    console.log("⏰ [CRON] Running scheduled scraping task...");
    try {
      await runScraping({ saveToFile: false });
      console.log("✅ [CRON] Scraping finished successfully.");
    } catch (err) {
      console.error("❌ [CRON] Error during scheduled scraping:", err.message);
    }
  }, {
    timezone: 'Asia/Jakarta' // opsional: sesuaikan dengan zona waktu kamu
  });

  cronJob.start();

  // Jalankan langsung sekali saat fungsi dipanggil
  console.log("🚀 [INIT] Running scraping immediately on startup...");
  runScraping({ saveToFile: false })
    .then(() => console.log("✅ [INIT] Initial scraping completed."))
    .catch(err => console.error("❌ [INIT] Failed initial scraping:", err.message));

  return true;
}
function stopCron() {
  if (!cronJob) return false;
  cronJob.stop();
  cronJob = null;
  return true;
}



module.exports = { runScraping, startCron, stopCron };
