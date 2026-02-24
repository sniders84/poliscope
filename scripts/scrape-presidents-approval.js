// scripts/scrape-presidents-approval.js
// Purpose: Scrape Gallup presidential job approval data and update presidents-approval.json

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const GALLUP_URL =
  'https://news.gallup.com/interactives/185273/presidential-job-approval-center.aspx';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const BOOTSTRAP_PATH = path.join(PUBLIC_DIR, 'presidents-bootstrap.json');
const APPROVAL_PATH = path.join(PUBLIC_DIR, 'presidents-approval.json');

async function fetchHtml(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing JSON file: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function buildPresidentNameMap(bootstrap) {
  // Map by last name (lowercased) → presidentNumber
  const map = new Map();
  for (const pres of bootstrap) {
    const name =
      pres.name ||
      `${pres.firstName || ''} ${pres.lastName || ''}`.trim() ||
      '';
    if (!name) continue;
    const parts = name.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    if (!map.has(last)) {
      map.set(last, pres.presidentNumber);
    }
  }
  return map;
}

function indexApprovalByPresidentNumber(arr) {
  const map = new Map();
  for (const item of arr) {
    if (
      item &&
      typeof item === 'object' &&
      typeof item.presidentNumber === 'number'
    ) {
      map.set(item.presidentNumber, item);
    }
  }
  return map;
}

function parseGallupApproval(html, nameMap) {
  const $ = cheerio.load(html);

  // This selector assumes Gallup exposes a table with rows containing:
  // President name + "Average approval" or similar.
  // You may need to tweak selectors if Gallup changes layout.
  const results = new Map();

  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 2) return;

    const nameText = $(cells[0]).text().trim();
    const valueText = $(cells[1]).text().trim();

    if (!nameText || !valueText) return;

    const parts = nameText.split(/\s+/);
    const last = parts[parts.length - 1].toLowerCase();
    if (!nameMap.has(last)) return;

    const presidentNumber = nameMap.get(last);
    const approval = parseFloat(valueText.replace('%', '').trim());
    if (Number.isNaN(approval)) return;

    results.set(presidentNumber, approval);
  });

  return results;
}

async function main() {
  console.log('Loading presidents-bootstrap.json and presidents-approval.json...');
  const bootstrap = loadJson(BOOTSTRAP_PATH);
  const approvalData = loadJson(APPROVAL_PATH);

  const nameMap = buildPresidentNameMap(bootstrap);
  const approvalByNumber = indexApprovalByPresidentNumber(approvalData);

  console.log('Fetching Gallup presidential approval data...');
  const html = await fetchHtml(GALLUP_URL);

  console.log('Parsing Gallup HTML...');
  const gallupMap = parseGallupApproval(html, nameMap);

  let updatedCount = 0;

  for (const [presidentNumber, approvalRating] of gallupMap.entries()) {
    if (!approvalByNumber.has(presidentNumber)) continue;
    const record = approvalByNumber.get(presidentNumber);
    if (record.approvalRating === approvalRating) continue;
    record.approvalRating = approvalRating;
    updatedCount++;
  }

  const outArray = Array.from(approvalByNumber.values()).sort(
    (a, b) => a.presidentNumber - b.presidentNumber
  );

  saveJson(APPROVAL_PATH, outArray);

  console.log(
    `Updated presidents-approval.json with Gallup data. Records changed: ${updatedCount}`
  );
}

if (require.main === module) {
  main().catch(err => {
    console.error('Error in scrape-presidents-approval:', err);
    process.exit(1);
  });
}
