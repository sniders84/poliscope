// scripts/merge-legislation-parts.js
// Purpose: Combine part files from House legislation scraper into one complete representatives-legislation.json

const fs = require('fs');
const path = require('path');

const parts = [
  path.join(__dirname, '..', 'public', 'legislation-representatives-part1.json'),
  path.join(__dirname, '..', 'public', 'legislation-representatives-part2.json'),
  path.join(__dirname, '..', 'public', 'legislation-representatives-part3.json'),
  path.join(__dirname, '..', 'public', 'legislation-representatives-part4.json')
];

// IMPORTANT: final output must match what merge-representatives.js expects
const outputPath = path.join(__dirname, '..', 'public', 'representatives-legislation.json');

let merged = [];

for (const file of parts) {
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(data)) {
        merged = merged.concat(data);
        console.log(`Merged ${data.length} records from ${path.basename(file)}`);
      } else {
        console.warn(`File ${path.basename(file)} did not contain an array`);
      }
    } catch (err) {
      console.error(`Failed to parse ${path.basename(file)}: ${err.message}`);
    }
  } else {
    console.warn(`File ${path.basename(file)} not found, skipping`);
  }
}

// Deduplicate by bioguideId
const seen = new Map();
for (const rec of merged) {
  if (!rec.bioguideId) continue;
  seen.set(rec.bioguideId, rec);
}
const deduped = Array.from(seen.values());

fs.writeFileSync(outputPath, JSON.stringify(deduped, null, 2));
console.log(`\nFinal merged file written: ${deduped.length} representatives in representatives-legislation.json`);
