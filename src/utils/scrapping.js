// Helper: fetch HTML with headers + timeout + retries
const cheerio = require('cheerio')
const axios = require("axios")
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

// -------- Articles scraping helpers --------
// ====== Article scraping (exact selectors you provided) ======

function viewToQuery(view, { forceForAuthor = false } = {}) {
  // Normalize
  const v = (view || 'scopus').toLowerCase();

  // Supported views
  const allowed = new Set(['scopus', 'garuda', 'googlescholar', 'rama']);

  // Fallback to scopus if unknown
  const picked = allowed.has(v) ? v : 'scopus';

  // Affiliation pages originally didn't need ?view=scopus (implicit),
  // but for AUTHOR pages you want ?view=scopus explicitly.
  // We'll return "" only when:
  //   - picked === 'scopus' AND we are NOT forcing it (i.e., affiliation).
  if (picked === 'scopus' && !forceForAuthor) return '';

  return `?view=${picked}`;
}

function buildAffiliationArticleUrls(affiliationId, view) {
  // For affiliation: keep old behavior (scopus has no param),
  // but pass ?view=garuda / ?view=googlescholar / ?view=rama if requested.
  const q = viewToQuery(view, { forceForAuthor: false });
  return DOMAINS.map(base =>
    `${base}/affiliations/profile/${affiliationId}/${q}`.replace(/\/\?/, '/?')
  );
}

function buildAuthorArticleUrls(authorId, view) {
  // For author: ALWAYS include ?view=<picked>, even for scopus.
  const q = viewToQuery(view, { forceForAuthor: true });
  return DOMAINS.map(base =>
    `${base}/authors/profile/${authorId}/${q}`.replace(/\/\?/, '/?')
  );
}

// Parse one page that contains .ar-list-item blocks
function parseArListPage(html, pageUrl) {
  const $ = cheerio.load(html);
  const items = [];

  $('.ar-list-item').each((_, el) => {
    const $el = $(el);

    // Title + external link (often Scopus/GS)
    const $titleA = $el.find('.ar-title a').first();
    const title = $titleA.text().replace(/\s+/g, ' ').trim() || null;
    const extLink = $titleA.attr('href') || null;

    // Meta block (venue, quartile, creator)
    const $metaBlocks = $el.find('.ar-meta');
    const $metaTop = $metaBlocks.eq(0);
    const $metaBottom = $metaBlocks.eq(1);

    const $quartile = $metaTop.find('.ar-quartile').first();
    const quartile = $quartile.text().replace(/\s+/g, ' ').trim() || null;

    const $venueA = $metaTop.find('.ar-pub').first();
    const venue = $venueA.text().replace(/\s+/g, ' ').trim() || null;
    const venueLink = $venueA.attr('href') ? new URL($venueA.attr('href'), pageUrl).toString() : null;

    // Creator text like: "Creator : Hartono L.S."
    let creators = null;
    const creatorAnchor = $metaTop.find('a').filter((_, a) => {
      return $(a).text().toLowerCase().includes('creator');
    }).first();
    if (creatorAnchor.length) {
      creators = creatorAnchor.text().replace(/^\s*creator\s*:\s*/i, '').replace(/\s+/g, ' ').trim() || null;
    }

    // Year + Cited
    const yearText = $metaBottom.find('.ar-year').first().text();
    const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? Number(yearMatch[0]) : null;

    const citedText = $metaBottom.find('.ar-cited').first().text();
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
      // SINTA sometimes also links to its own document page inside .ar-title/.ar-meta;
      // if you later want SINTA doc IDs, you can look for links containing "/documents/"
        creators
      });
    }
  });

  return items;
}

// Best-effort pagination detector (if SINTA provides pagination controls)
function findNextPageUrl($, currentUrl) {
  let href =
    $('a[rel="next"]').attr('href') ||
    $('a:contains("Next")').filter((_, el) => $(el).text().trim().toLowerCase() === 'next').attr('href') ||
    $('a:contains("Berikutnya")').filter((_, el) => $(el).text().trim().toLowerCase() === 'berikutnya').attr('href');

  if (!href) return null;
  try {
    return new URL(href, currentUrl).toString();
  } catch {
    return null;
  }
}

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

async function getAffiliationArticlesByView(affiliationId, { view = 'scopus', maxPages = 1, limit = 50 } = {}) {
  let lastErr;
  for (const url of buildAffiliationArticleUrls(affiliationId, view)) {
    try {
      const list = await collectArticles(url, { maxPages, limit });
      return list;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Unable to fetch affiliation articles (${view}): ${lastErr?.message || 'unknown error'}`);
}

async function getAuthorArticlesByView(authorId, { view = 'scopus', maxPages = 1, limit = 50 } = {}) {
  let lastErr;
  for (const url of buildAuthorArticleUrls(authorId, view)) {
    try {
      const list = await collectArticles(url, { maxPages, limit });
      return list;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`Unable to fetch author articles (${view}): ${lastErr?.message || 'unknown error'}`);
}



module.exports = {getAuthorArticlesByView,getAffiliationArticlesByView,getAffiliationScores, getAuthorScores}