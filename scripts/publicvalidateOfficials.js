// scripts/validateOfficials.js
// Safe validator: reads your JSON files and writes missingDataReport.json
// It does NOT modify your original data files.

const fs = require('fs');
const path = require('path');

const REPORT_FILE = 'missingDataReport.json'; // Safety lock: must be this exact name

if (REPORT_FILE !== 'missingDataReport.json') {
  console.error('Safety check failed: report filename must be missingDataReport.json');
  process.exit(1);
}

// Candidate locations to find your JSONs (tries in order)
const candidates = {
  governors: ['Governors.json', 'public/Governors.json', 'data/Governors.json', 'src/data/Governors.json'],
  house: ['House.json', 'public/House.json', 'data/House.json', 'src/data/House.json'],
  senate: ['Senate.json', 'public/Senate.json', 'data/Senate.json', 'src/data/Senate.json']
};

function findFile(paths) {
  for (const p of paths) {
    const full = path.join(process.cwd(), p);
    if (fs.existsSync(full) && fs.statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

function readJsonSafe(fullPath) {
  try {
    const txt = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(txt);
  } catch (err) {
    console.warn(`Warning: couldn't parse JSON at ${fullPath}: ${err.message}`);
    return null;
  }
}

function isEmptyValue(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  if (Array.isArray(v) && v.length === 0) return true;
  if (typeof v === 'object' && !Array.isArray(v)) {
    // treat empty object as empty
    return Object.keys(v).length === 0;
  }
  return false;
}

function getByPath(obj, pathStr) {
  const parts = pathStr.split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// Which fields we check. We report REQUIRED vs OPTIONAL missing fields.
const REQUIRED_FIELDS = [
  'name',
  'state',
  'party',
  'office',
  'slug',
  'photo',
  'ballotpediaLink',
  'termStart',
  'termEnd',
  'bio'
];

const OPTIONAL_FIELDS = [
  'district', // for Representatives
  'contact.email',
  'contact.phone',
  'contact.website',
  'education',
  'endorsements',
  'platform',
  'platformFollowThrough',
  'proposals',
  'engagement',
  'billsSigned',
  'committees',
  'vetoes',
  'salary',
  'predecessor'
];

function analyzeList(list, sourceLabel, sourcePath) {
  if (!Array.isArray(list)) {
    return {
      found: false,
      message: `Expected an array at ${sourcePath}, got ${typeof list}`,
      items: []
    };
  }

  const items = list.map((entry, idx) => {
    const name = entry.name || entry.slug || `unnamed-${idx+1}`;
    const slug = entry.slug || (typeof name === 'string' ? name.toLowerCase().replace(/\s+/g,'-') : `entry-${idx+1}`);
    const missingRequired = [];
    const missingOptional = [];

    for (const f of REQUIRED_FIELDS) {
      const val = getByPath(entry, f);
      if (isEmptyValue(val)) missingRequired.push(f);
    }

    for (const f of OPTIONAL_FIELDS) {
      const val = getByPath(entry, f);
      if (isEmptyValue(val)) missingOptional.push(f);
    }

    return {
      name,
      slug,
      source: sourceLabel,
      sourcePath,
      missingRequired,
      missingOptional
    };
  });

  return { found: true, items };
}

function generateReport() {
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {},
    details: {
      governors: [],
      house: [],
      senate: []
    }
  };

  // Process each file type
  for (const [label, paths] of Object.entries(candidates)) {
    const fileFound = findFile(paths);
    if (!fileFound) {
      report.summary[label] = { found: false, message: `No file found among: ${paths.join(', ')}` };
      continue;
    }

    const data = readJsonSafe(fileFound);
    if (!data) {
      report.summary[label] = { found: false, message: `Could not parse JSON at ${fileFound}` };
      continue;
    }

    const res = analyzeList(data, label, fileFound);
    report.summary[label] = { found: true, total: res.items.length, missingCount: res.items.filter(i => i.missingRequired.length + i.missingOptional.length > 0).length };
    report.details[label] = res.items;
  }

  return report;
}

function writeReport(report) {
  const outPath = path.join(process.cwd(), REPORT_FILE);
  try {
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), { encoding: 'utf8', flag: 'w' });
    console.log(`Report written to ${outPath}`);
    return outPath;
  } catch (err) {
    console.error(`Failed to write report: ${err.message}`);
    process.exit(2);
  }
}

(function main() {
  console.log('Starting safe validation run...');
  const report = generateReport();
  writeReport(report);

  // Print a short console summary to make it easy to read logs
  for (const section of ['governors', 'house', 'senate']) {
    const s = report.summary[section];
    if (!s || !s.found) {
      console.log(`- ${section}: ${s ? s.message : 'no data found'}`);
    } else {
      console.log(`- ${section}: ${s.total} entries, ${s.missingCount} with missing fields`);
    }
  }

  console.log('Validation complete. The file missingDataReport.json is available in the workspace for download.');
})();
