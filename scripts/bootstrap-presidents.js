// scripts/bootstrap-presidents.js
// Purpose: Generate baseline presidents-rankings.json from presidents-bootstrap.json
// Uses presidents-bootstrap.json as roster + identity source
// Initializes clean schema for presidential rankings

const fs = require('fs');
const path = require('path');

const BOOTSTRAP_PATH = path.join(process.cwd(), 'public', 'presidents-bootstrap.json');
const OUT_PATH       = path.join(process.cwd(), 'public', 'presidents-rankings.json');

if (!fs.existsSync(BOOTSTRAP_PATH)) {
  console.error(`Missing presidents-bootstrap.json at ${BOOTSTRAP_PATH}`);
  process.exit(1);
}

const roster = JSON.parse(fs.readFileSync(BOOTSTRAP_PATH, 'utf-8'));

function makeSlug(pres) {
  const base =
    pres.slug ||
    pres.bioguideId ||
    pres.govtrackId ||
    (pres.name && typeof pres.name === 'string'
      ? pres.name
      : `${pres.firstName || ''} ${pres.lastName || ''}`.trim());

  return String(base)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function baseRecord(pres) {
  const slug = makeSlug(pres);

  // Try to be flexible about name fields
  const name =
    pres.name ||
    `${pres.firstName || ''} ${pres.lastName || ''}`.trim() ||
    `President ${pres.presidentNumber || ''}`.trim();

  return {
    slug,
    presidentNumber: pres.presidentNumber,
    name,
    party: pres.party || null,
    termStart: pres.termStart || null,
    termEnd: pres.termEnd || null,
    photo: pres.photo || null,

    // Approval (from presidents-approval.json)
    approvalRating: 0,

    // Crisis management (from presidents-crisis-management.json)
    crisesFaced: 0,
    crisesResolved: 0,
    crisisSeverityIndex: 0,
    majorCrisisEvents: [],

    // Domestic policy (from presidents-domestic-policy.json)
    majorBillsSigned: 0,
    vetoes: 0,
    domesticProgramsLaunched: 0,
    majorDomesticEvents: [],

    // Economic policy (from presidents-economic-policy.json)
    gdpGrowth: 0,
    inflationRate: 0,
    unemploymentRate: 0,
    majorEconomicEvents: [],

    // Foreign policy (from presidents-foreign-policy.json)
    treatiesNegotiated: 0,
    militaryActions: 0,
    foreignAidPrograms: 0,
    majorForeignPolicyEvents: [],

    // Scandal (from presidents-scandal.json)
    scandalCount: 0,
    majorScandalEvents: [],

    // Placeholder for any additional merged metrics
    // (judicial, legislation, executive actions, etc.)
    lastUpdated: new Date().toISOString()
  };
}

const presidents = roster
  .slice() // in case it's not a plain array copy
  .sort((a, b) => (a.presidentNumber || 0) - (b.presidentNumber || 0))
  .map(baseRecord);

fs.writeFileSync(OUT_PATH, JSON.stringify(presidents, null, 2));
console.log(`Bootstrapped presidents-rankings.json with ${presidents.length} presidents`);
console.log('Sample record:', presidents[0]);
