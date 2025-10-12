const { Router } = require("express");
const {scrapeAllAuthors,scrapeAuthorsPage,getAffiliationDepartments,getAffiliationWcu,normalizeActivityView,getAuthorActivity,getAffiliationActivity,getAuthorStats,getAffiliationStats,normalizeView,getAuthorCharts,getAffiliationCharts,getAuthorArticlesByView,getAffiliationArticlesByView,getAffiliationScores, getAuthorScores} =  require("../utils/scrapping.js")
const { runScraping, startCron, stopCron } = require("../utils/scheduler")
const routers = Router()

// Single endpoint: GET /sinta?affiliationId=...&authorId=...
routers.get('/score', async (req, res) => {
  const { affiliationId, authorId } = req.query;

  if (!affiliationId && !authorId) {
    return res.status(400).json({
      error: 'Provide at least one of: affiliationId or authorId'
    });
  }

  try {
    const tasks = [];
    if (affiliationId) tasks.push(getAffiliationScores(String(affiliationId)));
    if (authorId) tasks.push(getAuthorScores(String(authorId)));
    const results = await Promise.all(tasks);
    res.json({ ok: true, data: results.length === 1 ? results[0] : results });
  } catch (err) {
    // log.error(err);
    res.status(500).json({ ok: false, error: 'Scrape failed', detail: String(err.message || err) });
  }
});

// GET /sinta/articles?authorId=51581&affiliationId=384&limit=30&maxPages=2
routers.get('/articles', async (req, res) => {
  try {
    const { authorId, affiliationId } = req.query;
    const view = (req.query.view || 'scopus').toString().toLowerCase();
    const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10), 200));
    const maxPages = Math.max(1, Math.min(parseInt(req.query.maxPages || '1', 10), 10));

    if (!authorId && !affiliationId) {
      return res.status(400).json({
        ok: false,
        error: 'BadRequest',
        detail: 'Provide at least one of: authorId or affiliationId'
      });
    }

    let data;
    if (authorId && affiliationId) {
      const [authorArticles, affiliationArticles] = await Promise.all([
        getAuthorArticlesByView(String(authorId), { view, maxPages, limit }),
        getAffiliationArticlesByView(String(affiliationId), { view, maxPages, limit })
      ]);
      data = { author: authorArticles, affiliation: affiliationArticles };
    } else if (authorId) {
      data = await getAuthorArticlesByView(String(authorId), { view, maxPages, limit });
    } else {
      data = await getAffiliationArticlesByView(String(affiliationId), { view, maxPages, limit });
    }

    res.json({ ok: true, view, data, meta: { limit, maxPages } });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Scrape failed', detail: e.message || String(e) });
  }
});

// GET /sinta/charts?affiliationId=2136&view=scopus&engine=browser
// GET /sinta/charts?authorId=169786&view=rama
routers.get('/charts', async (req, res) => {
  try {
    const { affiliationId, authorId } = req.query;
    const view = normalizeView(req.query.view || 'scopus');
    const engine = (req.query.engine || 'auto').toString().toLowerCase();

    if (!affiliationId && !authorId) {
      return res.status(400).json({
        ok: false, error: 'BadRequest',
        detail: 'Gunakan salah satu parameter: affiliationId atau authorId'
      });
    }

    let data;
    if (authorId && affiliationId) {
      const [author, affiliation] = await Promise.all([
        getAuthorCharts(String(authorId), { view, engine }),
        getAffiliationCharts(String(affiliationId), { view, engine })
      ]);
      data = { author, affiliation };
    } else if (authorId) {
      data = await getAuthorCharts(String(authorId), { view, engine });
    } else {
      data = await getAffiliationCharts(String(affiliationId), { view, engine });
    }

    res.json({ ok: true, view, engine, data });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Scrape failed', detail: e.message || String(e) });
  }
});


// GET /sinta/stats?affiliationId=2136&view=scopus
// GET /sinta/stats?authorId=169786&view=googlescholar
// Opsional: &includeHidden=true  (ikutkan kolom .d-none/WOS)
routers.get('/stats', async (req, res) => {
  try {
    const { affiliationId, authorId } = req.query;
    const view = normalizeView(req.query.view || 'scopus');
    const includeHidden = String(req.query.includeHidden || 'false').toLowerCase() === 'true';

    if (!affiliationId && !authorId) {
      return res.status(400).json({
        ok: false,
        error: 'BadRequest',
        detail: 'Gunakan salah satu parameter: affiliationId atau authorId'
      });
    }

    let data;
    if (authorId && affiliationId) {
      const [author, affiliation] = await Promise.all([
        getAuthorStats(String(authorId), { view, includeHidden }),
        getAffiliationStats(String(affiliationId), { view, includeHidden })
      ]);
      data = { author, affiliation };
    } else if (authorId) {
      data = await getAuthorStats(String(authorId), { view, includeHidden });
    } else {
      data = await getAffiliationStats(String(affiliationId), { view, includeHidden });
    }

    res.json({ ok: true, view, includeHidden, data });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Scrape failed', detail: e.message || String(e) });
  }
});


// GET /sinta/activity?affiliationId=2136
// GET /sinta/activity?affiliationId=2136&view=services
// GET /sinta/activity?authorId=169786&view=researches
// Opsional: &engine=browser (paksa headless)
routers.get('/activity', async (req, res) => {
  try {
    const { affiliationId, authorId } = req.query;
    const view = normalizeActivityView(req.query.view || '');
    const engine = (req.query.engine || 'auto').toString().toLowerCase();

    if (!affiliationId && !authorId) {
      return res.status(400).json({
        ok: false,
        error: 'BadRequest',
        detail: 'Gunakan salah satu parameter: affiliationId atau authorId'
      });
    }

    let data;
    if (authorId && affiliationId) {
      const [author, affiliation] = await Promise.all([
        getAuthorActivity(String(authorId), { view, engine }),
        getAffiliationActivity(String(affiliationId), { view, engine })
      ]);
      data = { author, affiliation };
    } else if (authorId) {
      data = await getAuthorActivity(String(authorId), { view, engine });
    } else {
      data = await getAffiliationActivity(String(affiliationId), { view, engine });
    }

    res.json({ ok: true, view, engine, data });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Scrape failed', detail: e.message || String(e) });
  }
});

// GET /sinta/wcu?affiliationId=2136
// Opsional: &engine=browser  (paksa headless)
routers.get('/wcu', async (req, res) => {
  try {
    const { affiliationId } = req.query;
    const engine = (req.query.engine || 'auto').toString().toLowerCase();

    if (!affiliationId) {
      return res.status(400).json({ ok: false, error: 'BadRequest', detail: 'Butuh parameter affiliationId' });
    }

    const data = await getAffiliationWcu(String(affiliationId), { engine });
    res.json({ ok: true, engine, data });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Scrape failed', detail: e.message || String(e) });
  }
});

// GET /sinta/departments?affiliationId=2136
routers.get('/departments', async (req, res) => {
  try {
    const { affiliationId } = req.query;
    if (!affiliationId) {
      return res.status(400).json({ ok: false, error: 'Missing affiliationId' });
    }

    const data = await getAffiliationDepartments(affiliationId);
    res.json({ ok: true, data });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Scrape failed', detail: e.message || String(e) });
  }
});



// === Express Endpoint ===
routers.get("/authors", async (req, res) => {
  try {
    const { affiliationId, all = "true" } = req.query;
    if (!affiliationId)
      return res.status(400).json({ ok: false, error: "Missing affiliationId" });

    const result =
      all === "true"
        ? await scrapeAllAuthors(affiliationId)
        : await scrapeAuthorsPage(affiliationId, req.query.page || 1);

    res.json({ ok: true, data: result });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: "Scraping failed",
      detail: err.message || String(err),
    });
  }
});


// === EXPRESS ENDPOINTS JALANKAN SCRAPPING ===
// trigger sekali jalan (testing)
// === Express Endpoints ===
routers.post('/scheduler/run', async (req, res) => {
  try {
    const save = (req.query.save ?? 'false').toString().toLowerCase() === 'true';
    const summary = await runScraping({ saveToFile: save });
    res.json(summary);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

routers.post('/scheduler/start', (req, res) => {
  const started = startCron();
  res.json({ ok: true, started });
});

routers.post('/scheduler/stop', (req, res) => {
  const stopped = stopCron();
  res.json({ ok: true, stopped });
});


module.exports = routers;