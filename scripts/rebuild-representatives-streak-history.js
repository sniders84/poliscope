// rebuild-representatives-streak-history.js
// Fresh implementation — rebuilds streak history for all Representatives
// using daily event data from your existing pipeline.

import fs from "fs";
import path from "path";

// Input directories
const EVENTS_DIR = path.join("data", "representatives", "events");
const OUTPUT_DIR = path.join("data", "representatives", "streaks");

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Utility: load JSON safely
function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Load all daily event files for Representatives
function loadAllDailyEvents() {
  const files = fs.readdirSync(EVENTS_DIR).filter(f => f.endsWith(".json"));

  const allEvents = [];

  for (const file of files) {
    const fullPath = path.join(EVENTS_DIR, file);
    const dayEvents = loadJSON(fullPath);

    // Expecting: [{ bioguideId, date, attended: true/false }, ...]
    for (const ev of dayEvents) {
      allEvents.push(ev);
    }
  }

  return allEvents;
}

// Group events by Representative
function groupEventsByRep(allEvents) {
  const map = new Map();

  for (const ev of allEvents) {
    if (!map.has(ev.bioguideId)) {
      map.set(ev.bioguideId, []);
    }
    map.get(ev.bioguideId).push(ev);
  }

  // Sort each rep's events by date ascending
  for (const [rep, events] of map.entries()) {
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return map;
}

// Compute streak history for a single Representative
function computeStreakHistory(events) {
  let streak = 0;
  let maxStreak = 0;

  const history = [];

  for (const ev of events) {
    if (ev.attended) {
      streak += 1;
      if (streak > maxStreak) maxStreak = streak;
    } else {
      streak = 0;
    }

    history.push({
      date: ev.date,
      attended: ev.attended,
      streak,
      maxStreak
    });
  }

  return history;
}

// Write streak history for a single Representative
function writeRepStreakHistory(bioguideId, history) {
  const outPath = path.join(OUTPUT_DIR, `${bioguideId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(history, null, 2));
}

// Main rebuild function
function rebuildAllRepresentatives() {
  const allEvents = loadAllDailyEvents();
  const grouped = groupEventsByRep(allEvents);

  for (const [bioguideId, events] of grouped.entries()) {
    const history = computeStreakHistory(events);
    writeRepStreakHistory(bioguideId, history);
  }

  console.log("Rebuild complete for all Representatives.");
}

// Execute when run directly
rebuildAllRepresentatives();

export {
  loadAllDailyEvents,
  groupEventsByRep,
  computeStreakHistory,
  writeRepStreakHistory,
  rebuildAllRepresentatives
};
