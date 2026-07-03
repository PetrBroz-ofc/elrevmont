// /api/login — Vercel Serverless Function
//
// Jednoduché ověření admin hesla proti proměnné prostředí ADMIN_PASSWORD.
// Po úspěšném ověření vrátí session token (ADMIN_SESSION_SECRET), který
// admin.html uloží do sessionStorage a posílá jako Bearer token
// při každém volání /api/save. Heslo samotné se nikdy neukládá
// na frontendu ani neopouští tento endpoint jako plain-text potvrzení.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda není povolena.' });
  }

  const { password } = req.body || {};
  const { ADMIN_PASSWORD, ADMIN_SESSION_SECRET } = process.env;

  if (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET) {
    return res.status(500).json({ error: 'Server není správně nakonfigurován (chybí přihlašovací proměnné).' });
  }

  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Nesprávné heslo.' });
  }

  return res.status(200).json({ success: true, token: ADMIN_SESSION_SECRET });
};
