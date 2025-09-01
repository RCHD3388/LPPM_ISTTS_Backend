const { Router } = require("express");
const {getAuthorArticlesByView,getAffiliationArticlesByView,getAffiliationScores, getAuthorScores} =  require("../utils/scrapping.js")
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

module.exports = routers;