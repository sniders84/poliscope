// scripts/merge-presidents.js
// Purpose: Merge all presidential metric JSON files into presidents-rankings.json
// Mirrors Senate/House merge architecture exactly

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(process.cwd(), 'public');

const RANKINGS_PATH = path.join(PUBLIC_DIR, 'presidents-rankings.json');

const APPROVAL_PATH = path.join(PUBLIC_DIR, 'presidents-approval.json');
const CRISIS_PATH = path.join(PUBLIC_DIR, 'presidents-crisis-management.json');
const DOMESTIC_PATH = path.join(PUBLIC_DIR, 'presidents-domestic-policy.json');
const ECON_PATH = path.join(PUBLIC_DIR, 'presidents-economic-policy.json');
const EXEC_PATH = path.join(PUBLIC_DIR, 'presidents-executive-actions.json');
const FOREIGN_PATH = path.join(PUBLIC_DIR, 'presidents-foreign-policy.json');
const JUDICIAL_PATH = path.join(PUBLIC_DIR, 'presidents-judicial-policy.json');
const LEGIS_PATH = path.join(PUBLIC_DIR, 'presidents-legislation.json');
const SCANDAL_PATH = path.join(PUBLIC_DIR, 'presidents-scandal.json');

function load(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function save(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function indexByNumber(arr) {
  const map = new Map();
  for (const item of arr) {
    map.set(item.presidentNumber, item);
  }
  return map;
}

function mergeMetric(target, source, fields) {
  for (const f of fields) {
    if (source[f] !== undefined) {
      target[f] = source[f];
    }
  }
}

function mergeEvents(target, source, field) {
  if (Array.isArray(source[field])) {
    target[field] = source[field];
  }
}

function main() {
  console.log('Loading presidents-rankings.json...');
  const rankings = load(RANKINGS_PATH);
  const map = indexByNumber(rankings);

  console.log('Loading metric files...');
  const approval = indexByNumber(load(APPROVAL_PATH));
  const crisis = indexByNumber(load(CRISIS_PATH));
  const domestic = indexByNumber(load(DOMESTIC_PATH));
  const economic = indexByNumber(load(ECON_PATH));
  const exec = indexByNumber(load(EXEC_PATH));
  const foreign = indexByNumber(load(FOREIGN_PATH));
  const judicial = indexByNumber(load(JUDICIAL_PATH));
  const legis = indexByNumber(load(LEGIS_PATH));
  const scandal = indexByNumber(load(SCANDAL_PATH));

  console.log('Merging metrics into rankings...');

  for (const [num, rec] of map.entries()) {
    if (approval.has(num)) {
      mergeMetric(rec, approval.get(num), ['approvalRating']);
    }

    if (crisis.has(num)) {
      mergeMetric(rec, crisis.get(num), [
        'crisesFaced',
        'crisesResolved',
        'crisisSeverityIndex'
      ]);
      mergeEvents(rec, crisis.get(num), 'majorCrisisEvents');
    }

    if (domestic.has(num)) {
      mergeMetric(rec, domestic.get(num), [
        'majorBillsSigned',
        'vetoes',
        'domesticProgramsLaunched'
      ]);
      mergeEvents(rec, domestic.get(num), 'majorDomesticEvents');
    }

    if (economic.has(num)) {
      mergeMetric(rec, economic.get(num), [
        'gdpGrowth',
        'inflationRate',
        'unemploymentRate'
      ]);
      mergeEvents(rec, economic.get(num), 'majorEconomicEvents');
    }

    if (exec.has(num)) {
      mergeMetric(rec, exec.get(num), ['executiveOrders']);
      mergeEvents(rec, exec.get(num), 'majorExecutiveActions');
    }

    if (foreign.has(num)) {
      mergeMetric(rec, foreign.get(num), [
        'treatiesNegotiated',
        'foreignAidPrograms',
        'militaryActions'
      ]);
      mergeEvents(rec, foreign.get(num), 'majorForeignPolicyEvents');
    }

    if (judicial.has(num)) {
      mergeMetric(rec, judicial.get(num), ['judicialAppointments']);
      mergeEvents(rec, judicial.get(num), 'majorJudicialEvents');
    }

    if (legis.has(num)) {
      mergeMetric(rec, legis.get(num), ['legislationPassed']);
      mergeEvents(rec, legis.get(num), 'majorLegislationEvents');
    }

    if (scandal.has(num)) {
      mergeMetric(rec, scandal.get(num), ['scandalCount']);
      mergeEvents(rec, scandal.get(num), 'majorScandalEvents');
    }

    rec.lastUpdated = new Date().toISOString();
  }

  const out = Array.from(map.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  save(RANKINGS_PATH, out);

  console.log('Merged all presidential metrics into presidents-rankings.json');
}

if (require.main === module) {
  main();
}
