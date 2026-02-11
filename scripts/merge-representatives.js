// merge-representatives.js

const fs = require("fs");

// Load rankings and housereps.json
const rankings = JSON.parse(fs.readFileSync("representatives-rankings.json", "utf8"));
const housereps = JSON.parse(fs.readFileSync("public/housereps.json", "utf8"));

// Build a map of slug → info
const repMap = new Map();
housereps.forEach(rep => {
  repMap.set(rep.slug, {
    photo: rep.photo,
    office: rep.office,
    party: rep.party,
    state: rep.state,
    ballotpediaLink: rep.ballotpediaLink,
    govtrackLink: rep.govtrackLink,
    contact: rep.contact,
    social: rep.social
    // add other fields if you want them merged
  });
});

// Enrich rankings with photo and metadata
rankings.forEach(r => {
  if (repMap.has(r.slug)) {
    const info = repMap.get(r.slug);
    r.photo = info.photo;
    r.office = info.office;
    r.party = info.party;
    r.state = info.state;
    r.ballotpediaLink = info.ballotpediaLink;
    r.govtrackLink = info.govtrackLink;
    r.contact = info.contact;
    r.social = info.social;
  } else {
    console.warn(`No match for slug: ${r.slug}`);
  }
});

// Write enriched rankings back out
fs.writeFileSync("representatives-rankings.json", JSON.stringify(rankings, null, 2));
console.log("representatives-rankings.json updated with photos and metadata via slug matching.");
