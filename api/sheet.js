const SHEET_ID = '15BvUH4znC3NvVw-Fn35xvqD8bm3T3JvEC705SMoRbFc';
const GID = '1671993158';

module.exports = async (req, res) => {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;
  const r = await fetch(url);
  if (!r.ok) {
    res.status(502).send(`スプレッドシートの取得に失敗しました（HTTP ${r.status}）`);
    return;
  }
  const text = await r.text();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(text);
};
