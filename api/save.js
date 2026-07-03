// /api/save — Vercel Serverless Function
//
// Přijme nová data z admin panelu, ověří přihlášení admina a uloží je
// commitem do GitHub repozitáře (GitHub Contents API). GitHub token
// zůstává pouze v proměnných prostředí na Vercelu — frontend s ním
// nikdy nepřijde do styku a nikdy negeneruje commit sám.
//
// Povolené soubory k zápisu jsou omezené na whitelist v /data,
// aby endpoint nešlo zneužít k přepsání libovolného souboru v repu.

const ALLOWED_FILES = new Set([
  'data/content.json',
  'data/theme.json'
]);

function verifyAdminToken(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  return token === process.env.ADMIN_SESSION_SECRET;
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

  const { file, content, message } = req.body || {};

  if (!file || !ALLOWED_FILES.has(file)) {
    return res.status(400).json({ error: 'Tento soubor nelze přes API upravovat.' });
  }
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'Neplatný obsah souboru.' });
  }

  // Ověření, že jde o validní JSON, než ho zapíšeme do repozitáře.
  try {
    JSON.parse(content);
  } catch (e) {
    return res.status(400).json({ error: 'Obsah není platný JSON: ' + e.message });
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

  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${file}`;

  try {
    // 1) Zjistíme aktuální SHA souboru (GitHub to vyžaduje pro update).
    let sha;
    const getRes = await fetch(`${apiBase}?ref=${GITHUB_BRANCH}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json'
      }
    });
    if (getRes.ok) {
      const getData = await getRes.json();
      sha = getData.sha;
    } else if (getRes.status !== 404) {
      const errData = await getRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'Nepodařilo se načíst aktuální verzi souboru z GitHubu.', detail: errData.message });
    }

    // 2) Zapíšeme nový obsah (commit).
    const putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: message || `Aktualizace obsahu: ${file}`,
        content: Buffer.from(content, 'utf-8').toString('base64'),
        branch: GITHUB_BRANCH,
        ...(sha ? { sha } : {})
      })
    });

    if (!putRes.ok) {
      const errData = await putRes.json().catch(() => ({}));
      return res.status(502).json({ error: 'Uložení do GitHubu selhalo.', detail: errData.message });
    }

    const putData = await putRes.json();
    return res.status(200).json({
      success: true,
      commit: putData.commit ? putData.commit.sha : null,
      file
    });
  } catch (err) {
    return res.status(500).json({ error: 'Neočekávaná chyba serveru.', detail: err.message });
  }
};
