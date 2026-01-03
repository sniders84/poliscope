
// /api/govtrack.js
export default async function handler(req, res) {
  // Allow GET only (simple and safe)
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
    const upstream = await fetch(`https://www.govtrack.us/api/v2/person/${id}`);
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: 'GovTrack request failed' });
      return;
    }

    const data = await upstream.json();

    // Add simple caching to reduce repeated calls
    // Cache for 6 hours (21600 seconds)
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=43200');

    // Allow your frontend to read this response
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.status(200).json(data);
  } catch (err) {
    console.error('GovTrack fetch failed', err);
    res.status(500).json({ error: 'GovTrack fetch failed' });
  }
}
