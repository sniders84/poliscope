// committee-scraper.js
// Scrapes official Senate committee pages for full membership (committees + subcommittees)
// Outputs public/senators-committees.json and public/committees.json

const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const BASE = 'https://www.senate.gov';
const COMMITTEE_INDEX = `${BASE}/committees/committees_home.htm`;

const legislators = JSON.parse(fs.readFileSync('public/legislators-current.json', 'utf8'));
const senatorsByName = new Map(
  legislators
    .filter(l => l.terms.some(t => t.type === 'sen'))
    .map(l => [normalizeName(l.name.official_full), l])
);

function normalizeName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/[,]+/g, '')
    .replace(/\u2019/g, "'")
    .trim()
    .toLowerCase();
}

async function get(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function scrapeCommitteeIndex() {
  const html = await get(COMMITTEE_INDEX);
  const $ = cheerio.load(html);

  const committees = [];

  // Main committees list (both chambers present—filter Senate)
  $('a').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    if (/senate\.gov\/committees\/.*committee/.test(href) && text) {
      const url = href.startsWith('http') ? href : `${BASE}${href}`;
      committees.push({ name: text, url });
    }
  });

  // Deduplicate by name
  const unique = [];
  const seen = new Set();
  for (const c of committees) {
    const key = c.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  return unique;
}

function extractMembersFromPage($, committeeName) {
  const members = [];

  // Common patterns: member lists in <li>, <p>, or tables
  $('li, p, td').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text) return;

    // Try to match "Chair", "Ranking Member", "Vice Chair" labels
    const roleMatch = text.match(/\b(Chair|Ranking Member|Vice Chair|Vice-Chair|Co-Chair)\b/i);
    const role = roleMatch ? roleMatch[1].toLowerCase() : null;

    // Extract senator name heuristically (strip state, party, etc.)
    const nameMatch =
      text.match(/Senator\s+([A-Z][A-Za-z\.\-'\s]+)(?:,|\(|$)/i) ||
      text.match(/^([A-Z][A-Za-z\.\-'\s]+)\s+\([A-Z]{2}\)/) ||
      text.match(/^([A-Z][A-Za-z\.\-'\s]+)$/);

    if (nameMatch) {
      const rawName = nameMatch[1].trim();
      const norm = normalizeName(rawName);
      const leg = senatorsByName.get(norm);
      if (leg) {
        members.push({
          bioguideId: leg.id.bioguide,
          name: leg.name.official_full,
          role: role || null,
          committee: committeeName,
        });
      }
    }
  });

  // Deduplicate by bioguideId
  const dedup = [];
  const seen = new Set();
  for (const m of members) {
    if (!seen.has(m.bioguideId)) {
      seen.add(m.bioguideId);
      dedup.push(m);
    }
  }
  return dedup;
}

async function scrapeCommitteePage(url, name) {
  const html = await get(url);
  const $ = cheerio.load(html);

  const committeeMembers = extractMembersFromPage($, name);

  // Subcommittees: look for links or headings that include "Subcommittee"
  const subcommittees = [];
  $('a, h2, h3, h4').each((_, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr('href') || '';
    if (/subcommittee/i.test(text)) {
      const subName = text.replace(/\s+/g, ' ').trim();
      const subUrl = href && href.startsWith('http') ? href : href ? `${BASE}${href}` : url;
      subcommittees.push({ name: subName, url: subUrl });
    }
  });

  const subMembers = [];
  for (const sub of subcommittees) {
    try {
      const subHtml = await get(sub.url);
      const $sub = cheerio.load(subHtml);
      const members = extractMembersFromPage($sub, sub.name);
      subMembers.push(...members);
    } catch {
      // If subcommittee page fails, skip gracefully
    }
  }

  return { committeeMembers, subMembers };
}

async function run() {
  const committees = await scrapeCommitteeIndex();

  const allCommitteeRecords = [];
  const senatorCommitteeMap = new Map(); // bioguideId -> { committees: Set, leadership: Set }

  for (const c of committees) {
    try {
      const { committeeMembers, subMembers } = await scrapeCommitteePage(c.url, c.name);

      allCommitteeRecords.push({
        committee: c.name,
        url: c.url,
        members: committeeMembers.map(m => ({
          bioguideId: m.bioguideId,
          name: m.name,
          role: m.role,
        })),
        subcommittees: subMembers.length
          ? [
              ...new Set(subMembers.map(s => s.committee)),
            ].map(subName => ({
              name: subName,
              members: subMembers
                .filter(s => s.committee === subName)
                .map(s => ({ bioguideId: s.bioguideId, name: s.name, role: s.role })),
            }))
          : [],
      });

      // Aggregate per-senator roles
      for (const m of [...committeeMembers, ...subMembers]) {
        if (!senatorCommitteeMap.has(m.bioguideId)) {
          senatorCommitteeMap.set(m.bioguideId, { committees: new Set(), leadership: new Set() });
        }
        const entry = senatorCommitteeMap.get(m.bioguideId);
        entry.committees.add(c.name);
        if (m.role && /chair|ranking/i.test(m.role)) {
          entry.leadership.add(`${m.role}:${m.committee}`);
        }
      }
    } catch (err) {
      // Skip committee on error, continue
      console.error(`Error scraping committee ${c.name}: ${err.message}`);
    }
  }

  // Build per-senator JSON
  const senatorsCommittees = [];
  for (const [bioguideId, data] of senatorCommitteeMap.entries()) {
    senatorsCommittees.push({
      bioguideId,
      committees: Array.from(data.committees),
      leadershipRoles: Array.from(data.leadership),
    });
  }

  fs.writeFileSync('public/committees.json', JSON.stringify(allCommitteeRecords, null, 2));
  fs.writeFileSync('public/senators-committees.json', JSON.stringify(senatorsCommittees, null, 2));
  console.log('Committee scraper complete!');
}

run().catch(err => console.error(err));
