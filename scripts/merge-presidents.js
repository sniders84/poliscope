// scripts/merge-presidents.js
// Streamlined merge with summary enrichment for rubric triggers

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC = filename => path.join(ROOT, "public", filename);

const RANKINGS_PATH = PUBLIC("presidents-rankings.json");
const PRESIDENTS_PATH = PUBLIC("presidents.json");

const EVENT_SOURCES = {
  crisisManagement: PUBLIC("presidents-crisis-management.json"),
  domesticPolicy: PUBLIC("presidents-domestic-policy.json"),
  economicPolicy: PUBLIC("presidents-economic-policy.json"),
  foreignPolicy: PUBLIC("presidents-foreign-policy.json"),
  judicialPolicy: PUBLIC("presidents-judicial-policy.json"),
  legislation: PUBLIC("presidents-legislation.json"),
  misconduct: PUBLIC("presidents-misconduct.json")
};

function loadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (err) {
    console.error(`Failed to load ${filePath}: ${err.message}`);
    return [];
  }
}

function indexById(arr) {
  const map = new Map();
  arr.forEach(item => {
    if (item?.id) map.set(item.id, item);
  });
  return map;
}

function getEventKey(event) {
  const year = event.year || event.date || "";
  const title = (event.title || "").trim().toLowerCase();
  const summarySnippet = (event.summary || "").slice(0, 80).toLowerCase();
  return `${title}|${year}|${summarySnippet}`;
}

function generateTags(event) {
  const text = ((event.title || "") + " " + (event.summary || "")).toLowerCase();
  const tags = new Set();

  if (/crisis|war|rebellion|protest|uprising|epidemic|pandemic|emergency|attack|terrorism|unrest|frontier|indian war|yellow fever/i.test(text)) {
    tags.add("crisis");
    tags.add("security");
    if (/epidemic|pandemic|fever/i.test(text)) tags.add("publichealth");
    if (/protest|rebellion|uprising/i.test(text)) tags.add("civilunrest");
  }

  if (/tax|debt|economy|recession|depression|tariff|bank|financial|panic|inflation|trade|excise/i.test(text)) {
    tags.add("economic");
    if (/tariff|trade|embargo/i.test(text)) tags.add("trade");
  }

  if (/treaty|foreign|britain|france|spain|neutrality|genet|jay|pinckney|diplomatic|alliance|embargo/i.test(text)) {
    tags.add("foreign");
    tags.add("diplomatic");
    if (/treaty|jay|pinckney/i.test(text)) tags.add("treaty");
  }

  if (/court|judiciary|justice|supreme|judge|appointment|ruling|chisholm/i.test(text)) {
    tags.add("judicial");
  }

  if (/act|bill|signed|legislation|law|charter|residence|tariff act
