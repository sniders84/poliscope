// generate.js
// Hybrid GovTrack scraper: prefer report card (if available), fallback to GovTrack API.
// Save at repo root. Run with: node generate.js

import fs from "fs";

const OUTPUT_PATH = "public/senators-rankings.json";
const BASE = "https://www.govtrack.us/api/v2";
const REPORT_CARD_YEAR = 2024; // adjust as needed

async function safeFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  if (!res.ok) return null;
  return res;
}

async function getJSON(url) {
  const res = await safeFetch(url);
  if (!res) return null;
  try {
    return res.json();
  } catch {
    return null;
  }
}

function toSlug(firstname, lastname) {
  const clean = s =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, "")
      .trim()
      .replace(/\s+/g, "_");
  return `${clean(firstname)}_${clean(lastname)}`;
}

function extractNumber(html, labelPatterns) {
  // Try multiple label patterns; return first match as integer
  for (const pattern of labelPatterns) {
    const re = new RegExp(pattern, "i");
    const m = html.match(re);
    if (m) {
      const numStr = (m[1] ?? m[2] ?? "").replace(/[,]/g, "");
      const num = Number(numStr);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function extractPercent(html, labelPatterns) {
  for (const pattern of labelPatterns) {
    const re = new RegExp(pattern, "i");
    const m = html.match(re);
    if (m) {
      const pctStr = (m[1] ?? m[2] ?? "").replace(/[,]/g, "");
      const num = Number(pctStr);
      if (!Number.isNaN(num)) return Number(num.toFixed(2));
    }
  }
  return null;
}

async function parseReportCard(personId, firstname, lastname) {
  const slug = toSlug(firstname, lastname);
  const url = `https://www.govtrack.us/congress/members/${slug}/${personId}/report-card/${REPORT_CARD_YEAR}`;
  const res = await safeFetch(url);
  if (!res) return null;

  const html = await res.text();

  // Heuristics: try to capture key stats by nearby labels and numbers.
  // These patterns are intentionally broad to survive small layout changes.
  const missed_votes_pct = extractPercent(html, [
    // e.g., "Missed votes: 1.2%"
    "Missed\\s+votes[^\\d%]*([\\d]+(?:\\.\\d+)?)\\s*%",
    "missed\\s+votes[^\\d%]*([\\d]+(?:\\.\\d+)?)\\s*%"
  ]);

  const bills_introduced = extractNumber(html, [
    // e.g., "Bills sponsored: 46"
    "Bills\\s+sponsored[^\\d]*([\\d,]+)",
    "Sponsored\\s+bills[^\\d]*([\\d,]+)"
  ]);

  const bills_cosponsored = extractNumber(html, [
    // e.g., "Bills cosponsored: 614"
    "Bills\\s+cosponsored[^\\d]*([\\d,]+)",
    "Cosponsored\\s+bills[^\\d]*([\\d,]+)"
  ]);

  const laws_enacted = extractNumber(html, [
    // e.g., "Became law: 44"
    "(?:Became\\s+law|Enacted)[^\\d]*([\\d,]+)"
  ]);

  const bills_out_of_committee = extractNumber(html, [
    // e.g., "Advanced out of committee: 7"
    "(?:Out\\s+of\\s+committee|Advanced\\s+out\\s+of\\s+committee)[^\\d]*([\\d,]+)"
  ]);

  // Committee positions score: derive as count of leadership/committee roles hinted on page
  // Try capturing occurrences of "Chair", "Ranking Member", "Vice Chair" etc. as a proxy.
  const committee_positions_score = (() => {
    const roles = (html.match(/\b(Chair|Ranking Member|Vice Chair)\b/gi) || []).length;
    return roles;
  })();

  // Misconduct: try to find a misconduct section; if absent, return 0.
  // If there's a numeric indicator, capture it; otherwise 0.
  const misconduct =
    extractNumber(html, [
      "Misconduct[^\\d]*([\\d,]+)"
    ]) ?? 0;

  return {
    missed_votes_pct,
    bills_introduced,
    bills_cosponsored,
    laws_enacted,
    committee_positions_score,
    bills_out_of_committee,
    misconduct
  };
}

async function apiFallbackCounts(personId) {
  // Use GovTrack API as fallback where report card is absent or fields missing
  const sponsored = await getJSON(`${BASE}/bill?sponsor=${personId}`);
  const cosponsored = await getJSON(`${BASE}/bill?cosponsor=${personId}`);
  const enacted = await getJSON(`${BASE}/bill?sponsor=${personId}&enacted=true`);

  const person = await getJSON(`${BASE}/person/${personId}`);
  const roles = await getJSON(`${BASE}/role?current=true&person=${personId}`);

  const missed_votes_pct =
    roles?.objects?.[0]?.missed_votes_pct ?? person?.missed_votes_pct ?? 0;

  // Derive a crude committee positions score: count of committee memberships in current role
  const committee_positions_score =
    (roles?.objects?.[0]?.committee_memberships?.length ?? 0) +
    ((roles?.objects?.[0]?.leadership_title ? 1 : 0));

  const bills_out_of_committee = 0; // GovTrack API does not expose this directly without deep per-bill parsing

  const misconduct = person?.misconduct ?? 0;

  return {
    missed_votes_pct,
    bills_introduced: sponsored?.pagination?.count ?? 0,
    bills_cosponsored: cosponsored?.pagination?.count ?? 0,
    laws_enacted: enacted?.pagination?.count ?? 0,
    committee_positions_score,
    bills_out_of_committee,
    misconduct
  };
}

async function build() {
  const roles = await getJSON(`${BASE}/role?current=true&role_type=senator`);
  if (!roles?.objects) {
    console.error("❌ Failed to fetch current senators");
    process.exit(1);
  }

  const senators = roles.objects;

  const rankings = [];
  for (const role of senators) {
    const person = role.person;
    const id = person.id;
    const name = `${person.firstname} ${person.lastname}`;
    const party = role.party;
    const state = role.state;

    const fromReportCard = await parseReportCard(id, person.firstname, person.lastname);
    const fallback = await apiFallbackCounts(id);

    // Prefer report card values if present; otherwise fallback to API
    const merged = {
      missed_votes_pct: fromReportCard?.missed_votes_pct ?? fallback.missed_votes_pct,
      bills_introduced: fromReportCard?.bills_introduced ?? fallback.bills_introduced,
      bills_cosponsored: fromReportCard?.bills_cosponsored ?? fallback.bills_cosponsored,
      laws_enacted: fromReportCard?.laws_enacted ?? fallback.laws_enacted,
      committee_positions_score:
        fromReportCard?.committee_positions_score ?? fallback.committee_positions_score,
      bills_out_of_committee:
        fromReportCard?.bills_out_of_committee ?? fallback.bills_out_of_committee,
      misconduct: fromReportCard?.misconduct ?? fallback.misconduct
    };

    // Ensure no nulls
    for (const k of Object.keys(merged)) {
      if (merged[k] == null) merged[k] = 0;
    }

    rankings.push({
      name,
      office: "Senator",
      party,
      state,
      ...merged
    });
  }

  rankings.sort((a, b) => a.name.localeCompare(b.name));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rankings, null, 2));
  console.log(`✅ senators-rankings.json written with ${rankings.length} records to ${OUTPUT_PATH}`);
}

build().catch(err => {
  console.error("Script failed:", err);
  process.exit(1);
});
