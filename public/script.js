// ✅ Normalize function for consistent schema
function normalize(entry, officeLabel) {
  return {
    name: entry.name,
    state: entry.state,
    party: entry.party,
    office: officeLabel,
    slug: entry.slug,
    photo: entry.photo,
    ballotpediaLink: entry.ballotpediaLink,
    termStart: entry.termStart,
    termEnd: entry.termEnd,
    contact: entry.contact || {},
    pollingScore: entry.pollingScore || null,
    pollingDate: entry.pollingDate || null,
    pollingSource: entry.pollingSource || null
  };
}

// ✅ Fetch and store globally
Promise.all([
  fetch("/governors.json").then(r => r.json()).catch(err => {
    console.error("Governors JSON error:", err);
    return [];
  }),
  fetch("/ltgovernors.json").then(r => r.json()).catch(err => {
    console.error("Lt. Governors JSON error:", err);
    return [];
  }),
  fetch("/senators.json").then(r => r.json()).catch(err => {
    console.error("Senators JSON error:", err);
    return [];
  }),
  fetch("/housereps.json").then(r => r.json()).catch(err => {
    console.error("House Reps JSON error:", err);
    return [];
  })
])
.then(([govs, ltgovs, sens, reps]) => {
  window.govs = govs;
  window.ltgovs = ltgovs;
  window.sens = sens;
  window.reps = reps;

  const govNorm = govs.map(g => normalize(g, "Governor"));
  const ltgNorm = ltgovs.map(l => normalize(l, "Lt. Governor"));
  const senNorm = sens.map(s => normalize(s, "Senator"));
  const repNorm = reps.map(h => normalize(h, "House Representative"));

  window.rankingsData = {
    governors: govNorm,
    ltgovernors: ltgNorm,
    senators: senNorm,
    housereps: repNorm
  };

  window.allOfficials = [...govNorm, ...ltgNorm, ...senNorm, ...repNorm];

  console.log("All officials loaded:", window.allOfficials.length);

  document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderOfficials("Alabama");
  renderRankings("governors");
  renderCalendar();
  renderRegistration();
});

  const defaultTab = document.getElementById("officials");
  if (defaultTab) defaultTab.classList.add("active");
});

// ✅ Render Header and Logo
function renderHeader() {
  const header = document.getElementById("header");
  if (!header) return;

  header.innerHTML = `
    <div class="logo-bar">
      <img src="/logo.png" alt="Electorate Logo" class="site-logo"/>
      <h1>Electorate</h1>
    </div>
    <div class="search-bar">
      <input type="text" placeholder="Search officials..." id="searchInput"/>
    </div>
  `;
}

// ✅ Render Officials tab
function renderOfficials(state) {
  const container = document.getElementById("officials");
  if (!container) return;

  const filtered = window.allOfficials.filter(o => o.state === state);
  container.innerHTML = "";

  filtered.forEach(o => {
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.innerHTML = `
      <img src="${o.photo}" alt="${o.name}" class="official-photo"/>
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        ${o.party}<br/>
        <a href="${o.ballotpediaLink}" target="_blank" rel="noopener">Ballotpedia</a><br/>
        ${o.contact.website ? `<a href="${o.contact.website}" target="_blank">Website</a><br/>` : ""}
        ${o.contact.email ? `Email: ${o.contact.email}<br/>` : ""}
        ${o.contact.phone ? `Phone: ${o.contact.phone}` : ""}
      </div>
    `;
    container.appendChild(card);
  });
}

// ✅ Compute Rankings
function computeRankings(rawList) {
  const ranked = rawList.filter(o => o.pollingScore !== null);
  const unranked = rawList.filter(o => o.pollingScore === null);

  ranked.sort((a, b) => {
    if (b.pollingScore !== a.pollingScore) {
      return b.pollingScore - a.pollingScore;
    }
    if ((a.disapprove || 0) !== (b.disapprove || 0)) {
      return a.disapprove - b.disapprove;
    }
    return (a.dk || 0) - (b.dk || 0);
  });

  ranked.forEach((o, i) => { o.computedRank = i + 1; });
  unranked.forEach(o => { o.computedRank = null; });

  return [...ranked, ...unranked];
}

// ✅ Render Rankings tab
function renderRankings(category) {
  const container = document.getElementById("rankings");
  if (!container) return;

  const rawList = window.rankingsData[category] || [];
  const list = computeRankings(rawList);

  container.innerHTML = "";
  list.forEach(o => {
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.innerHTML = `
      <img src="${o.photo}" alt="${o.name}" class="official-photo"/>
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        Rank: ${o.computedRank !== null ? o.computedRank : "N/A"}
        ${o.pollingDate ? ` • ${o.pollingDate}` : ""}
        ${o.pollingSource ? ` • <a href="${o.pollingSource}" target="_blank" rel="noopener">Source</a>` : ""}
      </div>
    `;
    container.appendChild(card);
  });
}

// ✅ Render Calendar tab (placeholder)
function renderCalendar() {
  const container = document.getElementById("calendar");
  if (!container) return;

  container.innerHTML = `
    <p>Calendar content will go here. You can wire in election dates, civic events, and deadlines.</p>
  `;
}

// ✅ Render Registration tab (placeholder)
function renderRegistration() {
  const container = document.getElementById("registration");
  if (!container) return;

  container.innerHTML = `
    <p>Registration info will go here. You can wire in mail-in ballot links, deadlines, and instructions.</p>
  `;
}

// ✅ Tab switching logic
document.querySelectorAll(".tabs-vertical button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    const target = document.getElementById(tab);
    if (target) target.classList.add("active");
  });
});

// ✅ State selector logic
const stateSelect = document.getElementById("stateSelect");
if (stateSelect) {
  stateSelect.addEventListener("change", e => {
    renderOfficials(e.target.value);
  });
}
