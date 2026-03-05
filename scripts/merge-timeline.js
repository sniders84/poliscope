const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const OUTPUT = path.join(PUBLIC, 'presidents-full-timeline.json');

const FILES = {
  crisis: path.join(PUBLIC, 'presidents-crisis-management.json'),
  domestic: path.join(PUBLIC, 'presidents-domestic-policy.json'),
  economic: path.join(PUBLIC, 'presidents-economic-policy.json'),
  foreign: path.join(PUBLIC, 'presidents-foreign-policy.json'),
  judicial: path.join(PUBLIC, 'presidents-judicial-policy.json'),
  legislation: path.join(PUBLIC, 'presidents-legislation.json'),
  misconduct: path.join(PUBLIC, 'presidents-misconduct.json')
};

console.log('Starting merge into presidents-full-timeline.json...');

const presidentMap = {};

Object.keys(FILES).forEach(cat => {
  try {
    const filePath = FILES[cat];
    if (!fs.existsSync(filePath)) {
      console.warn(`Skipping missing file: ${filePath}`);
      return;
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    raw.forEach(p => {
      const id = p.id;
      if (!id) return;

      if (!presidentMap[id]) {
        presidentMap[id] = {
          id,
          name: p.name || 'Unknown',
          overview: '',
          majorEvents: [],
          minorEvents: [],
          misconduct: []
        };
      }

      const target = presidentMap[id];

      // Merge overview – longest non-empty
      const overview = p[cat]?.overview || p.overview || '';
      if (overview && overview.length > target.overview.length) {
        target.overview = overview;
      }

      // Merge major events – deduplicate by title + summary prefix
      const events = p[cat]?.majorEvents || [];
      events.forEach(e => {
        if (!e.title) return;
        const key = `${e.title}|${(e.summary || '').slice(0, 150)}`;
        const exists = target.majorEvents.some(ex => {
          const exKey = `${ex.title}|${(ex.summary || '').slice(0, 150)}`;
          return exKey === key;
        });
        if (!exists) {
          target.majorEvents.push({ ...e });
        }
      });

      // Misconduct – verbatim from misconduct file
      if (cat === 'misconduct' && p.misconduct?.events) {
        target.misconduct = p.misconduct.events.map(e => ({
          title: e.title,
          summary: e.summary,
          sources: e.sources || []
        }));
      }
    });

    console.log(`Processed ${cat}: ${Object.keys(presidentMap).length} presidents so far`);
  } catch (err) {
    console.error(`Error processing ${cat}: ${err.message}`);
  }
});

// Convert to sorted array
const presidents = Object.values(presidentMap).sort((a, b) => a.id - b.id);

fs.writeFileSync(OUTPUT, JSON.stringify(presidents, null, 2));
console.log(`\nSuccess! Merged ${presidents.length} presidents into ${OUTPUT}`);
