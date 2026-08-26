const { put, get } = require('@vercel/blob');

const PATHNAME = 'config.json';
const DEFAULT_CONFIG = { pausedCompanies: [], excludeKeywords: ['切り抜き', '横型'] };

async function readConfig() {
  const result = await get(PATHNAME, { access: 'private', useCache: false }).catch(() => null);
  if (!result) return DEFAULT_CONFIG;
  const chunks = [];
  for await (const chunk of result.stream) chunks.push(chunk);
  const text = Buffer.concat(chunks.map(c => Buffer.from(c))).toString('utf-8');
  try { return JSON.parse(text); } catch { return DEFAULT_CONFIG; }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const config = await readConfig();
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(config);
    return;
  }

  if (req.method === 'POST') {
    let parsed = req.body;
    if (typeof parsed === 'string') {
      try { parsed = JSON.parse(parsed); } catch { parsed = null; }
    }
    if (!parsed || typeof parsed !== 'object') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      try { parsed = JSON.parse(raw); } catch { parsed = null; }
    }
    if (!parsed || typeof parsed !== 'object') {
      res.status(400).json({ error: '不正なデータです' });
      return;
    }
    const config = {
      pausedCompanies: Array.isArray(parsed.pausedCompanies) ? parsed.pausedCompanies.map(String) : [],
      excludeKeywords: Array.isArray(parsed.excludeKeywords) ? parsed.excludeKeywords.map(String) : []
    };
    await put(PATHNAME, JSON.stringify(config), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });
    res.status(200).json(config);
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
