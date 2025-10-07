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

// ✅ Fetch and store all officials
Promise.all([
  fetch("/governors.json").then(r => r.json()).catch(() => []),
  fetch("/ltgovernors.json").then(r => r.json()).catch(() => []),
  fetch("/senators.json").then(r => r.json()).catch(() => []),
  fetch("/housereps.json").then(r => r.json()).catch(() => [])
])
.then(([govs, ltgovs, sens, reps]) => {
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

  // ✅ Initial render
  renderOfficials("Alabama");
  renderRankings("governors");
  renderCalendar();
  renderRegistration();
});

// ✅ Render Officials tab
function renderOfficials(state) {
  const container = document.getElementById("officials");
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

// ✅ Render Rankings tab
function renderRankings(category) {
  const container = document.getElementById("rankings");
  const list = (window.rankingsData[category] || [])
    .sort((a, b) => (b.pollingScore || 0) - (a.pollingScore || 0));

  list.forEach((o, i) => { o.computedRank = i + 1; });

  container.innerHTML = "";
  list.forEach(o => {
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.innerHTML = `
      <img src="${o.photo}" alt="${o.name}" class="official-photo"/>
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        Rank: ${o.computedRank}
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
  container.innerHTML = `
    <p>Calendar content will go here. You can wire in election dates, civic events, and deadlines.</p>
  `;
}

// ✅ Render Registration tab (placeholder)
function renderRegistration() {
  const container = document.getElementById("registration");
  container.innerHTML = `
    <p>Registration info will go here. You can wire in mail-in ballot links, deadlines, and instructions.</p>
  `;
}

// ✅ Tab switching logic (vertical sidebar)
document.querySelectorAll(".tabs-vertical button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    document.getElementById(tab).classList.add("active");
  });
});

// ✅ Default tab on load
document.getElementById("officials").classList.add("active");

// ✅ State selector logic
document.getElementById("stateSelect").addEventListener("change", e => {
  renderOfficials(e.target.value);
});