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
  console.log("All officials loaded:", window.allOfficials.length);

  // ✅ UI Setup after data is loaded
  renderHeader();
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  renderOfficials("Alabama");
  renderRankings("governors");
  renderCalendar();
  renderRegistration();

  const defaultTab = document.getElementById("officials");
  if (defaultTab) defaultTab.classList.add("active");
});
function handleSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const results = window.allOfficials.filter(o =>
    o.name.toLowerCase().includes(query) ||
    o.state.toLowerCase().includes(query)
  );
  renderOfficials(results);
}

function renderHeader() {
  const header = document.querySelector(".electorate-header");
  if (!header) return;
  // Already rendered via HTML — no injection needed
}

function renderOfficials(stateOrList) {
  const container = document.getElementById("officials");
  if (!container) return;

  const filtered = Array.isArray(stateOrList)
    ? stateOrList
    : window.allOfficials.filter(o => o.state === stateOrList);

  container.innerHTML = "";

  if (filtered.length === 0) {
    container.innerHTML = `<p>No officials match your search.</p>`;
    return;
  }

  filtered.forEach(o => {
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.innerHTML = `
      <img src="${o.photo}" alt="${o.name}" class="official-photo"
           onerror="this.src='assets/fallback.png'" />
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        ${o.party}<br/>
        <a href="${o.ballotpediaLink}" target="_blank">Ballotpedia</a><br/>
        ${o.contact.website ? `<a href="${o.contact.website}" target="_blank">Website</a><br/>` : ""}
        ${o.contact.email ? `Email: ${o.contact.email}<br/>` : ""}
        ${o.contact.phone ? `Phone: ${o.contact.phone}` : ""}
      </div>
    `;
    card.addEventListener("click", () => openModal(o));
    container.appendChild(card);
  });
}
function computeRankings(rawList) {
  const ranked = rawList.filter(o => o.pollingScore !== null);
  const unranked = rawList.filter(o => o.pollingScore === null);

  ranked.sort((a, b) => b.pollingScore - a.pollingScore);
  ranked.forEach((o, i) => o.computedRank = i + 1);
  unranked.forEach(o => o.computedRank = null);

  return [...ranked, ...unranked];
}

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
      <img src="${o.photo}" alt="${o.name}" class="official-photo"
           onerror="this.src='assets/fallback.png'" />
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        Rank: ${o.computedRank !== null ? o.computedRank : "N/A"}
        ${o.pollingDate ? ` • ${o.pollingDate}` : ""}
        ${o.pollingSource ? ` • <a href="${o.pollingSource}" target="_blank">Source</a>` : ""}
      </div>
    `;
    card.addEventListener("click", () => openModal(o));
    container.appendChild(card);
  });
}

function renderCalendar() {
  const container = document.getElementById("calendar");
  if (!container) return;
  container.innerHTML = `<p>Calendar content will go here. You can wire in election dates, civic events, and deadlines.</p>`;
}

function renderRegistration() {
  const container = document.getElementById("registration");
  if (!container) return;
  container.innerHTML = `<p>Registration info will go here. You can wire in mail-in ballot links, deadlines, and instructions.</p>`;
}
document.querySelectorAll(".tabs-vertical button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    const target = document.getElementById(tab);
    if (target) target.classList.add("active");
  });
});

const stateSelect = document.getElementById("stateSelect");
if (stateSelect) {
  stateSelect.addEventListener("change", e => {
    renderOfficials(e.target.value);
    renderCalendar();
    renderRegistration();
  });
}

function openModal(o) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modalContent");
  if (!modal || !content) return;

  content.innerHTML = `
    <h2>${o.name}</h2>
    <p><strong>${o.office}</strong> • ${o.state}</p>
    <p>${o.party}</p>
    ${o.ballotpediaLink ? `<p><a href="${o.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ""}
    ${o.contact.website ? `<p><a href="${o.contact.website}" target="_blank">Official Website</a></p>` : ""}
    ${o.contact.email ? `<p>Email: ${o.contact.email}</p>` : ""}
    ${o.contact.phone ? `<p>Phone: ${o.contact.phone}</p>` : ""}
    ${o.termStart ? `<p>Term Start: ${o.termStart}</p>` : ""}
    ${o.termEnd ? `<p>Term End: ${o.termEnd}</p>` : ""}
    ${o.pollingScore !== null ? `<p>Polling Score: ${o.pollingScore}</p>` : ""}
    ${o.pollingDate ? `<p>Polling Date: ${o.pollingDate}</p>` : ""}
    ${o.pollingSource ? `<p><a href="${o.pollingSource}" target="_blank">Polling Source</a></p>` : ""}
  `;

  modal.classList.remove("hidden");
}

function wireModalClose() {
  const closeBtn = document.getElementById("closeModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const modal = document.getElementById("modal");
      if (modal) modal.classList.add("hidden");
    });
  }
}

// ✅ Call this once after DOM is ready
wireModalClose();

