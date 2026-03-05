// scripts/merge-presidents.js
// Merges event data into presidents-rankings.json using the new streamlined structure:
// - Consolidates all events into a single deduplicated `events` array with tags
// - Preserves photo, party, term dates from presidents.json
// - Adds tags based on content (can be refined)
// - No more category silos — drops crisisManagement/domesticPolicy/etc. objects

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC = filename => path.join(ROOT, "public", filename);

const RANKINGS_PATH = PUBLIC("presidents-rankings.json");
const PRESIDENTS_PATH = PUBLIC("presidents.json"); // source for photo, basics

// If you have a unified events file, use it; otherwise load from old category files
const EVENT_SOURCES = {
  crisisManagement: PUBLIC("presidents-crisis-management.json"),
  domesticPolicy: PUBLIC("presidents-domestic-policy.json"),
  economicPolicy: PUBLIC("presidents-economic-policy.json"),
  foreignPolicy: PUBLIC("presidents-foreign-policy.json"),
  judicialPolicy: PUBLIC("presidents-judicial-policy.json"),
  legislation: PUBLIC("presidents-legislation.json"),
  misconduct: PUBLIC("presidents-misconduct.json")
  // Add more if you have timelines/events JSON
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
  // Dedupe key: title + year (or summary snippet if no year)
  const year = event.year || event.date || "";
  const title = (event.title || "").trim().toLowerCase();
  const summarySnippet = (event.summary || "").slice(0, 80).toLowerCase();
  return `${title}|${year}|${summarySnippet}`;
}

function generateTags(event) {
  const text = ((event.title || "") + " " + (event.summary || "")).toLowerCase();
  const tags = new Set();

  // Crisis/security/public health
  if (/crisis|war|rebellion|protest|uprising|epidemic|pandemic|emergency|attack|terrorism|unrest|frontier|indian war|yellow fever/i.test(text)) {
    tags.add("crisis");
    tags.add("security");
    if (/epidemic|pandemic|fever/i.test(text)) tags.add("publichealth");
    if (/protest|rebellion|uprising/i.test(text)) tags.add("civilunrest");
  }

  // Economic/financial
  if (/tax|debt|economy|recession|depression|tariff|bank|financial|panic|inflation|trade|excise/i.test(text)) {
    tags.add("economic");
    if (/tariff|trade|embargo/i.test(text)) tags.add("trade");
  }

  // Foreign/diplomatic
  if (/treaty|foreign|britain|france|spain|neutrality|genet|jay|pinckney|diplomatic|alliance|embargo/i.test(text)) {
    tags.add("foreign");
    tags.add("diplomatic");
    if (/treaty|jay|pinckney/i.test(text)) tags.add("treaty");
  }

  // Judicial/court
  if (/court|judiciary|justice|supreme|judge|appointment|ruling|chisholm/i.test(text)) {
    tags.add("judicial");
  }

  // Legislation/acts
  if (/act|bill|signed|legislation|law|charter|residence|tariff act|judiciary act/i.test(text)) {
    tags.add("legislation");
  }

  // Domestic/general
  if (/domestic|policy|reform|internal|constitution|bill of rights/i.test(text)) {
    tags.add("domestic");
  }

  // Misconduct/negative
  if (/scandal|impeachment|misconduct|abuse|pardon|failure|controversy|enslavement|fugitive/i.test(text)) {
    tags.add("misconduct");
  }

  return Array.from(tags);
}

function main() {
  console.log("merge-presidents: starting streamlined merge to events[]");

  const rankings = loadJson(RANKINGS_PATH);
  if (!Array.isArray(rankings)) {
    console.error("presidents-rankings.json must be an array.");
    return;
  }

  const presidentsSource = loadJson(PRESIDENTS_PATH); // for photo etc.
  const presidentsMap = indexById(presidentsSource);

  // Load all category/event sources and index by president id
  const eventSourcesById = {};
  Object.keys(EVENT_SOURCES).forEach(cat => {
    const data = loadJson(EVENT_SOURCES[cat]);
    data.forEach(item => {
      const id = item.id || item.presidentId;
      if (!id) return;
      if (!eventSourcesById[id]) eventSourcesById[id] = [];
      // Extract events (handle variations: majorEvents, events, etc.)
      const events = item.majorEvents || item.events || item[cat]?.majorEvents || [];
      events.forEach(ev => {
        if (ev.title) {
          eventSourcesById[id].push({ ...ev, originalCategory: cat });
        }
      });
    });
  });

  rankings.forEach(p => {
    const id = p.id;
    if (!id) return;

    // Preserve/ensure photo & basics from presidents.json
    const sourcePres = presidentsMap.get(id);
    if (sourcePres) {
      p.photo = sourcePres.photo || p.photo || null;
      p.party = sourcePres.party || p.party;
      p.termStart = sourcePres.termStart || p.termStart;
      p.termEnd = sourcePres.termEnd || p.termEnd;
      p.slug = sourcePres.slug || p.slug;
    }

    // Collect all events for this president
    const rawEvents = eventSourcesById[id] || [];

    // Deduplicate
    const seen = new Set();
    const uniqueEvents = [];
    rawEvents.forEach(ev => {
      const key = getEventKey(ev);
      if (!seen.has(key)) {
        seen.add(key);
        // Clean & enhance
        const cleaned = {
          title: ev.title?.trim(),
          year: ev.year || ev.date || "", // normalize
          summary: ev.summary?.trim() || "",
          sources: ev.sources || [],
          tags: generateTags(ev)
        };

        // Only add scoring fields if it seems impactful (not ceremonial)
        if (!/inauguration|farewell|address|oath/i.test(cleaned.title.toLowerCase())) {
          cleaned.severity = 0;      // Placeholder — update manually or via rubric later
          cleaned.effectiveness = 0;
          cleaned.notes = "";
        }

        uniqueEvents.push(cleaned);
      }
    });

    // Sort by year (simple string sort for now)
    uniqueEvents.sort((a, b) => a.year.localeCompare(b.year));

    // Assign to flat events array & remove old category objects
    p.events = uniqueEvents;
    // Clean up old bloated fields
    delete p.crisisManagement;
    delete p.domesticPolicy;
    delete p.economicPolicy;
    delete p.foreignPolicy;
    delete p.judicialPolicy;
    delete p.legislation;
    delete p.misconduct;

    console.log(`Merged ${uniqueEvents.length} unique events for ${p.name} (id ${id})`);
  });

  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(rankings, null, 2));
  console.log(`merge-presidents: completed. Wrote ${rankings.length} presidents with unified events[] (photos preserved)`);
}

main();
