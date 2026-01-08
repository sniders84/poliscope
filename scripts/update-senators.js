const fs = require('fs');
const fetch = require('node-fetch');

const jsonPath = 'public/senators-rankings.json';
const senators = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const apiKey = process.env.CONGRESS_API_KEY;
const headers = apiKey ? { 'X-Api-Key': apiKey } : {};

async function updateSenator(sen) {
  try {
    const base = `https://api.congress.gov/v3/member/${sen.bioguideId}`;
    const sponsoredUrl = `${base}/sponsored-legislation?limit=500`;
    const cosponsoredUrl = `${base}/cosponsored-legislation?limit=500`;

    const [sponsoredRes, cosponsoredRes] = await Promise.all([
      fetch(sponsoredUrl, { headers }),
      fetch(cosponsoredUrl, { headers })
    ]);

    let sponsoredBills = 0;
    let sponsoredAmendments = 0;
    let becameLawBills = 0;

    if (sponsoredRes.ok) {
      const data = await sponsoredRes.json();
      const items = data.sponsoredLegislation || [];
      items.forEach(item => {
        if (item.congress === 119) {  // Filter 119th
          if (item.type.toLowerCase().includes('amendment')) {
            sponsoredAmendments++;
          } else {
            sponsoredBills++;
          }
          if (item.latestAction?.text?.toLowerCase().includes('became law')) {
            becameLawBills++;
          }
        }
      });
    }

    let cosponsoredBills = 0;
    let cosponsoredAmendments = 0;
    // Similar for cosponsored if needed (becameLawAmendments rare)

    if (cosponsoredRes.ok) {
      const cosData = await cosponsoredRes.json();
      const cosItems = cosData.cosponsoredLegislation || [];
      cosItems.forEach(item => {
        if (item.congress === 119) {
          if (item.type.toLowerCase().includes('amendment')) {
            cosponsoredAmendments++;
          } else {
            cosponsoredBills++;
          }
        }
      });
    }

    // Missed votes - fallback to GovTrack (simple scrape)
    // GovTrack member page has "Missed Votes" gauge
    let missedVotes = 0;
    try {
      const gtRes = await fetch(`https://www.govtrack.us/congress/members/${sen.bioguideId}`);
      if (gtRes.ok) {
        const text = await gtRes.text();
        const match = text.match(/Missed Votes<\/span>\s*<span[^>]*>([\d.]+)%/);
        if (match) missedVotes = parseFloat(match[1]);
      }
    } catch {}  // Silent if fail

    sen.sponsoredBills = sponsoredBills;
    sen.sponsoredAmendments = sponsoredAmendments;
    sen.cosponsoredBills = cosponsoredBills;
    sen.cosponsoredAmendments = cosponsoredAmendments;
    sen.becameLawBills = becameLawBills;
    sen.becameLawAmendments = 0;  // Rare, add later if needed
    sen.votes = missedVotes;  // As % missed

    console.log(`Updated ${sen.name}: sponsoredBills ${sponsoredBills}, amendments ${sponsoredAmendments}, cosponsored ${cosponsoredBills}, becameLaw ${becameLawBills}, missedVotes ${missedVotes}%`);
  } catch (err) {
    console.log(`Error for ${sen.name}: ${err.message}`);
  }
}

(async () => {
  for (const sen of senators) {
    await updateSenator(sen);
    await new Promise(r => setTimeout(r, 1500));  // Slower delay for GovTrack
  }
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2) + '\n');
  console.log('Full schema update complete!');
})();
