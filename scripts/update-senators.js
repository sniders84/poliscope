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

    sen.sponsoredBills = 0;
    sen.sponsoredAmendments = 0;
    sen.cosponsoredBills = 0;
    sen.cosponsoredAmendments = 0;
    sen.becameLawBills = 0;
    sen.becameLawAmendments = 0;

    if (sponsoredRes.ok) {
      const data = await sponsoredRes.json();
      const items = data.sponsoredLegislation || [];
      items.forEach(item => {
        if (item.congress === 119) {
          const type = (item.type || '').toLowerCase();
          const actionText = (item.latestAction?.text || '').toLowerCase();
          if (type.includes('amendment')) {
            sen.sponsoredAmendments++;
            if (actionText.includes('became law') || actionText.includes('enacted')) sen.becameLawAmendments++;
          } else {
            sen.sponsoredBills++;
            if (actionText.includes('became law') || actionText.includes('enacted')) sen.becameLawBills++;
          }
        }
      });
    }

    if (cosponsoredRes.ok) {
      const cosData = await cosponsoredRes.json();
      const cosItems = cosData.cosponsoredLegislation || [];
      cosItems.forEach(item => {
        if (item.congress === 119) {
          const type = (item.type || '').toLowerCase();
          if (type.includes('amendment')) {
            sen.cosponsoredAmendments++;
          } else {
            sen.cosponsoredBills++;
          }
        }
      });
    }

    // Missed votes count from GovTrack scrape
    sen.votes = 0;  // Missed count
    try {
      const gtUrl = `https://www.govtrack.us/congress/members/${sen.bioguideId}`;
      const gtRes = await fetch(gtUrl);
      if (gtRes.ok) {
        const text = await gtRes.text();
        const match = text.match(/Missed Votes<\/span>\s*<span[^>]*>(\d+)/);
        if (match) sen.votes = parseInt(match[1], 10);
      }
    } catch (e) {
      console.log(`GovTrack failed for ${sen.name}`);
    }

    console.log(`Updated ${sen.name}: sBills ${sen.sponsoredBills} sAmend ${sen.sponsoredAmendments} cBills ${sen.cosponsoredBills} cAmend ${sen.cosponsoredAmendments} becameLawB ${sen.becameLawBills} missed ${sen.votes}`);
  } catch (err) {
    console.log(`Error for ${sen.name}: ${err.message}`);
  }
}

(async () => {
  for (const sen of senators) {
    await updateSenator(sen);
    await new Promise(r => setTimeout(r, 1500));  // Polite delay
  }
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2) + '\n');
  console.log('Schema fully updated!');
})();
