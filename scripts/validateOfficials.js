// scripts/validateOfficials.js
// Safe validator: reads your JSON files and writes two reports:
// - missingDataReport.json (full detail)
// - missingDataReport.md (human-readable)
// It does NOT modify your original data files.

const fs = require('fs');
const path = require('path');

const JSON_REPORT = 'missingDataReport.json';
const MD_REPORT = 'missingDataReport.md';

// Safety locks
if (JSON_REPORT !== 'missingDataReport.json' || MD_REPORT !== 'missingDataReport.md') {
  console.error('Safety check failed on output filenames.');
  process.exit(1);
}

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
  if (typeof v === 'object' && !Array.isArray(v)) return Object.keys(v).length === 0;
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
  'district',
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
    details: { governors: [], house: [], senate: [] }
  };

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
    report.summary[label] = {
      found: true,
      total: res.items.length,
      missingCount: res.items.filter(i => i.missingRequired.length + i.missingOptional.length > 0).length
    };
    report.details[label] = res.items;
  }

  return report;
}

function writeJson(report) {
  const outPath = path.join(process.cwd(), JSON_REPORT);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(`JSON report written to ${outPath}`);
}

function writeMarkdown(report) {
  let md = `# Missing Data Report\n\nGenerated: ${report.generatedAt}\n\n`;

  for (const section of ['governors','house','senate']) {
    const s = report.summary[section];
    md += `## ${section.toUpperCase()}\n`;
    if (!s || !s.found) {
      md += `- ❌ ${s ? s.message : 'No data found'}\n\n`;
      continue;
    }
    md += `- Total: ${s.total}\n- With Missing Fields: ${s.missingCount}\n\n`;

    report.details[section].forEach(item => {
      if (item.missingRequired.length || item.missingOptional.length) {
        md += `**${item.name} (${item.slug})**\n`;
        if (item.missingRequired.length) {
          md += `- ❗ Missing required: ${item.missingRequired.join(', ')}\n`;
        }
        if (item.missingOptional.length) {
          md += `- ⚠️ Missing optional: ${item.missingOptional.join(', ')}\n`;
        }
        md += '\n';
      }
    });
  }

  const outPath = path.join(process.cwd(), MD_REPORT);
  fs.writeFileSync(outPath, md, 'utf8');
  console.log(`Markdown report written to ${outPath}`);
}

(function main() {
  console.log('Starting safe validation run...');
  const report = generateReport();
  writeJson(report);
  writeMarkdown(report);

  for (const section of ['governors','house','senate']) {
    const s = report.summary[section];
    if (!s || !s.found) {
      console.log(`- ${section}: ${s ? s.message : 'no data found'}`);
    } else {
      console.log(`- ${section}: ${s.total} entries, ${s.missingCount} with missing fields`);
    }
  }

  console.log('Validation complete. Reports are available in the workspace.');
})();
