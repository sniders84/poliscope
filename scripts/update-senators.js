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
          const number = (item.number || '').toLowerCase();
          const actionText = (item.latestAction?.text || '').toLowerCase();
          if (number.startsWith('s.amdt.') || item.amendmentNumber) {
            sen.sponsoredAmendments++;
            if (actionText.includes('became law') || actionText.includes('enacted') || actionText.includes('agreed to')) sen.becameLawAmendments++;
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
          const number = (item.number || '').toLowerCase();
          if (number.startsWith('s.amdt.') || item.amendmentNumber) {
            sen.cosponsoredAmendments++;
          } else {
            sen.cosponsoredBills++;
          }
        }
      });
    }

    // Missed votes count (scrape senate.gov votes and count "Not Voting" for this senator)
    sen.votes = 0;  // Missed count
    const totalVotes = 4;  // From senate.gov - update this manually when more votes happen
    const voteUrls = [  // List of vote detail URLs from senate.gov
      'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00004.htm',
      'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00003.htm',
      'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00002.htm',
      'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1191/vote_119_1_00001.htm'
    ];

    for (const vUrl of voteUrls) {
      const vRes = await fetch(vUrl);
      if (vRes.ok) {
        const vText = await vRes.text();
        if (vText.includes(sen.name) && vText.includes('Not Voting')) sen.votes++;
      }
    }

    // If you want %, add: sen.missedPct = (sen.votes / totalVotes) * 100;

    console.log(`Updated ${sen.name}: sBills ${sen.sponsoredBills} sAmend ${sen.sponsoredAmendments} cBills ${sen.cosponsoredBills} cAmend ${sen.cosponsoredAmendments} becameLawB ${sen.becameLawBills} missed ${sen.votes}`);
  } catch (err) {
    console.log(`Error for ${sen.name}: ${err.message}`);
  }
}

(async () => {
  for (const sen of senators) {
    await updateSenator(sen);
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2) + '\n');
  console.log('Schema fully updated!');
})();
