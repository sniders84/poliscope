// scripts/merge-senators.js
const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/senators-rankings.json');
const legisPath = path.join(__dirname, '../public/legislation-senators.json');
const committeesPath = path.join(__dirname, '../public/senators-committees.json');  // ← your actual file

console.log('Starting merge-senators.js');

let rankings;
try {
  rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
  console.log(`Loaded ${rankings.length} senators from rankings file`);
} catch (err) {
  console.error('Failed to read senators-rankings.json:', err.message);
  process.exit(1);
}

let legis;
try {
  legis = JSON.parse(fs.readFileSync(legisPath, 'utf-8'));
  console.log(`Loaded ${legis.length} legislation records`);
} catch (err) {
  console.error('Failed to read legislation-senators.json:', err.message);
  process.exit(1);
}

// Merge legislation data
const legisMap = new Map(legis.map(m => [m.bioguideId, m]));
for (const sen of rankings) {
  const legData = legisMap.get(sen.bioguideId);
  if (legData) {
    Object.assign(sen, {
      sponsoredBills: legData.sponsoredBills || 0,
      cosponsoredBills: legData.cosponsoredBills || 0,
      becameLawBills: legData.becameLawBills || 0,
      becameLawCosponsoredBills: legData.becameLawCosponsoredBills || 0,
      lastUpdated: legData.lastUpdated || new Date().toISOString()
    });
  } else {
    console.warn(`No legislation data for ${sen.bioguideId} (${sen.name})`);
  }
}

// Committee merge — only if file exists
if (fs.existsSync(committeesPath)) {
  try {
    const committees = JSON.parse(fs.readFileSync(committeesPath, 'utf-8'));
    console.log(`Loaded committees from ${committeesPath}`);
    // Assuming structure is array of { bioguideId, committees: [...] }
    const commMap = new Map(committees.map(c => [c.bioguideId, c]));
    for (const sen of rankings) {
      const commData = commMap.get(sen.bioguideId);
      if (commData) {
        sen.committees = commData.committees || [];
      }
    }
    console.log('Merged committee data successfully');
  } catch (err) {
    console.error('Failed to parse/load senators-committees.json:', err.message);
    // Continue anyway — don't crash workflow
  }
} else {
  console.warn('senators-committees.json not found — skipping committee merge');
}

fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log(`Finished merge: ${rankings.length} senators updated in senators-rankings.json`);
