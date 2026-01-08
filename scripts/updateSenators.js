// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");

// Path to the congress-legislators dataset (you can vendor it into your repo or fetch it)
const legislatorsFile = path.join(process.cwd(), "scripts", "legislators-current.json");

function loadLegislators() {
  const raw = fs.readFileSync(legislatorsFile, "utf8");
  return JSON.parse(raw);
}

function main() {
  const legislators = loadLegislators();

  // Filter for senators only
  const senators = legislators.filter(l => {
    const latestTerm = l.terms[l.terms.length - 1];
    return latestTerm.type === "sen";
  });

  // Map into your schema
  const output = senators.map(l => {
    const latestTerm = l.terms[l.terms.length - 1];
    return {
      name: `${l.name.first} ${l.name.last}`,
      state: latestTerm.state,
      party: latestTerm.party,
      office: "Senator",
      bioguideId: l.id.bioguide,
      sponsoredBills: 0,
      sponsoredAmendments: 0,
      cosponsoredBills: 0,
      cosponsoredAmendments: 0,
      becameLawBills: 0,
      becameLawAmendments: 0,
      committees: [], // can be filled later from committee dataset
      votes: 0
    };
  });

  const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${output.length} senators to senators-rankings.json`);
}

main();
