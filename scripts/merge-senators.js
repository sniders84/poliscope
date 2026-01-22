// scripts/merge-senators.js
const fs = require('fs');
const path = require('path');

const rankingsPath = path.join(__dirname, '../public/senators-rankings.json');
const legisPath = path.join(__dirname, '../public/legislation-senators.json');
const committeesPath = path.join(__dirname, '../public/senators-committees.json');
const misconductPath = path.join(__dirname, '../public/misconduct-senators.json');

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
    sen.sponsoredBills = legData.sponsoredBills || 0;
    sen.cosponsoredBills = legData.cosponsoredBills || 0;
    sen.becameLawBills = legData.becameLawBills || 0;
    sen.becameLawCosponsoredBills = legData.becameLawCosponsoredBills || 0;
    sen.lastUpdated = legData.lastUpdated || new Date().toISOString();
  } else {
    console.warn(`No legislation data for ${sen.bioguideId} (${sen.name})`);
  }
}

// Merge committees — only if file exists
if (fs.existsSync(committeesPath)) {
  try {
    const committees = JSON.parse(fs.readFileSync(committeesPath, 'utf-8'));
    console.log(`Loaded committees from ${committeesPath} (${committees.length} entries)`);

    // Create lookup map (assuming array of { bioguideId, committees: [...] })
    const commMap = new Map(committees.map(c => [c.bioguideId, c.committees || []]));

    let mergedCount = 0;
    for (const sen of rankings) {
      const commData = commMap.get(sen.bioguideId);
      if (commData && commData.length > 0) {
        sen.committees = commData;
        mergedCount++;
      }
    }
    console.log(`Merged committees for ${mergedCount} senators`);
  } catch (err) {
    console.error('Failed to parse/load senators-committees.json:', err.message);
    // Continue anyway
  }
} else {
  console.warn('senators-committees.json not found — committees remain empty');
}

// Merge misconduct — only if file exists
if (fs.existsSync(misconductPath)) {
  try {
    const misconduct = JSON.parse(fs.readFileSync(misconductPath, 'utf-8'));
    console.log(`Loaded misconduct from ${misconductPath} (${misconduct.length} entries)`);

    const misconductMap = new Map(misconduct.map(m => [m.bioguideId, m]));
    let mergedCount = 0;
    for (const sen of rankings) {
      const misData = misconductMap.get(sen.bioguideId);
      if (misData) {
        sen.misconductCount = misData.misconductCount || 0;
        sen.misconductTags = misData.misconductTags || [];
        mergedCount++;
      }
    }
    console.log(`Merged misconduct for ${mergedCount} senators`);
  } catch (err) {
    console.error('Failed to parse/load misconduct-senators.json:', err.message);
  }
} else {
  console.warn('misconduct-senators.json not found — misconduct remains empty');
}

fs.writeFileSync(rankingsPath, JSON.stringify(rankings, null, 2));
console.log(`Finished merge: ${rankings.length} senators updated in senators-rankings.json`);
