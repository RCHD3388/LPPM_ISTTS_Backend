// scheduler.js
const axios = require('axios');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000'; // ganti sesuai alamat servermu

// daftar endpoint yg mau dipanggil
const endpoints = [
  { name: 'articles', url: `${BASE_URL}/sinta/articles?affiliationId=2136&view=scopus&limit=10` },
  { name: 'charts',   url: `${BASE_URL}/sinta/charts?affiliationId=2136&view=scopus&engine=browser` },
  { name: 'stats',    url: `${BASE_URL}/sinta/stats?affiliationId=2136&view=scopus` },
  { name: 'activity', url: `${BASE_URL}/sinta/activity?affiliationId=2136&view=services&engine=browser` }
];

// folder output
const OUTPUT_DIR = path.join(__dirname, 'scrape-results');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

async function runScraping() {
  console.log(`\n[${new Date().toISOString()}] Mulai scraping endpoints...\n`);
  for (const ep of endpoints) {
    try {
      console.log(`→ Hit: ${ep.url}`);
      const res = await axios.get(ep.url, { timeout: 120000 });
      console.log(`✔ Success: ${ep.name}`);

      // simpan ke file
      const fname = `${ep.name}-${new Date().toISOString().slice(0,10)}.json`;
      const fpath = path.join(OUTPUT_DIR, fname);
      fs.writeFileSync(fpath, JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.error(`✖ Failed: ${ep.name}`, err.message);
    }
  }
  console.log(`\n[${new Date().toISOString()}] Scraping selesai.\n`);
}

// Jalankan sekali saat start
runScraping();

// Jadwalkan tiap 3 hari jam 09:00
// format cron: Menit Jam Hari-Bulan Bulan Hari-Minggu
cron.schedule('0 9 */3 * *', runScraping);
