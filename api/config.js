const { put } = require('@vercel/blob');

const PATHNAME = 'config.json';
const DEFAULT_CONFIG = { pausedCompanies: [], excludeKeywords: ['切り抜き', '横型'] };

/* @vercel/blob の list()/get() がこの実行環境で応答しないため、
   読み取り専用トークンからストアIDを取り出し、ブロブの固定URLへ直接アクセスする */
function blobBaseUrl() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  const m = token.match(/^vercel_blob_rw_([a-zA-Z0-9]+)_/);
  return m ? `https://${m[1].toLowerCase()}.private.blob.vercel-storage.com` : null;
}

async function readConfig() {
  const base = blobBaseUrl();
  if (!base) return DEFAULT_CONFIG;
  const res = await fetch(`${base}/${PATHNAME}`, {
    headers: { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
    cache: 'no-store'
  }).catch(() => null);
  if (!res || !res.ok) return DEFAULT_CONFIG;
  try { return await res.json(); } catch { return DEFAULT_CONFIG; }
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
