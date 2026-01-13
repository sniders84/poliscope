// scripts/senators-votes.js
const fs = require('fs');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const OUTPUT = 'public/senators-rankings.json';
const base = JSON.parse(fs.readFileSync(OUTPUT, 'utf8'));

function normalizeName(n) {
  return String(n).toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

const byFullName = new Map(base.map(s => [normalizeName(s.name), s]));
const byLastNameState = new Map(
  base.map(s => {
    const parts = s.name.split(' ');
    const last = normalizeName(parts[parts.length - 1]);
    return [`${last}|${s.state}`, s];
  })
);

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!
