// /api/govtrack.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const id = req.query.id;
  if (!id) {
    res.status(400).json({ error: 'Missing GovTrack id: use /api/govtrack?id=1234' });
    return;
  }

  try {
    const upstream = await fetch(`https://www.govtrack.us/api/v2/person/${id}`, {
      headers: {
        'User-Agent': 'PoliscopeApp/1.0 (mailto:your-email@example.com)'
      }
    });

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'GovTrack request failed' });
      return;
    }

    const data = await upstream.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');

    res.status(200).json(data);
  } catch (err) {
    console.error('GovTrack fetch failed', err);
    res.status(500).json({ error: 'GovTrack fetch failed' });
  }
}
