// scripts/updateSenators.js
const fs = require("fs");
const path = require("path");

async function main() {
  // Static baseline from congress-legislators repo
  const roster = [
    {
      name: "Katie Britt",
      state: "AL",
      party: "Republican",
      office: "Senator",
      bioguideId: "B001320",
      sponsoredBills: 0,
      sponsoredAmendments: 0,
      cosponsoredBills: 0,
      cosponsoredAmendments: 0,
      becameLawBills: 0,
      becameLawAmendments: 0,
      committees: ["Committee on Banking, Housing, and Urban Affairs"],
      votes: 0
    },
    {
      name: "Tammy Baldwin",
      state: "WI",
      party: "Democrat",
      office: "Senator",
      bioguideId: "B001230",
      sponsoredBills: 0,
      sponsoredAmendments: 0,
      cosponsoredBills: 0,
      cosponsoredAmendments: 0,
      becameLawBills: 0,
      becameLawAmendments: 0,
      committees: ["Committee on Health, Education, Labor, and Pensions"],
      votes: 0
    }
    // … add more senators here from congress-legislators JSON
  ];

  const filePath = path.join(process.cwd(), "public", "senators-rankings.json");
  fs.writeFileSync(filePath, JSON.stringify(roster, null, 2));
  console.log(`Wrote ${roster.length} senators to senators-rankings.json`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
