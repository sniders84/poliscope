// scripts/merge-representatives.js
const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/representatives-rankings.json');
const legisPath = path.join(__dirname, '../public/legislation-representatives.json');
const committeesPath = path.join(__dirname, '../public/house-committees-current.json');
const misconductPath = path.join(__dirname, '../public/misconduct-representatives.json');

console.log('Starting merge-representatives.js');

let rankings;
try {
  rankings = JSON.parse(fs.readFileSync(rankingsPath, 'utf-8'));
  console.log(`Loaded ${rankings.length} representatives from rankings file`);
} catch (err) {
  console.error('Failed to read representatives-rankings.json:', err.message);
  process.exit(1);
}

let legis;
try {
  legis = JSON.parse(fs.readFileSync(legisPath, 'utf-8'));
  console.log(`Loaded ${legis.length} legislation records`);
} catch (err) {
  console.error('Failed to read legislation-representatives.json:', err.message);
  process.exit(1);
}

// Merge legislation data
const legisMap = new Map(legis.map(m => [m.bioguideId, m]));
for (const rep of rankings) {
  const legData = legisMap.get(rep.bioguideId);
  if (legData) {
    rep.sponsoredBills = legData.sponsoredBills || 0;
    rep.cosponsoredBills = legData.cosponsoredBills || 0;
    rep.becameLawBills = legData.becameLawBills || 0;
    rep.becameLawCosponsoredBills = legData.becameLawCosponsoredBills || 0;
    rep.lastUpdated = legData.lastUpdated || new Date().toISOString();
  } else {
    console.warn(`No legislation data for ${rep.bioguideId} (${rep.name})`);
  }
}

// Merge committees — only if file exists
if (fs.existsSync(committeesPath)) {
  try {
    const committees = JSON.parse(fs.readFileSync(committeesPath, 'utf-8'));
    console.log(`Loaded committees from ${committeesPath} (${committees.length} entries)`);

    // Assuming structure is array of { bioguideId, committees: [...] }
    const commMap = new Map(committees.map(c => [c.bioguideId, c.committees || []]));

    let mergedCount = 0;
    for (const rep of rankings) {
      const commData = commMap.get(rep.bioguideId);
      if (commData && commData.length > 0) {
        rep.committees = commData;
        mergedCount++;
      }
    }
    console.log(`Merged committees for ${mergedCount} representatives`);
  } catch (err) {
    console.error('Failed to parse/load house-committees-current.json:', err.message);
    // Continue anyway
  }
} else {
  console.warn('house-committees-current.json not found — committees remain empty');
}

// Merge misconduct — only if file exists
if (fs.existsSync(misconductPath)) {
  try {
    const misconduct = JSON.parse(fs.readFileSync(misconductPath, 'utf-8'));
    console.log(`Loaded misconduct from ${misconductPath} (${misconduct.length} entries)`);

    const misconductMap = new Map(misconduct.map(m => [m.bioguideId, m]));
    let mergedCount = 0;
    for (const rep of rankings) {
      const misData = misconductMap.get(rep.bioguideId);
      if (misData) {
        rep.misconductCount = misData.misconductCount || 0;
        rep.misconductTags = misData.misconductTags || [];
        mergedCount++;
      }
    }
    console.log(`Merged misconduct for ${mergedCount} representatives`);
  } catch (err) {
    console.error('Failed to parse/load misconduct-representatives.json:', err.message);
  }
} else {
  console.warn('misconduct-representatives.json not found — misconduct remains empty');
}

fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log(`Finished merge: ${rankings.length} representatives updated in representatives-rankings.json`);
