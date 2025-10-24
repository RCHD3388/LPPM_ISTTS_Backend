// Helper: fetch HTML with headers + timeout + retries
const cheerio = require('cheerio')
const JSON5 = require('json5');
const axios = require("axios")
const puppeteer = require('puppeteer');
async function fetchHtml(url, retries = 2) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; SintaScoreBot/1.0; +https://example.com/bot)'
  };
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.get(url, { headers, timeout: 15000 });
      return res.data;
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

// Both old and new domains appear in the wild; try new first, then old.
const DOMAINS = [
  'https://sinta.kemdiktisaintek.go.id',
  'https://sinta.kemdikbud.go.id'
];

// Extract with resilient regexes from full body text.
// Numbers on SINTA often use dot-thousand separators (e.g., 1.258.578).
function grabNumberBeforeLabel(text, label) {
  const re = new RegExp(`([\\d\\.,]+)\\s*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
  const m = text.match(re);
  return m ? m[1] : null;
}
function grabNumberAfterLabel(text, label) {
  const re = new RegExp(`${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*([\\d\\.,]+)`, 'i');
  const m = text.match(re);
  return m ? m[1] : null;
}
function normalizeNumber(n) {
  if (!n) return null;
  // Remove dots as thousand separators, keep decimal comma/dot if any.
  // SINTA appears to use dots only as thousand separators.
  return Number(n.replace(/\./g, '').replace(/,/g, '.'));
}
async function affiliationExists(affiliationId) {
  // Cheap probe: the index page renders the ID on the first page for top orgs,
  // and for others you can skip this or implement a search request later.
  const html = await fetchHtml(`${DOMAINS[0]}/affiliations`);
  const $ = cheerio.load(html);
  const text = $('body').text().replace(/\s+/g, ' ');
  return text.includes(`ID : ${affiliationId} `);
}

async function getAffiliationScores(affiliationId) {
  // Optional probe
  try {
    const looksValid = await affiliationExists(affiliationId);
    if (!looksValid) {
      // not definitive, but gives a better hint
      console.warn(`Affiliation ID ${affiliationId} not visible on index page.`);
    }
  } catch (_) {}

  let html = null, urlUsed = null, lastErr = null;
  for (const base of DOMAINS) {
    const url = `${base}/affiliations/profile/${affiliationId}`;
    try {
      html = await fetchHtml(url);
      urlUsed = url;
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!html) {
    const status = lastErr?.response?.status;
    const reason = status ? `HTTP ${status}` : 'network/timeout';
    throw new Error(`Unable to fetch affiliation page from SINTA (${reason}).`);
  }

  const $ = cheerio.load(html);
  const pageText = $('body').text().replace(/\s+/g, ' ').trim();
  const heading = $('h3').first().text().trim() || null;

  const scoreOverall = normalizeNumber(grabNumberBeforeLabel(pageText, 'SINTA Score Overall'));
  const score3Yr     = normalizeNumber(grabNumberBeforeLabel(pageText, 'SINTA Score 3Yr'));
  const prodOverall  = normalizeNumber(grabNumberBeforeLabel(pageText, 'SINTA Score Productivity'));
  const prod3Yr      = normalizeNumber(grabNumberBeforeLabel(pageText, 'SINTA Score Productivity 3Yr'));

  return {
    type: 'affiliation',
    affiliationId,
    name: heading,
    scores: {
      overall: scoreOverall,
      three_year: score3Yr,
      productivity: prodOverall,
      productivity_three_year: prod3Yr
    },
    source: urlUsed
  };
}

async function getAuthorScores(authorId) {
  let html = null, urlUsed = null;
  for (const base of DOMAINS) {
    const url = `${base}/authors/profile/${authorId}`;
    try {
      html = await fetchHtml(url);
      urlUsed = url;
      break;
    } catch { /* try next */ }
  }
  if (!html) throw new Error('Unable to fetch author page from SINTA.');

  const $ = cheerio.load(html);
  const pageText = $('body').text().replace(/\s+/g, ' ').trim();

  // Name and affiliation (best-effort)
  const heading = $('h3').first().text().trim() || null;

  const sintaId = grabNumberAfterLabel(pageText, 'SINTA ID\\s*:\\s*') || authorId;
  const scoreOverall = normalizeNumber(grabNumberBeforeLabel(pageText, 'SINTA Score Overall'));
  const score3Yr     = normalizeNumber(grabNumberBeforeLabel(pageText, 'SINTA Score 3Yr'));
  const affOverall   = normalizeNumber(grabNumberBeforeLabel(pageText, 'Affil Score'));
  const aff3Yr       = normalizeNumber(grabNumberBeforeLabel(pageText, 'Affil Score 3Yr'));

  return {
    type: 'author',
    authorId: sintaId,
    name: heading,
    scores: {
      overall: scoreOverall,
      three_year: score3Yr,
      affiliation_overall: affOverall,
      affiliation_three_year: aff3Yr
    },
    source: urlUsed
  };
}

// ===============================================================
// 🔹 FULL ARTICLE SCRAPER SUPPORTING MULTIPLE VIEWS
// ===============================================================
const ALLOWED_VIEWS = ["scopus", "garuda", "googlescholar", "rama"];

function viewToQuery(view, { forceForAuthor = false } = {}) {
  const v = (view || "scopus").toLowerCase();
  const allowed = new Set(ALLOWED_VIEWS);
  const picked = allowed.has(v) ? v : "scopus";
  if (picked === "scopus" && !forceForAuthor) return "";
  return `?view=${picked}`;
}

function buildAffiliationArticleUrls(affiliationId, view) {
  const q = viewToQuery(view, { forceForAuthor: false });
  return DOMAINS.map((base) =>
    `${base}/affiliations/profile/${affiliationId}/${q}`.replace(/\/\?/, "/?")
  );
}

function buildAuthorArticleUrls(authorId, view) {
  const q = viewToQuery(view, { forceForAuthor: true });
  return DOMAINS.map((base) =>
    `${base}/authors/profile/${authorId}/${q}`.replace(/\/\?/, "/?")
  );
}

// ===============================================================
// 🔸 PARSER
// ===============================================================
function parseArListPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const items = [];

  $(".ar-list-item").each((_, el) => {
    const $el = $(el);
    const $titleA = $el.find(".ar-title a").first();
    const title = $titleA.text().replace(/\s+/g, " ").trim() || null;
    const extLink = $titleA.attr("href") || null;

    const $metaBlocks = $el.find(".ar-meta");
    const $metaTop = $metaBlocks.eq(0);
    const $metaBottom = $metaBlocks.eq(1);

    const $quartile = $metaTop.find(".ar-quartile").first();
    const quartile = $quartile.text().replace(/\s+/g, " ").trim() || null;

    const $venueA = $metaTop.find(".ar-pub").first();
    const venue = $venueA.text().replace(/\s+/g, " ").trim() || null;
    const venueLink = $venueA.attr("href")
      ? new URL($venueA.attr("href"), pageUrl).toString()
      : null;

    let creators = null;
    const creatorAnchor = $metaTop
      .find("a")
      .filter((_, a) => $(a).text().toLowerCase().includes("creator"))
      .first();
    if (creatorAnchor.length) {
      creators =
        creatorAnchor
          .text()
          .replace(/^\s*creator\s*:\s*/i, "")
          .replace(/\s+/g, " ")
          .trim() || null;
    }

    const yearText = $metaBottom.find(".ar-year").first().text();
    const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : null;

    const citedText = $metaBottom.find(".ar-cited").first().text();
    const citedMatch = citedText.match(/(\d+)\s*cited/i);
    const cited = citedMatch ? Number(citedMatch[1]) : 0;

    if (title) {
      items.push({
        title,
        year,
        cited,
        venue,
        venueLink,
        quartile,
        externalLink: extLink,
        creators,
      });
    }
  });

  return items;
}

// ===============================================================
// 🔸 PAGINATION HELPER
// ===============================================================
function findNextPageUrl($, currentUrl) {
  let href =
    $('a[rel="next"]').attr("href") ||
    $('a:contains("Next")')
      .filter((_, el) => $(el).text().trim().toLowerCase() === "next")
      .attr("href") ||
    $('a:contains("Berikutnya")')
      .filter((_, el) => $(el).text().trim().toLowerCase() === "berikutnya")
      .attr("href");

  if (!href) return null;
  try {
    return new URL(href, currentUrl).toString();
  } catch {
    return null;
  }
}

// ===============================================================
// 🔸 FETCH PAGED ARTICLES
// ===============================================================
async function collectArticles(startUrl, { maxPages = 1, limit = 50 } = {}) {
  let url = startUrl;
  const all = [];
  for (let i = 0; i < maxPages && url; i++) {
    const html = await fetchHtml(url);
    const pageItems = parseArListPage(html, url);
    for (const it of pageItems) {
      all.push(it);
      if (all.length >= limit) return all;
    }
    const $ = cheerio.load(html);
    url = findNextPageUrl($, url);
  }
  return all;
}

// ===============================================================
// 🔹 FETCH ARTICLES BY SINGLE VIEW
// ===============================================================
async function getAffiliationArticlesByView(affiliationId, { view = "scopus", maxPages = 1, limit = 50 } = {}) {
  let lastErr;
  for (const url of buildAffiliationArticleUrls(affiliationId, view)) {
    try {
      const list = await collectArticles(url, { maxPages, limit });
      return list;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Unable to fetch affiliation articles (${view}): ${lastErr?.message || "unknown error"}`);
}

async function getAuthorArticlesByView(authorId, { view = "scopus", maxPages = 1, limit = 50 } = {}) {
  let lastErr;
  for (const url of buildAuthorArticleUrls(authorId, view)) {
    try {
      const list = await collectArticles(url, { maxPages, limit });
      return list;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Unable to fetch author articles (${view}): ${lastErr?.message || "unknown error"}`);
}

// ===============================================================
// 🔹 FETCH ALL VIEWS (scopus, garuda, googlescholar, rama)
// ===============================================================
async function getAffiliationArticlesAllViews(affiliationId, { maxPages = 1, limit = 50 } = {}) {
  const results = [];
  for (const view of ALLOWED_VIEWS) {
    try {
      const articles = await getAffiliationArticlesByView(affiliationId, { view, maxPages, limit });
      const typed = articles.map((a) => ({ ...a, type: view }));
      results.push(...typed);
      console.log(`✅ Fetched ${articles.length} ${view} articles.`);
    } catch (err) {
      console.warn(`⚠️ Failed fetching ${view} articles:`, err.message);
    }
  }
  return results;
}

async function getAuthorArticlesAllViews(authorId, { maxPages = 1, limit = 50 } = {}) {
  const results = [];
  for (const view of ALLOWED_VIEWS) {
    try {
      const articles = await getAuthorArticlesByView(authorId, { view, maxPages, limit });
      const typed = articles.map((a) => ({ ...a, type: view }));
      results.push(...typed);
      console.log(`✅ Fetched ${articles.length} ${view} articles.`);
    } catch (err) {
      console.warn(`⚠️ Failed fetching ${view} articles:`, err.message);
    }
  }
  return results;
}

async function scrapeChartsWithBrowser(url, { timeoutMs = 45000 } = {}) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });

    // Tunggu sampai ECharts & instance dua chart siap
    await page.waitForFunction(() => {
      const ok = (id) => {
        const el = document.getElementById(id);
        // eslint-disable-next-line no-undef
        if (!el || !window.echarts) return false;
        // eslint-disable-next-line no-undef
        const inst = window.echarts.getInstanceByDom(el);
        if (!inst) return false;
        const opt = inst.getOption();
        return opt && opt.series && opt.series.length > 0;
      };
      return ok('quartile-pie') && ok('research-radar');
    }, { timeout: timeoutMs }).catch(() => {}); // jangan gagal—kita tetap coba ambil yang ada

    const data = await page.evaluate(() => {
      function grabPie(id) {
        const el = document.getElementById(id);
        // eslint-disable-next-line no-undef
        const inst = el && window.echarts ? window.echarts.getInstanceByDom(el) : null;
        if (!inst) return [];
        const opt = inst.getOption();
        const series = opt.series && opt.series.find(s => (s.type || '').toLowerCase() === 'pie');
        if (!series || !Array.isArray(series.data)) return [];
        return series.data.map(d => ({ name: String(d.name ?? ''), value: Number(d.value ?? 0) }));
      }
      function grabRadar(id) {
        const el = document.getElementById(id);
        // eslint-disable-next-line no-undef
        const inst = el && window.echarts ? window.echarts.getInstanceByDom(el) : null;
        if (!inst) return [];
        const opt = inst.getOption();
        const radar = (opt.radar && opt.radar[0]) || opt.radar;
        const indicators = (radar && radar.indicator) || [];
        const series = opt.series && opt.series.find(s => (s.type || '').toLowerCase() === 'radar');
        const vals = (series && series.data && series.data[0] && series.data[0].value) || [];
        const out = [];
        const n = Math.max(indicators.length, vals.length);
        for (let i = 0; i < n; i++) {
          const name = (indicators[i] && indicators[i].name) || `dim_${i+1}`;
          out.push({ name: String(name), value: Number(vals[i] ?? 0) });
        }
        return out;
      }
      return {
        quartile: grabPie('quartile-pie'),
        researchOutput: grabRadar('research-radar')
      };
    });

    return { quartile: data.quartile || [], researchOutput: data.researchOutput || [] };
  } finally {
    await browser.close();
  }
}

async function scrapeChartsFromPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const pieOpt   = extractEchartsOptionFromScripts($, 'quartile-pie');
  const radarOpt = extractEchartsOptionFromScripts($, 'research-radar');

  let quartile = readPieSeriesData(pieOpt) || [];
  let researchOutput = readRadarSeriesData(radarOpt) || [];

  if (quartile.length === 0) {
    quartile = parseQuartileFromTooltip($, '#quartile-pie') || [];
  }
  if (researchOutput.length === 0) {
    researchOutput = parseRadarFromTooltip($, '#research-radar') || [];
  }

  return { quartile, researchOutput };
}

async function scrapeChartsAuto(url, { forceBrowser = false } = {}) {
  // 1) HTML parser (cepat)
  if (!forceBrowser) {
    try {
      const data = await scrapeChartsFromPage(url);
      if ((data.quartile && data.quartile.length) || (data.researchOutput && data.researchOutput.length)) {
        return data;
      }
    } catch (_) {}
  }
  // 2) Fallback: headless browser (andal)
  return await scrapeChartsWithBrowser(url);
}


function normalizeView(v='scopus') {
  v = String(v).toLowerCase();
  const ok = new Set(['scopus','garuda','googlescholar','rama']);
  return ok.has(v) ? v : 'scopus';
}

// Author: SELALU pakai ?view=... (termasuk scopus)
// Affiliation: untuk konsistensi, juga pakai ?view=...
function buildAffiliationChartUrls(affiliationId, view) {
  const v = normalizeView(view);
  const q = `?view=${v}`;
  return DOMAINS.map(base => `${base}/affiliations/profile/${affiliationId}/${q}`.replace(/\/\?/, '/?'));
}
function buildAuthorChartUrls(authorId, view) {
  const v = normalizeView(view);
  const q = `?view=${v}`; // FORCE untuk author
  return DOMAINS.map(base => `${base}/authors/profile/${authorId}/${q}`.replace(/\/\?/, '/?'));
}
// ====== ECHARTS OPTION EXTRACTOR ======
/**
 * Cari <script> yang memanggil:
 *   echarts.init(document.getElementById('<containerId>'))....setOption({...});
 * Ambil objek option di dalam setOption(...) dan parse pakai JSON5.
 */
function extractEchartsOptionFromScripts($, containerId) {
  const scripts = Array.from($('script')).map(s => $(s).html() || '');
  const idPat = containerId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  // Pola yang cukup fleksibel untuk inisialisasi + setOption di baris berbeda
  const re = new RegExp(
    `echarts\\s*\\.\\s*init\\s*\\(\\s*document\\.getElementById\\(['"]${idPat}['"]\\)[\\s\\S]*?\\)\\s*\\.\\s*setOption\\s*\\((\\{[\\s\\S]*?\\})\\)\\s*;`,
    'm'
  );

  for (const code of scripts) {
    const m = code.match(re);
    if (m && m[1]) {
      try {
        return JSON5.parse(m[1]); // dukung trailing comma / unquoted keys
      } catch (_) { /* lanjut ke script berikutnya */ }
    }
  }
  return null;
}

// ====== PARSER: PIE & RADAR ======
function readPieSeriesData(option) {
  if (!option) return null;
  const series = Array.isArray(option.series) ? option.series : (option.series ? [option.series] : []);
  const pie = series.find(s => (s.type || '').toLowerCase() === 'pie' && Array.isArray(s.data));
  if (!pie) return null;
  return pie.data.map(d => ({ name: String(d.name ?? ''), value: Number(d.value ?? 0) }));
}
function readRadarSeriesData(option) {
  if (!option) return null;
  const indicators = option.radar?.indicator || option.polar?.indicator || [];
  const series = Array.isArray(option.series) ? option.series : (option.series ? [option.series] : []);
  const radarSeries = series.find(s => (s.type || '').toLowerCase() === 'radar');
  if (!radarSeries) return null;
  const vals = radarSeries.data?.[0]?.value || [];
  if (!indicators.length && !vals.length) return null;
  const out = [];
  for (let i = 0; i < Math.max(indicators.length, vals.length); i++) {
    const name = indicators[i]?.name ?? `dim_${i+1}`;
    out.push({ name: String(name), value: Number(vals[i] ?? 0) });
  }
  return out;
}

// ====== FALLBACK: baca dari tooltip DOM (jika option tak ketemu) ======
function parseQuartileFromTooltip($, containerSelector) {
  // ambil tooltip terakhir (biasanya tersembunyi)
  const t = $(containerSelector).find('div[style*="position: absolute"]').last().text() || '';
  // Pola: "No-Q: 98 (62.02%)" atau "Q1: 12 (..%)"
  const m = t.match(/([A-Za-z0-9\-+ ]+)\s*:\s*(\d+)(?:\s*\(\d+(?:\.\d+)?%\))?/g);
  if (!m) return null;
  return m.map(seg => {
    const mm = seg.match(/^\s*([A-Za-z0-9\-+ ]+)\s*:\s*(\d+)/);
    return mm ? { name: mm[1].trim(), value: Number(mm[2]) } : null;
  }).filter(Boolean);
}
function parseRadarFromTooltip($, containerSelector) {
  const t = $(containerSelector).find('div[style*="position: absolute"]').last().text() || '';
  // Pola: "Article : 59  Conference : 90  Others : 9"
  const pairs = [...t.matchAll(/([A-Za-z0-9\-+ ]+)\s*:\s*(\d+)/g)];
  if (!pairs.length) return null;
  return pairs.map(p => ({ name: p[1].trim(), value: Number(p[2]) }));
}

// ====== SCRAPE: 1 halaman ======
async function scrapeChartsFromPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) Prefer ambil dari option ECharts pada <script>
  const pieOpt   = extractEchartsOptionFromScripts($, 'quartile-pie');
  const radarOpt = extractEchartsOptionFromScripts($, 'research-radar');

  let quartile = readPieSeriesData(pieOpt) || [];
  let researchOutput = readRadarSeriesData(radarOpt) || [];

  // 2) Fallback ke tooltip bila option tidak ditemukan
  if (quartile.length === 0) {
    quartile = parseQuartileFromTooltip($, '#quartile-pie') || [];
  }
  if (researchOutput.length === 0) {
    researchOutput = parseRadarFromTooltip($, '#research-radar') || [];
  }

  return { quartile, researchOutput };
}


async function getAffiliationCharts(affiliationId, { view='scopus', engine='auto' } = {}) {
  const forceBrowser = String(engine).toLowerCase() === 'browser';
  let lastErr;
  for (const url of buildAffiliationChartUrls(affiliationId, view)) {
    try {
      const data = await scrapeChartsAuto(url, { forceBrowser });
      return { source: url, view: normalizeView(view), ...data };
    } catch (e) { lastErr = e; }
  }
  throw new Error(`Gagal mengambil chart affiliation: ${lastErr?.message || 'unknown error'}`);
}

async function getAuthorCharts(authorId, { view='scopus', engine='auto' } = {}) {
  const forceBrowser = String(engine).toLowerCase() === 'browser';
  let lastErr;
  for (const url of buildAuthorChartUrls(authorId, view)) {
    try {
      const data = await scrapeChartsAuto(url, { forceBrowser });
      return { source: url, view: normalizeView(view), ...data };
    } catch (e) { lastErr = e; }
  }
  throw new Error(`Gagal mengambil chart author: ${lastErr?.message || 'unknown error'}`);
}

// --- utils angka ---
function toIntOrNull(str) {
  if (str == null) return null;
  const m = String(str).replace(/[^\d\-]/g, '');
  if (m === '' || m === '-') return null;
  return Number(m);
}

function cleanTxt(s) {
  return (s || '').replace(/\s+/g, ' ').trim();
}

/**
 * Parse stat-table:
 * header kolom: Scopus, GScholar, WOS (kolom pertama kosong/label baris)
 * baris: Article, Citation, Cited Document, H-Index, i10-Index, G-Index
 * @param $ cheerio root
 * @param includeHidden  jika false, kolom dengan .d-none di-skip (default false)
 */
function parseStatTable($, { includeHidden = false } = {}) {
  const $table = $('table.stat-table').first();
  if (!$table.length) return null;

  // --- ambil header (nama sumber) ---
  const sources = [];
  const headerTds = $table.find('thead tr').first().find('th');
  headerTds.each((i, th) => {
    if (i === 0) return; // kolom label baris
    const $th = $(th);
    const hidden = $th.hasClass('d-none');
    const label = cleanTxt($th.text()); // e.g. "Scopus", "GScholar", "WOS"
    if (!label) return;
    if (hidden && !includeHidden) return;
    sources.push({ label, hidden });
  });
  if (sources.length === 0) return { sources: [], rows: [], bySource: {} };

  // --- ambil baris data ---
  const rows = [];
  const bySource = Object.fromEntries(sources.map(s => [s.label, {}]));

  $table.find('tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const $cells = $tr.find('td');
    if ($cells.length === 0) return;

    // kolom pertama = nama metrik
    const metric = cleanTxt($cells.first().text());
    if (!metric) return;

    // map tiap sumber ke sel yang sesuai (urutannya ikuti header di atas)
    let cellIdx = 1; // karena index 0 dipakai metric
    const values = {};
    for (const s of sources) {
      const $td = $cells.eq(cellIdx++);
      const val = toIntOrNull(cleanTxt($td.text()));
      values[s.label] = val;
      bySource[s.label][metric] = val;
    }

    rows.push({ metric, ...values });
  });

  return { sources: sources.map(s => s.label), rows, bySource };
}

async function scrapeStatsFromPage(url, { includeHidden = false } = {}) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const parsed = parseStatTable($, { includeHidden });
  return parsed || { sources: [], rows: [], bySource: {} };
}

async function getAffiliationStats(affiliationId, { view = 'scopus', includeHidden = false } = {}) {
  let lastErr;
  for (const url of buildAffiliationChartUrls(affiliationId, view)) {
    try {
      const data = await scrapeStatsFromPage(url, { includeHidden });
      // jika tidak ada sumber satupun, coba URL berikutnya
      if (data.sources.length === 0) continue;
      return { source: url, view: normalizeView(view), ...data };
    } catch (e) { lastErr = e; }
  }
  // fallback terakhir: tetap kembalikan struktur kosong agar respons konsisten
  if (!lastErr) return { source: null, view: normalizeView(view), sources: [], rows: [], bySource: {} };
  throw new Error(`Gagal mengambil stats affiliation: ${lastErr.message || 'unknown error'}`);
}

async function getAuthorStats(authorId, { view = 'scopus', includeHidden = false } = {}) {
  let lastErr;
  for (const url of buildAuthorChartUrls(authorId, view)) {
    try {
      const data = await scrapeStatsFromPage(url, { includeHidden });
      if (data.sources.length === 0) continue;
      return { source: url, view: normalizeView(view), ...data };
    } catch (e) { lastErr = e; }
  }
  if (!lastErr) return { source: null, view: normalizeView(view), sources: [], rows: [], bySource: {} };
  throw new Error(`Gagal mengambil stats author: ${lastErr.message || 'unknown error'}`);
}


// ==== ACTIVITY VIEW HANDLING ('' | 'services' | 'researches') ====
function normalizeActivityView(v = '') {
  v = String(v || '').toLowerCase();
  const ok = new Set(['', 'services', 'researches']);
  return ok.has(v) ? v : '';
}

function buildAffiliationActivityUrls(affiliationId, view) {
  const v = normalizeActivityView(view);
  const q = v ? `?view=${v}` : '';
  return DOMAINS.map(base => `${base}/affiliations/profile/${affiliationId}/${q}`.replace(/\/\?/, '/?'));
}

function buildAuthorActivityUrls(authorId, view) {
  const v = normalizeActivityView(view);
  const q = v ? `?view=${v}` : ''; // kalau ingin force param selalu ada, ganti jadi `?view=${v||'services'}`
  return DOMAINS.map(base => `${base}/authors/profile/${authorId}/${q}`.replace(/\/\?/, '/?'));
}



// ==== ECHARTS option -> cartesian series (xAxis/series) ====
function readCartesianSeries(option) {
  if (!option) return null;

  // Ambil kategori di xAxis
  const xAxis = Array.isArray(option.xAxis) ? option.xAxis[0] : option.xAxis;
  const categories = (xAxis && Array.isArray(xAxis.data)) ? xAxis.data.map(String) : [];

  // Ambil series type line/bar
  const seriesArr = Array.isArray(option.series) ? option.series : (option.series ? [option.series] : []);
  const usable = seriesArr.filter(s => {
    const t = String(s.type || '').toLowerCase();
    return (t === 'line' || t === 'bar') && Array.isArray(s.data);
  });

  if (usable.length === 0) return { categories, series: [] };

  const series = usable.map(s => ({
    name: String(s.name ?? ''),
    type: String(s.type || '').toLowerCase(),
    data: s.data.map(v => (v == null ? null : Number(v)))
  }));

  return { categories, series };
}


function normalizeActivityView(v) {
  const map = {
    "": "scopus",
    researches: "researches",
    services: "services",
    googlescholar: "googlescholar",
    garuda: "garuda",
  };
  return map[v] || v || "scopus";
}

function buildAffiliationActivityUrls(affiliationId, view) {
  return DOMAINS.map((base) => {
    if (view === "" || view === "researches" || view === "services") {
      return `${base}/affiliations/profile/${affiliationId}/${view}`.replace(/\/$/, "");
    } else if (view === "googlescholar" || view === "garuda") {
      return `${base}/affiliations/profile/${affiliationId}/?view=${view}`;
    }
    return `${base}/affiliations/profile/${affiliationId}`;
  });
}

function buildAuthorActivityUrls(authorId, view) {
  return DOMAINS.map((base) => {
    if (view === "" || view === "researches" || view === "services") {
      return `${base}/authors/profile/${authorId}/${view}`.replace(/\/$/, "");
    } else if (view === "googlescholar" || view === "garuda") {
      return `${base}/authors/profile/${authorId}/?view=${view}`;
    }
    return `${base}/authors/profile/${authorId}`;
  });
}

// ==========================================================
const VIEWS = ["", "researches", "services", "googlescholar", "garuda"];
// ==== Scrape dari HTML statis (tanpa headless) ==== 
async function scrapeActivityFromPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const opt = extractEchartsOptionFromScripts($, "service-chart-articles");
  const parsed = readCartesianSeries(opt) || { categories: [], series: [] };
  return parsed;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function scrapeActivityWithBrowser(url, { timeoutMs = 45000, extraWaitMs = 1200 } = {}) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    try {
      await page.goto(url, { waitUntil: "networkidle0", timeout: timeoutMs });
    } catch {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      await sleep(1500);
    }
    if (extraWaitMs) await sleep(extraWaitMs);

    const probeOnce = async () => {
      return await page.evaluate(() => {
        const out = [];
        const S = (sel) => Array.from(document.querySelectorAll(sel));
        const cand = S(".stat-chart [id], #service-chart-articles");
        const seen = new Set();
        for (const el of cand) {
          if (!el.id || seen.has(el.id)) continue;
          seen.add(el.id);
          const inst =
            window.echarts && window.echarts.getInstanceByDom
              ? window.echarts.getInstanceByDom(el)
              : null;
          const hasAttr = el.hasAttribute("_echarts_instance_");
          const hasInst = !!inst;
          let categories = [],
            seriesCount = 0;
          if (inst) {
            const opt = inst.getOption() || {};
            const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
            categories = xa && Array.isArray(xa.data) ? xa.data.map(String) : [];
            const sArr = Array.isArray(opt.series)
              ? opt.series
              : opt.series
              ? [opt.series]
              : [];
            seriesCount = sArr.length || 0;
          }
          out.push({ id: el.id, hasAttr, hasInst, categoriesLen: categories.length, seriesCount });
        }
        return out;
      });
    };

    const tryScrollAndProbe = async () => {
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const size = await page.evaluate(() => ({
          h: document.body.scrollHeight,
          y: window.scrollY,
        }));
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: "instant" }),
          (size.h / steps) * (i + 1)
        );
        await sleep(500);
        const info = await probeOnce();
        const pick = info.find(
          (x) => (x.hasInst || x.hasAttr) && (x.seriesCount > 0 || x.categoriesLen > 0)
        );
        if (pick) return pick.id;
      }
      return null;
    };

    let targetId = null;
    const firstProbe = await probeOnce();
    const picked1 = firstProbe.find(
      (x) => (x.hasInst || x.hasAttr) && (x.seriesCount > 0 || x.categoriesLen > 0)
    );
    if (picked1) {
      targetId = picked1.id;
    } else {
      targetId = await tryScrollAndProbe();
    }

    if (!targetId && firstProbe.length) {
      const byHint = firstProbe.find((x) =>
        /service|activity|activities|articles/i.test(x.id)
      );
      targetId = byHint?.id || firstProbe[0].id;
    }
    if (!targetId) return { categories: [], series: [] };

    const result = await page.evaluate((id) => {
      const toStr = (x) => (x == null ? "" : String(x));
      const toNum = (x) => (x == null || x === "" ? null : Number(x));
      const el = document.getElementById(id);
      const inst = el && window.echarts ? window.echarts.getInstanceByDom(el) : null;
      if (!inst) return { categories: [], series: [] };
      const opt = inst.getOption();
      const xa = Array.isArray(opt.xAxis) ? opt.xAxis[0] : opt.xAxis;
      const categories = xa && Array.isArray(xa.data) ? xa.data.map(toStr) : [];
      const sArr = Array.isArray(opt.series) ? opt.series : opt.series ? [opt.series] : [];
      const usable = sArr.filter((s) => {
        const t = toStr(s.type).toLowerCase();
        return (t === "line" || t === "bar") && Array.isArray(s.data);
      });
      const series = usable.map((s) => ({
        name: toStr(s.name),
        type: toStr(s.type).toLowerCase(),
        data: s.data.map(toNum),
      }));
      return { categories, series, id };
    }, targetId);

    if (!result.categories.length || !result.series.length) {
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await sleep(600);
    }

    return { categories: result.categories, series: result.series };
  } finally {
    await browser.close();
  }
}

async function scrapeActivityAuto(url, { engine = "auto" } = {}) {
  const forceBrowser = String(engine).toLowerCase() === "browser";
  if (!forceBrowser) {
    try {
      const data = await scrapeActivityFromPage(url);
      if (data.categories?.length && data.series?.length) return data;
    } catch (_) {}
  }
  return await scrapeActivityWithBrowser(url);
}

// ==========================================================
// 🔹 Fetch semua view (scopus, researches, services, googlescholar, garuda)
async function getAffiliationActivity(affiliationId, { engine = "auto" } = {}) {
  const results = [];

  for (const v of VIEWS) {
    let lastErr;
    for (const url of buildAffiliationActivityUrls(affiliationId, v)) {
      try {
        const data = await scrapeActivityAuto(url, { engine });
        results.push({
          source: url,
          view: normalizeActivityView(v),
          ...data,
        });
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr && !results.find((r) => r.view === v)) {
      results.push({
        view: normalizeActivityView(v),
        error: lastErr.message,
      });
    }
  }

  return { ok: true, affiliationId, engine, data: results };
}

async function getAuthorActivity(authorId, { engine = "auto" } = {}) {
  const results = [];

  for (const v of VIEWS) {
    let lastErr;
    for (const url of buildAuthorActivityUrls(authorId, v)) {
      try {
        const data = await scrapeActivityAuto(url, { engine });
        results.push({
          source: url,
          view: normalizeActivityView(v),
          ...data,
        });
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (lastErr && !results.find((r) => r.view === v)) {
      results.push({
        view: normalizeActivityView(v),
        error: lastErr.message,
      });
    }
  }

  return { ok: true, authorId, engine, data: results };
}

// Tambahan util: aman untuk JSON5
// const JSON5 = require('json5');

// ====== LOOSE EXTRACTOR untuk ECharts option (non-chaining) ======
function extractEchartsOptionLoose($, containerId) {
  const scripts = Array.from($('script')).map(s => $(s).html() || '');
  const idPat = containerId.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

  // 1) Temukan blok yang mengaitkan element id dengan chart + setOption(varName)
  //    ...getElementById('wcu_overview1') ... setOption(option_wcu_overview1)
  const setOptRe = new RegExp(
    `getElementById\\(['"]${idPat}['"]\\)[\\s\\S]*?setOption\\s*\\(\\s*([A-Za-z0-9_\\$]+)\\s*\\)`,
    'm'
  );

  // 2) Dari varName di atas, cari assignment varName = { ... };
  function findOptionObject(code, optVar) {
    // Paling sederhana: cari "optVar = { ... };" pertama
    // NB: gunakan non-greedy { ... } dan akhiri pada "};"
    const assignRe = new RegExp(`${optVar}\\s*=\\s*(\\{[\\s\\S]*?\\});`, 'm');
    const m = code.match(assignRe);
    return m ? m[1] : null;
  }

  for (const code of scripts) {
    const m = code.match(setOptRe);
    if (!m) continue;
    const optVar = m[1]; // contoh: option_wcu_overview1
    // Coba cari dalam script yang sama terlebih dulu
    let objText = findOptionObject(code, optVar);
    if (!objText) {
      // kalau tidak ketemu, scan semua script (kadang dipisah)
      for (const code2 of scripts) {
        objText = findOptionObject(code2, optVar);
        if (objText) break;
      }
    }
    if (objText) {
      try {
        return JSON5.parse(objText);
      } catch { /* lanjut */ }
    }
  }
  return null;
}

// ====== Update scraper WCU dari HTML ======
async function scrapeWcuFromPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  // 1) coba pattern chaining biasa (kalau-kalau ada)
  let opt = extractEchartsOptionFromScripts($, 'wcu_overview1');
  // 2) kalau gagal, coba loose extractor (non-chaining setOption(var))
  if (!opt) opt = extractEchartsOptionLoose($, 'wcu_overview1');

  // 3) Parse radar -> { categories, data }
  let categories = [];
  let data = [];
  if (opt) {
    const radar = Array.isArray(opt.radar) ? opt.radar[0] : opt.radar;
    const indicators = radar?.indicator || [];
    const seriesArr = Array.isArray(opt.series) ? opt.series : (opt.series ? [opt.series] : []);
    const first = seriesArr.find(s => (s.type || '').toLowerCase() === 'radar' && Array.isArray(s.data));
    const vals = first?.data?.[0]?.value || [];
    categories = indicators.map((it, i) => String(it.text || it.name || `dim_${i+1}`));
    data = vals.map(v => Number(v ?? 0));
  }

  // 4) Fallback terakhir: tooltip (jika suatu saat ada)
  if ((!categories.length || !data.length) && $('#wcu_overview1').length) {
    const t = $('#wcu_overview1').find('div[style*="position: absolute"]').last().text();
    // misal: "Arts & Humanities 0 ... Engineering & Technology 84 ..."
    const pairs = [...t.matchAll(/([A-Za-z&\\s]+)\\s+(\\d+)/g)];
    if (pairs.length) {
      categories = pairs.map(p => p[1].trim());
      data = pairs.map(p => Number(p[2]));
    }
  }

  return { categories, data };
}



async function collectEchartsCategorySeriesFromFrame(frame) {
  return await frame.evaluate(() => {
    function pickAxis(axis){
      if (!axis) return [];
      if (Array.isArray(axis)) return axis[0]?.data || [];
      return axis.data || [];
    }
    function toStr(x){ return x==null ? '' : String(x); }
    function toNum(x){ return (x==null || x==='') ? null : Number(x); }

    const out = [];
    const candidates = document.querySelectorAll('[id][_echarts_instance_], #wcu_overview1');
    for (const el of candidates) {
      const id = el.id || '';
      // eslint-disable-next-line no-undef
      const inst = (window.echarts && window.echarts.getInstanceByDom) ? window.echarts.getInstanceByDom(el) : null;
      if (!inst) continue;

      const opt = inst.getOption() || {};
      const sArr = Array.isArray(opt.series) ? opt.series : (opt.series ? [opt.series] : []);
      const first = sArr.find(s => Array.isArray(s.data));
      if (!first) continue;

      let cats = pickAxis(opt.xAxis);
      if (!cats?.length) cats = pickAxis(opt.yAxis);
      cats = (cats || []).map(toStr);
      const vals = (first.data || []).map(toNum);

      out.push({ id, categories: cats, data: vals, seriesName: toStr(first.name || '') });
    }
    return out;
  });
}

function pickBestSubjectChart(cands) {
  if (!cands.length) return null;
  // pilih chart dengan kategori terbanyak
  return cands.sort((a,b)=>(b.categories.length)-(a.categories.length))[0];
}

async function collectEchartsRadarFromFrame(frame) {
  return await frame.evaluate(() => {
    function toStr(x){ return x==null ? '' : String(x); }
    function toNum(x){ return (x==null || x==='') ? null : Number(x); }

    const out = [];
    const els = Array.from(document.querySelectorAll('[id][_echarts_instance_], #wcu_overview1'));
    for (const el of els) {
      const id = el.id || '';
      // eslint-disable-next-line no-undef
      const inst = (window.echarts && window.echarts.getInstanceByDom) ? window.echarts.getInstanceByDom(el) : null;
      if (!inst) continue;

      const opt = inst.getOption() || {};
      const sArr = Array.isArray(opt.series) ? opt.series : (opt.series ? [opt.series] : []);
      // cari seri radar
      const radarSeries = sArr.find(s => toStr(s.type).toLowerCase() === 'radar' && Array.isArray(s.data));
      if (!radarSeries) continue;

      // indikator bisa di opt.radar atau opt.radar[0]
      const radar = Array.isArray(opt.radar) ? opt.radar[0] : opt.radar;
      const indicators = (radar && radar.indicator) || [];
      const categories = indicators.map((it, i) => toStr(it.text || it.name || `dim_${i+1}`));

      const vals = (radarSeries.data?.[0]?.value || []).map(toNum);
      out.push({ id, categories, data: vals, seriesName: toStr(radarSeries.name || 'Subject Area') });
    }
    return out;
  });
}

function pickBestRadarChart(cands) {
  if (!cands?.length) return null;
  let best = null, bestScore = -1;
  for (const c of cands) {
    const cats = c.categories || [];
    const vals = c.data || [];
    // prefer 5 ± 0 (beri toleransi 4–8)
    const n = cats.length;
    let score = (n === 5 ? 10 : (n >= 4 && n <= 8 ? 6 : 0));
    // keyword subject area
    const txt = cats.join(' ').toLowerCase();
    if (/arts/.test(txt)) score += 2;
    if (/engineering/.test(txt)) score += 2;
    if (/natural/.test(txt)) score += 2;
    if (/life/.test(txt)) score += 2;
    if (/social/.test(txt)) score += 2;
    // ada angka non-null
    if (vals.some(v => typeof v === 'number')) score += 1;

    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best || null;
}

async function scrapeWcuWithBrowserAutoDetect(url, { timeoutMs = 45000 } = {}) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: timeoutMs });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      await new Promise(r => setTimeout(r, 1200));
    }

    // pastikan tab overview aktif + render terpancing
    try { await page.evaluate(() => { const t=document.querySelector('[href="#overview1"]'); if (t) t.click(); }); } catch {}
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight/2));
    await new Promise(r => setTimeout(r, 800));

    // 1) Kumpulkan radar dulu (main frame)
    let radarCands = await collectEchartsRadarFromFrame(page.mainFrame());

    // 2) Coba resize kalau belum ada
    if (!radarCands.length) {
      await page.evaluate(()=>window.dispatchEvent(new Event('resize')));
      await new Promise(r => setTimeout(r, 600));
      radarCands = await collectEchartsRadarFromFrame(page.mainFrame());
    }

    // 3) (Opsional) jelajahi iframe juga
    if (!radarCands.length) {
      const frames = page.frames().filter(f => f !== page.mainFrame());
      for (const f of frames) {
        try {
          const rc = await collectEchartsRadarFromFrame(f);
          radarCands = radarCands.concat(rc);
        } catch {}
      }
    }

    const pickRadar = pickBestRadarChart(radarCands);
    if (pickRadar) {
      return {
        categories: pickRadar.categories,
        data: pickRadar.data,
        seriesName: pickRadar.seriesName || 'Subject Area',
        optionSource: 'echarts-radar',
        chartId: pickRadar.id || null
      };
    }

    // Fallback terakhir: (kalau memang tidak ada radar),
    // bisa panggil kolektor cartesian lama — tapi kita TIDAK kembalikan itu untuk WCU
    return { categories: [], data: [], seriesName: '', optionSource: 'none' };
  } finally {
    await browser.close();
  }
}


async function getAffiliationWcu(affiliationId, { engine='auto' } = {}) {
  let lastErr;
  for (const base of DOMAINS) {
    const url = `${base}/affiliations/wcuanalysis/${affiliationId}`;
    try {
      if (engine !== 'browser') {
        const data = await scrapeWcuFromPage(url);
        if ((data.categories?.length || 0) && (data.data?.length || 0)) {
          return { source: url, ...data };
        }
      }
      const data2 = await scrapeWcuWithBrowserAutoDetect(url);
      return { source: url, ...data2 };
    } catch (e) { lastErr = e; }
  }
  throw new Error(`Gagal mengambil WCU analysis: ${lastErr?.message || 'unknown error'}`);
}

async function getAffiliationDepartments(affiliationId) {
  const base = "https://sinta.kemdiktisaintek.go.id";
  const url = `${base}/affiliations/departments/${affiliationId}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const departments = [];

  // Loop tiap baris data departemen
  $(".row.d-item").each((_, el) => {
    const $el = $(el);

    // Ambil level (S1, S2, D3)
    const level = $el.find(".tbl-content-meta span").first().text().trim();

    // Ambil nama departemen
    const $link = $el.find(".tbl-content-name a").first();
    const name = $link.text().trim();
    const href = $link.attr("href");
    const urlFull = href?.startsWith("http") ? href : `${base}${href}`;

    // Ambil SINTA Score
    const sintaOverallText = $el
      .find(".profile-hindex .text-warning")
      .text()
      .replace(/\s+/g, " ")
      .trim();
    const sinta3YrText = $el
      .find(".profile-hindex .text-success")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const sintaOverallMatch = sintaOverallText.match(/Overall\s*:\s*([\d.,]+)/i);
    const sinta3YrMatch = sinta3YrText.match(/3Yr\s*:\s*([\d.,]+)/i);

    const sintaOverall = sintaOverallMatch ? sintaOverallMatch[1] : "0";
    const sinta3Yr = sinta3YrMatch ? sinta3YrMatch[1] : "0";

    if (name && level) {
      const fullName = `${name} (${level})`;

      departments.push({
        name: fullName,
        level,
        url: urlFull,
        sintaScoreOverall: Number(sintaOverall.replace(/[,\.]/g, "")) || 0,
        sintaScore3Yr: Number(sinta3Yr.replace(/[,\.]/g, "")) || 0,
      });
    }
  });

  return {
    source: url,
    total: departments.length,
    departments,
  };
}

module.exports = { getAffiliationDepartments };
// === Scrape 1 halaman ===
async function scrapeAuthorsPage(affiliationId, page = 1) {
  const baseUrl = `https://sinta.kemdiktisaintek.go.id/affiliations/authors/${affiliationId}?page=${page}`;
  const html = await fetchHtml(baseUrl);
  const $ = cheerio.load(html);

  const authors = [];

  $(".au-item").each((_, el) => {
    const $el = $(el);
    const nameEl = $el.find(".profile-name a[href*='/authors/profile/']");
    const name = nameEl.text().trim();
    const authorUrl = nameEl.attr("href");

    // ambil gambar profil (jika ada)
    const imgEl = $el.find("img.avatar, img.img-thumbnail").first();
    const imageUrl = imgEl.attr("src") || null;

    const deptEl = $el.find(".profile-dept a[href*='/departments/profile/']");
    const deptName = deptEl.text().replace(/\s+/g, " ").trim();
    const deptUrl = deptEl.attr("href");

    const idMatch = $el.find(".profile-id:contains('ID')").text().match(/ID\s*:\s*(\d+)/);
    const authorId = idMatch ? idMatch[1] : null;

    const scopusH = parseInt(
      $el.find(".profile-hindex .text-warning").text().replace(/\D+/g, "") || 0
    );
    const gsH = parseInt(
      $el.find(".profile-hindex .text-success").text().replace(/\D+/g, "") || 0
    );

    const scores = {};
    $el.find(".stat-text").each((_, st) => {
      const label = $(st).text().trim();
      const val = $(st).prev(".stat-num").text().trim();
      scores[label] = Number(val.replace(/\D+/g, "")) || 0;
    });

    authors.push({
      name,
      authorId,
      authorUrl,
      imageUrl, // ⬅️ tambahkan di sini
      department: { name: deptName, url: deptUrl },
      scopusHIndex: scopusH,
      gsHIndex: gsH,
      sintaScore3Yr: scores["SINTA Score 3Yr"] || 0,
      sintaScoreOverall: scores["SINTA Score"] || 0,
      affilScore3Yr: scores["Affil Score 3Yr"] || 0,
      affilScoreOverall: scores["Affil Score"] || 0,
    });
  });

  // Ambil info pagination
  const pageText = $(".pagination-text small").text();
  const match = pageText.match(/Page\s+(\d+)\s+of\s+(\d+)/i);
  const currentPage = match ? parseInt(match[1]) : page;
  const totalPages = match ? parseInt(match[2]) : 1;

  return { authors, currentPage, totalPages, source: baseUrl };
}

// === Scrape Semua Halaman ===
async function scrapeAllAuthors(affiliationId) {
  const first = await scrapeAuthorsPage(affiliationId, 1);
  const allAuthors = [...first.authors];
  const totalPages = first.totalPages;

  if (totalPages > 1) {
    for (let p = 2; p <= totalPages; p++) {
      try {
        console.log(`Fetching page ${p} of ${totalPages}...`);
        const next = await scrapeAuthorsPage(affiliationId, p);
        allAuthors.push(...next.authors);
      } catch (err) {
        console.warn(`⚠️ Failed to fetch page ${p}:`, err.message);
      }
    }
  }

  return {
    source: `https://sinta.kemdiktisaintek.go.id/affiliations/authors/${affiliationId}`,
    totalPages,
    totalAuthors: allAuthors.length,
    authors: allAuthors,
  };
}

async function scrapeAffiliationResearches(affiliationId) {
  if (!affiliationId) {
    throw new Error("Missing affiliationId");
  }

  const url = `https://sinta.kemdiktisaintek.go.id/affiliations/profile/${affiliationId}/?view=researches`;

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const researchList = [];

    $(".ar-list-item").each((_, el) => {
      const $el = $(el);

      // Judul penelitian
      const title = $el.find(".ar-title a").first().text().trim();

      // Leader
      const leaderText = $el
        .find(".ar-meta a")
        .filter((_, a) => $(a).text().includes("Leader"))
        .text()
        .replace("Leader :", "")
        .trim();

      // Sumber pendanaan (MANDIRI / PFR / INTERNAL, dll)
      const funding = $el.find(".ar-meta .ar-pub").text().trim();

      // Personil (bisa kosong)
      const personilLinks = [];
      $el.find(".ar-meta a[href*='/authors/profile/']").each((_, link) => {
        const name = $(link).text().trim();
        const href = $(link).attr("href");
        if (name) personilLinks.push({ name, url: href });
      });
      const personils = personilLinks.length > 0
        ? personilLinks
        : [{ name: "-", url: null }];

      // Tahun & Nominal dana
      const year = $el.find(".ar-year").text().replace(/\D+/g, "");
      const nominal = $el.find(".ar-quartile").text().replace("Rp.", "").trim();

      researchList.push({
        title,
        leader: leaderText,
        funding,
        personils,
        year: year || null,
        nominal: nominal || null,
      });
    });

    return {
      ok: true,
      source: url,
      total: researchList.length,
      data: researchList,
    };
  } catch (err) {
    console.error("❌ Failed to scrape researches:", err.message);
    return {
      ok: false,
      error: err.message,
      source: url,
      data: [],
    };
  }
}



module.exports = {scrapeAffiliationResearches, scrapeAllAuthors,scrapeAuthorsPage,getAffiliationDepartments,getAffiliationWcu,normalizeActivityView,getAuthorActivity,getAffiliationActivity,getAuthorStats,getAffiliationStats,normalizeView,getAffiliationCharts,getAuthorCharts,getAuthorArticlesAllViews,getAffiliationArticlesAllViews,getAffiliationScores, getAuthorScores}