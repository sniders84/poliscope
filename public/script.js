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
  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  activateTab("officials");
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
    if (tabId === "rankings") renderRankings("governors");
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
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.innerHTML = `
      <img src="${o.photo}" alt="${o.name}" class="official-photo" />
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

  const top10 = list.slice(0, 10);
  const bottom10 = list.slice(-10);
  const middle = list.slice(10, -10);

  container.innerHTML = `
    <h3>Top 10</h3>
    <div class="ranking-grid">${renderRankingCards(top10)}</div>
    <h3>Bottom 10</h3>
    <div class="ranking-grid">${renderRankingCards(bottom10)}</div>
    <button id="expandRankings" class="expand-button">Show Full Rankings</button>
    <div id="fullRankings" class="ranking-grid hidden">${renderRankingCards(middle)}</div>
  `;

  const expandBtn = document.getElementById("expandRankings");
  const fullList = document.getElementById("fullRankings");
  if (expandBtn && fullList) {
    expandBtn.addEventListener("click", () => {
      fullList.classList.toggle("hidden");
      expandBtn.textContent = fullList.classList.contains("hidden")
        ? "Show Full Rankings"
        : "Hide Full Rankings";
    });
  }
}

function renderRankingCards(list) {
  return list.map(o => `
    <div class="ranking-card">
      <img src="${o.photo}" alt="${o.name}" class="official-photo" />
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        Rank: ${o.computedRank !== null ? o.computedRank : "N/A"}
      </div>
    </div>
  `).join("");
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
function openModal(o) {
  const modal = document.getElementById("modal");
  const content = document.getElementById("modalContent");
  if (!modal || !content) return;

  let platformDetails = "";
  if (o.platformFollowThrough) {
    platformDetails = Object.entries(o.platformFollowThrough).map(([key, val]) => {
      return `<strong>${key}:</strong> ${val}`;
    }).join("<br/><br/>");
  }

  let bills = "";
  if (Array.isArray(o.billsSigned)) {
    bills = o.billsSigned.map(b => {
      return `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`;
    }).join("");
  }

  let sources = "";
  if (o.engagement?.sources) {
    sources = o.engagement.sources.map(s => {
      return `<li><a href="${s}" target="_blank">${s}</a></li>`;
    }).join("");
  }

  content.innerHTML = `
    <button id="closeModal" class="modal-close">×</button>
    <div class="modal-left">
      <img src="${o.photo}" alt="${o.name}" />
      <p><strong>${o.name}</strong></p>
      <p>${o.office} • ${o.state}</p>
      <p>${o.party}</p>
      ${o.ballotpediaLink ? `<p><a href="${o.ballotpediaLink}" target="_blank">Ballotpedia Profile</a></p>` : ""}
      ${o.contact.website ? `<p><a href="${o.contact.website}" target="_blank">Official Website</a></p>` : ""}
      ${o.contact.email ? `<p>Email: ${o.contact.email}</p>` : ""}
      ${o.contact.phone ? `<p>Phone: ${o.contact.phone}</p>` : ""}
      ${o.termStart ? `<p>Term Start: ${o.termStart}</p>` : ""}
      ${o.termEnd ? `<p>Term End: ${o.termEnd}</p>` : ""}
      ${o.salary ? `<p>Salary: ${o.salary}</p>` : ""}
      ${o.predecessor ? `<p>Predecessor: ${o.predecessor}</p>` : ""}
      ${o.electionYear ? `<p>Next Election: ${o.electionYear}</p>` : ""}
      ${o.pollingScore ? `<p>Polling Score: ${o.pollingScore}</p>` : ""}
      ${o.pollingDate ? `<p>Polling Date: ${o.pollingDate}</p>` : ""}
      ${o.pollingSource ? `<p><a href="${o.pollingSource}" target="_blank">Polling Source</a></p>` : ""}
    </div>
    <div class="modal-right">
      ${o.bio ? `<p><strong>Bio:</strong> ${o.bio}</p>` : ""}
      ${o.education ? `<p><strong>Education:</strong> ${o.education}</p>` : ""}
      ${o.endorsements ? `<p><strong>Endorsements:</strong> ${o.endorsements}</p>` : ""}
      ${o.platform ? `<p><strong>Platform:</strong> ${o.platform}</p>` : ""}
      ${platformDetails ? `<p><strong>Platform Follow-Through:</strong><br/>${platformDetails}</p>` : ""}
      ${o.proposals ? `<p><strong>Proposals:</strong> ${o.proposals}</p>` : ""}
      ${o.vetoes ? `<p><strong>Veto History:</strong> ${o.vetoes}</p>` : ""}
      ${bills ? `<p><strong>Bills Signed:</strong></p><ul>${bills}</ul>` : ""}
      ${sources ? `<p><strong>Engagement Sources:</strong></p><ul>${sources}</ul>` : ""}
    </div>
  `;

  modal.classList.remove("hidden");

  setTimeout(() => {
    const closeBtn = document.getElementById("closeModal");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
      });
    }
  }, 0);
}
