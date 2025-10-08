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
    pollingSource: entry.pollingSource || null,
    bio: entry.bio || "",
    education: entry.education || "",
    endorsements: entry.endorsements || "",
    platform: entry.platform || "",
    platformFollowThrough: entry.platformFollowThrough || {},
    proposals: entry.proposals || "",
    engagement: entry.engagement || {},
    billsSigned: entry.billsSigned || [],
    vetoes: entry.vetoes || "",
    salary: entry.salary || "",
    predecessor: entry.predecessor || "",
    electionYear: entry.electionYear || "",
    rankingNote: entry.rankingNote || "",
    rank: entry.rank || ""
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

  renderHeader();
  activateTab("officials");

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
    searchInput.disabled = false;
  }
});
function activateTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.remove("active");
    p.innerHTML = "";
  });

  const target = document.getElementById(tabId);
  if (target) {
    target.classList.add("active");

    if (tabId === "officials") renderOfficials("Alabama");
    if (tabId === "rankings") renderRankings();
    if (tabId === "calendar") renderCalendar();
    if (tabId === "registration") renderRegistration();
  }

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.value = "";
}

document.querySelectorAll(".tabs-vertical button").forEach(btn => {
  btn.addEventListener("click", () => {
    const tab = btn.getAttribute("data-tab");
    activateTab(tab);
  });
});

function handleSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  const results = window.allOfficials.filter(o =>
    o.name.toLowerCase().includes(query) ||
    o.state.toLowerCase().includes(query)
  );

  activateTab("officials");
  renderOfficials(results);
}

function renderHeader() {
  const header = document.querySelector(".electorate-header");
  if (!header) return;
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
    const photoSrc = o.photo && o.photo.startsWith("http") ? o.photo : "default-photo.png";
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.setAttribute("data-party", o.party);
    card.innerHTML = `
      <img src="${photoSrc}" alt="${o.name}" class="official-photo" />
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        ${o.party}<br/>
        <a href="${o.ballotpediaLink}" target="_blank">Ballotpedia</a>
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
function computeRankings(rawList) {
  const ranked = rawList.filter(o => o.pollingScore !== null);
  const unranked = rawList.filter(o => o.pollingScore === null);

  ranked.sort((a, b) => b.pollingScore - a.pollingScore);
  ranked.forEach((o, i) => o.computedRank = i + 1);
  unranked.forEach(o => o.computedRank = null);

  return [...ranked, ...unranked];
}

function renderRankings() {
  const container = document.getElementById("rankings");
  if (!container) return;

  const categories = {
    governors: "Governor",
    ltgovernors: "Lt. Governor",
    senators: "Senator",
    housereps: "House Representative"
  };

  container.innerHTML = "";

  Object.entries(categories).forEach(([key, label]) => {
    const rawList = window.rankingsData[key] || [];
    const list = computeRankings(rawList);

    const top10 = list.slice(0, 10);
    const bottom10 = list.slice(-10);
    const middle = list.slice(10, -10);

    const topLeft = top10.slice(0, 5);
    const topRight = top10.slice(5, 10);
    const bottomLeft = bottom10.slice(0, 5);
    const bottomRight = bottom10.slice(5, 10);

    const section = document.createElement("section");
    section.className = "ranking-category";

    section.innerHTML = `
      <div class="ranking-header" data-toggle="${key}">${label}</div>
      <div id="content-${key}" class="ranking-content">
        <h4>Top 10</h4>
        <div class="ranking-grid-two">
          <div class="ranking-row">${renderRankingCards(topLeft)}</div>
          <div class="ranking-row">${renderRankingCards(topRight)}</div>
        </div>

        <button class="expand-button" data-target="full-${key}">Show Full Rankings</button>
        <div id="full-${key}" class="ranking-grid-two" style="display: none;">
          <div class="ranking-row">${renderRankingCards(middle.slice(0, Math.ceil(middle.length / 2)))}</div>
          <div class="ranking-row">${renderRankingCards(middle.slice(Math.ceil(middle.length / 2)))}</div>
        </div>

        <h4>Bottom 10</h4>
        <div class="ranking-grid-two">
          <div class="ranking-row">${renderRankingCards(bottomLeft)}</div>
          <div class="ranking-row">${renderRankingCards(bottomRight)}</div>
        </div>
      </div>
    `;

    container.appendChild(section);
  });

    document.querySelectorAll(".ranking-header").forEach(header => {
    header.addEventListener("click", () => {
      const key = header.getAttribute("data-toggle");
      const content = document.getElementById(`content-${key}`);
      if (content) {
        content.classList.toggle("active");
      }
    });
  });

  document.querySelectorAll(".expand-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);
      if (target) {
        const isHidden = target.style.display === "none";
        target.style.display = isHidden ? "grid" : "none";
        btn.textContent = isHidden ? "Hide Full Rankings" : "Show Full Rankings";
      }
    });
  });
}
