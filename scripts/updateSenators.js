const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const yaml = require('yaml');

async function updateSenators() {
  const jsonPath = path.join(__dirname, '..', 'public', 'senators-rankings.json');
  const data = fs.readFileSync(jsonPath, 'utf8');
  let senators = JSON.parse(data);

  try {
    console.log('Fetching current legislators mapping from unitedstates repo...');
    const legislatorsRes = await fetch('https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml');
    if (!legislatorsRes.ok) throw new Error('Mapping fetch failed');
    const yamlText = await legislatorsRes.text();
    const legislators = yaml.parse(yamlText);

    const bioguideToGovtrack = {};
    legislators.forEach(leg => {
      if (leg.id?.bioguide) bioguideToGovtrack[leg.id.bioguide] = leg.id.govtrack;
    });

    console.log('Trying to fetch 119th sponsorship stats from GovTrack...');
    const statsUrl = 'https://www.govtrack.us/data/congress/119/stats/sponsorshipanalysis.json';
    const statsRes = await fetch(statsUrl);
    
    if (statsRes.ok) {
      const statsData = await statsRes.json();
      console.log('Stats file found! Updating with real (early) counts...');
      
      senators.forEach(senator => {
        const gtId = bioguideToGovtrack[senator.bioguideId];
        if (gtId && statsData[gtId]) {
          const s = statsData[gtId];
          senator.sponsoredBills = s.sponsored || 0;
          senator.cosponsoredBills = s.cosponsored || 0;
          senator.becameLawBills = s.enacted || 0;
        } else {
          senator.sponsoredBills = 0;
          senator.cosponsoredBills = 0;
          senator.becameLawBills = 0;
        }
        // Amendments & votes still low
        senator.sponsoredAmendments = 0;
        senator.cosponsoredAmendments = 0;
        senator.becameLawAmendments = 0;
        senator.votes = 0;
      });
    } else {
      console.log('Stats file not ready yet (normal for brand-new Congress). Setting all bill stats to 0...');
      senators.forEach(senator => {
        senator.sponsoredBills = 0;
        senator.cosponsoredBills = 0;
        senator.becameLawBills = 0;
        senator.sponsoredAmendments = 0;
        senator.cosponsoredAmendments = 0;
        senator.becameLawAmendments = 0;
        senator.votes = 0;
      });
    }
  } catch (err) {
    console.warn('Fetch error (likely early Congress—no data yet):', err.message);
    console.log('Falling back to all zeros...');
    senators.forEach(senator => {
      senator.sponsoredBills = 0;
      senator.cosponsoredBills = 0;
      senator.becameLawBills = 0;
      senator.sponsoredAmendments = 0;
      senator.cosponsoredAmendments = 0;
      senator.becameLawAmendments = 0;
      senator.votes = 0;
    });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(senators, null, 2));
  console.log('Update complete! Commit and push public/senators-rankings.json to see changes live.');
}

updateSenators().catch(console.error);
