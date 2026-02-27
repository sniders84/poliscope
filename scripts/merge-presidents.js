// scripts/merge-presidents.js
// Merges bootstrap presidents with all metric files using Option B schema.

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "..", "public");
const OUTPUT_FILE = path.join(PUBLIC_DIR, "presidents-rankings.json");

// Metric files using Option B schema
const METRIC_FILES = {
  crisisManagement: "presidents-crisis-management.json",
  foreignPolicy: "presidents-foreign-policy.json",
  domesticPolicy: "presidents-domestic-policy.json",
  economicPolicy: "presidents-economic-policy.json",
  judicialPolicy: "presidents-judicial-policy.json",
  legislation: "presidents-legislation.json",
  misconduct: "presidents-misconduct.json"
};

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  // Load bootstrap rankings file
  const rankingsPath = path.join(PUBLIC_DIR, "presidents-rankings.json");
  const rankings = loadJSON(rankingsPath);

  // Load each metric dataset
  const metricData = {};
  for (const [metricName, fileName] of Object.entries(METRIC_FILES)) {
    const filePath = path.join(PUBLIC_DIR, fileName);
    metricData[metricName] = loadJSON(filePath);
  }

  // Merge metrics into each president
  const enriched = rankings.map((president) => {
    const id = president.id;

    for (const [metricName, dataset] of Object.entries(metricData)) {
      const match = dataset.find((p) => p.id === id);

      // Insert metric block or fallback empty block
      president.metrics[metricName] =
        match && match[metricName]
          ? match[metricName]
          : {
              events: [],
              overallAssessment: "",
              sources: []
            };
    }

    return president;
  });

  // Write merged output
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enriched, null, 2), "utf8");
  console.log(`Presidents merged successfully → ${OUTPUT_FILE}`);
}

main();
