// scripts/bootstrap-presidents.js

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const SOURCE_FILE = path.join(PUBLIC_DIR, "presidents.json");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");

function loadPresidents() {
  const raw = fs.readFileSync(SOURCE_FILE, "utf8");
  return JSON.parse(raw);
}

function buildBootstrapRecord(p) {
  return {
    id: p.id,
    name: p.name,
    termStart: p.termStart || "",
    termEnd: p.termEnd || "",
    party: p.party || "",
    metrics: {
      crisisManagement: null,
      foreignPolicy: null,
      domesticPolicy: null,
      economicPolicy: null,
      judicialPolicy: null,
      legislation: null,
      misconduct: null
    },
    scores: {
      crisisManagementScore: 0,
      foreignPolicyScore: 0,
      domesticPolicyScore: 0,
      economicPolicyScore: 0,
      judicialPolicyScore: 0,
      legislationScore: 0,
      misconductScore: 0,
      powerScore: 0
    }
  };
}

function main() {
  const presidents = loadPresidents();
  const bootstrap = presidents.map(buildBootstrapRecord);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(bootstrap, null, 2), "utf8");
  console.log(`Bootstrap written to ${OUTPUT_FILE}`);
}

main();
