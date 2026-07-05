// /api/upload-image — Vercel Serverless Function
//
// Nahraje obrázek (base64) z admin panelu do assets/img/ v GitHub
// repozitáři přes GitHub Contents API. Používá se pro galerii
// (kategorie/alba), kde si uživatel sám nahrává fotky.
//
// GitHub token zůstává pouze v proměnných prostředí na Vercelu —
// frontend s ním nikdy nepřijde do styku.

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MAX_BASE64_LENGTH = 8 * 1024 * 1024; // ~6 MB binárních dat po dekódování

function verifyAdminToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  return token === process.env.ADMIN_SESSION_SECRET;
}

function sanitizeFileName(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // odstranění diakritiky
    .replace(/[^a-z0-9.\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metoda není povolena. Použijte POST.' });
  }
  if (!verifyAdminToken(req)) {
    return res.status(401).json({ error: 'Neautorizovaný přístup. Přihlaste se prosím znovu.' });
  }

  const { fileName, base64Data, folder = 'gallery' } = req.body || {};

  if (!fileName || typeof fileName !== 'string') {
    return res.status(400).json({ error: 'Chybí název souboru.' });
  }
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return res.status(400).json({ error: 'Nepovolený formát souboru. Povoleno: jpg, jpeg, png, webp, gif.' });
  }
  if (!base64Data || typeof base64Data !== 'string') {
    return res.status(400).json({ error: 'Chybí data obrázku.' });
  }
  if (base64Data.length > MAX_BASE64_LENGTH) {
    return res.status(400).json({ error: 'Soubor je příliš velký (max ~6 MB).' });
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
    return res.status(400).json({ error: 'Neplatný název složky.' });
  }

  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    GITHUB_BRANCH = 'main'
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({ error: 'Server není správně nakonfigurován (chybí GitHub proměnné prostředí).' });
  }

  // Base64 data mohou přijít i s data URL prefixem (data:image/png;base64,...) — odřízneme ho.
  const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

  const safeName = sanitizeFileName(fileName.replace(/\.[^.]+$/, '')) + '.' + ext;
  const uniqueName = `${Date.now()}-${safeName}`;
  const filePath = `assets/img/${folder}/${uniqueName}`;

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  try {
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Admin: nahrání obrázku ${uniqueName}`,
        content: cleanBase64,
        branch: GITHUB_BRANCH
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'Nahrání obrázku do GitHubu selhalo.', detail: errData.message });
    }

    return res.status(200).json({
      success: true,
      path: filePath
    });
  } catch (err) {
    return res.status(500).json({ error: 'Neočekávaná chyba serveru.', detail: err.message });
  }
};
