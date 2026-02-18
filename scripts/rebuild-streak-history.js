// scripts/rebuild-streak-history.js
// One-time script to retroactively rebuild Senate streaks for the 119th Congress
// Uses the same sources as votes-scraper.js and legislation-scraper.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const xml2js = require('xml2js');
const axios = require('axios');

const CONGRESS = 119;
const START_DATE = '2025-01-03'; // 119th Congress start
const BASE_URL_CONGRESS = 'https://api.congress.gov/v3';
const API_KEY = process.env.CONGRESS_API_KEY;

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const LEGISLATORS_PATH = path.join(PUBLIC_DIR, 'legislators-current.json');
const RANKINGS_PATH = path.join(PUBLIC_DIR, 'senators-rankings.json');
const STREAKS_PATH = path.join(PUBLIC_DIR, 'senators-streaks.json');
const PREV_RANKINGS_PATH = path.join(PUBLIC_DIR, 'senators-rankings-prev.json');

const parser = new xml2js.Parser({
  explicitArray: false,
  mergeAttrs: true,
  tagNameProcessors: [xml2js.processors.stripPrefix],
  attrNameProcessors: [xml2js.processors.stripPrefix]
});

function num(v) {
  return (typeof v === 'number' && !Number.isNaN(v)) ? v : 0;
}

function ensureSchema(person) {
  person.sponsoredBills ??= 0;
  person.cosponsoredBills ??= 0;
  person.becameLawBills ??= 0;
  person.becameLawCosponsoredBills ??= 0;

  person.yeaVotes ??= 0;
  person.nayVotes ??= 0;
  person.missedVotes ??= 0;
  person.totalVotes ??= 0;

  person.streaks = person.streaks || { activity: 0, voting: 0, leader: 0 };
  person.metrics = person.metrics || { lastTotals: {} };

  return person;
}

function loadJSONSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return fallback;
  }
}

async function fetchXML(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const xml = await res.text();
    return await parser.parseStringPromise(xml);
  } catch {
    return null;
  }
}

async function discoverMaxRollCall(session) {
  // Senate stores roll calls under vote{CONGRESS}{session}, e.g. vote1191, vote1192
  const dir = `vote${CONGRESS}${session}`;

  let low = 1;
  let high = 2000;
  let max = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const padded = mid.toString().padStart(5, '0');
    const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/${dir}/vote_${CONGRESS}_${session}_${padded}.xml`;

    const parsed = await fetchXML(url);
    if (parsed && parsed.roll_call_vote) {
      max = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return max;
}

function buildLisMap(senators) {
  const map = new Map();
  for (const s of senators) {
    const lis = s.id?.lis;
    const bioguide = s.id?.bioguide;
    if (lis && bioguide) {
      map.set(lis, bioguide);
    }
  }
  return map;
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function* dateRange(startStr, endStr) {
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    yield dateKey(d);
  }
}

async function getWithRetry(url, params = {}, tries = 5) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      const fullParams = { api_key: API_KEY, format: 'json', ...params };
      const resp = await axios.get(url, { params: fullParams });
      return resp.data;
    } catch (err) {
      lastErr = err;
      const status = err.response?.status || 'unknown';
      console.warn(`Retry ${i+1}/${tries} for ${url} (status ${status}): ${err.message}`);
      await new Promise(r => setTimeout(r, status === 429 ? 10000 : 3000 * (i + 1)));
    }
  }
  throw lastErr || new Error(`All retries failed for ${url}`);
}

async function fetchLegislationTimeline(bioguideId) {
  const activityByDate = new Set();

  const is119th = (bill) => {
    const cong = bill.congress;
    if (cong === CONGRESS || cong === String(CONGRESS)) return true;
    if (bill.introducedDate && bill.introducedDate >= '2025-01-03' && bill.introducedDate < '2027-01-01') return true;
    return false;
  };

  async function paginate(endpoint) {
    const limit = 250;
    let offset = 0;

    while (true) {
      const url = `${BASE_URL_CONGRESS}/member/${bioguideId}/${endpoint}`;
      const params = { congress: CONGRESS, limit, offset };
      let data;
      try {
        data = await getWithRetry(url, params);
      } catch (err) {
        console.error(`Pagination error for ${endpoint} at offset ${offset}: ${err.message}`);
        break;
      }

      const key = endpoint === 'sponsored-legislation' ? 'sponsoredLegislation' : 'cosponsoredLegislation';
      const bills = data[key] || [];
      if (bills.length === 0) break;

      for (const bill of bills) {
        if (!is119th(bill)) continue;
        const introduced = bill.introducedDate || bill.latestAction?.actionDate;
        if (introduced && introduced >= START_DATE) {
          activityByDate.add(introduced.slice(0, 10));
        }
      }

      offset += limit;
      await new Promise(r => setTimeout(r, 600));
    }
  }

  await paginate('sponsored-legislation');
  await paginate('cosponsored-legislation');

  return activityByDate;
}

async function buildDailyTimelines() {
  const legislators = loadJSONSafe(LEGISLATORS_PATH, []);
  const senators = legislators.filter(r => r.terms?.at(-1)?.type === 'sen');
  const lisMap = buildLisMap(senators);

  const todayKey = dateKey(new Date());
  const voteTimeline = {};
  const billTimeline = {};

  for (const s of senators) {
    const bioguide = s.id?.bioguide;
    if (!bioguide) continue;
    voteTimeline[bioguide] = {};
    billTimeline[bioguide] = new Set();
  }

  for (const session of [1, 2]) {
    console.log(`Discovering roll calls for session ${session}...`);
    const maxRoll = await discoverMaxRollCall(session);
    console.log(`Session ${session}: ${maxRoll} roll calls found`);

    if (maxRoll === 0) continue;

    const dir = `vote${CONGRESS}${session}`;

    for (let num = 1; num <= maxRoll; num++) {
      const padded = num.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/${dir}/vote_${CONGRESS}_${session}_${padded}.xml`;

      const parsed = await fetchXML(url);
      if (!parsed || !parsed.roll_call_vote) continue;

      const rc = parsed.roll_call_vote;

      // Senate XML is inconsistent — some votes omit vote_date entirely.
      // Try every known field, then skip if still missing.
      const voteDate =
        rc.vote_date ||
        rc.action_date ||
        rc.vote_date_time ||
        rc.vote_date?.date ||
        rc.vote_date?.text ||
        null;

      if (!voteDate) {
        // Skip malformed or undated roll calls
        continue;
      }

      const date = voteDate.slice(0, 10);
      if (date < START_DATE || date > todayKey) continue;

      const members = rc.members?.member || [];
      const arr = Array.isArray(members) ? members : [members];

      for (const m of arr) {
        const lis = m.lis_member_id;
        const bioguide = lisMap.get(lis);
        if (!bioguide || !voteTimeline[bioguide]) continue;

        const voteCast = (m.vote_cast || '').trim();
        const day = (voteTimeline[bioguide][date] ||= { yea: 0, nay: 0, missed: 0 });

        if (voteCast === 'Yea') day.yea++;
        else if (voteCast === 'Nay') day.nay++;
        else if (voteCast === 'Not Voting') day.missed++;
      }
    }
  }

  for (const s of senators) {
    const bioguide = s.id?.bioguide;
    if (!bioguide) continue;
    console.log(`Building legislation timeline for ${bioguide}...`);
    const activityDates = await fetchLegislationTimeline(bioguide);
    billTimeline[bioguide] = activityDates;
  }

  return { senators, voteTimeline, billTimeline, todayKey };
}

function computeStreaksFromTimelines({ senators, voteTimeline, billTimeline, todayKey }) {
  const rankings = loadJSONSafe(RANKINGS_PATH, []).map(ensureSchema);
  const byId = new Map(rankings.map(p => [p.bioguideId || p.bioguide, p]));

  const leaderIds = [
    'T000250',
    'B001261',
    'S000063'
  ];

  const streaksOutput = [];

  for (const s of senators) {
    const bioguide = s.id?.bioguide;
    if (!bioguide) continue;

    const person = ensureSchema(byId.get(bioguide) || {
      bioguideId: bioguide,
      sponsoredBills: 0,
      cosponsoredBills: 0,
      yeaVotes: 0,
      nayVotes: 0,
      missedVotes: 0,
      totalVotes: 0,
      streaks: { activity: 0, voting: 0, leader: 0 },
      metrics: { lastTotals: {} }
    });

    let activityStreak = 0;
    let votingStreak = 0;
    let leaderStreak = 0;

    let lastSponsored = 0;
    let lastCosponsored = 0;
    let lastYea = 0;
    let lastNay = 0;
    let lastMissed = 0;
    let lastTotal = 0;

    const voteDays = voteTimeline[bioguide] || {};
    const billDays = billTimeline[bioguide] || new Set();

    for (const day of dateRange(START_DATE, todayKey)) {
      const voteDay = voteDays[day] || { yea: 0, nay: 0, missed: 0 };
      const billActive = billDays.has(day);

      const yea = lastYea + voteDay.yea;
      const nay = lastNay + voteDay.nay;
      const missed = lastMissed + voteDay.missed;
      const total = yea + nay + missed;

      const sponsored = lastSponsored + (billActive ? 1 : 0);
      const cosponsored = lastCosponsored;

      const hadBillChange = sponsored > lastSponsored || cosponsored > lastCosponsored;
      const hadVoteChange = (yea + nay) > (lastYea + lastNay);

      if (hadBillChange || hadVoteChange) {
        activityStreak += 1;
      } else {
        activityStreak = 0;
      }

      const newTotal = total - lastTotal;
      const newMissed = missed - lastMissed;
      if (newTotal > 0) {
        if (newMissed <= 1) {
          votingStreak += 1;
        } else {
          votingStreak = 0;
        }
      }

      const isLeader = leaderIds.includes(bioguide);
      leaderStreak = isLeader ? leaderStreak + 1 : 0;

      lastSponsored = sponsored;
      lastCosponsored = cosponsored;
      lastYea = yea;
      lastNay = nay;
      lastMissed = missed;
      lastTotal = total;
    }

    person.streaks.activity = activityStreak;
    person.streaks.voting = votingStreak;
    person.streaks.leader = leaderStreak;

    person.streak = Math.max(
      person.streaks.activity,
      person.streaks.voting,
      person.streaks.leader
    );

    person.metrics.lastTotals = {
      sponsoredBills: lastSponsored,
      cosponsoredBills: lastCosponsored,
      yeaVotes: lastYea,
      nayVotes: lastNay,
      missedVotes: lastMissed,
      totalVotes: lastTotal
    };

    person.lastUpdated = new Date().toISOString();

    byId.set(bioguide, person);

    streaksOutput.push({
      bioguideId: bioguide,
      activity: person.streaks.activity,
      voting: person.streaks.voting,
      leader: person.streaks.leader
    });
  }

  const finalRankings = Array.from(byId.values());
  fs.writeFileSync(RANKINGS_PATH, JSON.stringify(finalRankings, null, 2));
  fs.writeFileSync(STREAKS_PATH, JSON.stringify(streaksOutput, null, 2));
  fs.writeFileSync(PREV_RANKINGS_PATH, JSON.stringify(finalRankings, null, 2));

  console.log(`Rebuilt streaks for ${streaksOutput.length} senators`);
}

(async () => {
  console.log('Rebuilding Senate streak history for the 119th Congress...');
  const timelines = await buildDailyTimelines();
  computeStreaksFromTimelines(timelines);
  console.log('Streak history rebuild complete.');
})().catch(err => {
  console.error('Rebuild failed:', err);
  process.exit(1);
});
