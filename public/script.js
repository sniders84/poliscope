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

  renderOfficials("Alabama");

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

  container.innerHTML = "";
  list.forEach(o => {
    const card = document.createElement("div");
    card.className = "ranking-card";
    card.innerHTML = `
      <img src="${o.photo}" alt="${o.name}" class="official-photo" />
      <div class="card-body">
        <strong>${o.name}</strong><br/>
        ${o.office} • ${o.state}<br/>
        Rank: ${o.computedRank !== null ? o.computedRank : "N/A"}
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

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.value = "";
      renderOfficials("Alabama");
    }

    if (tab === "rankings") renderRankings("governors");
    if (tab === "calendar") renderCalendar();
    if (tab === "registration") renderRegistration();
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
    <div class="modal-profile">
      <img src="${o.photo}" alt="${o.name}" class="modal-photo" />
      <h2>${o.name}</h2>
      <p><strong>${o.office}</strong> • ${o.state}</p>
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
      ${o.rankingNote ? `<p>${o.rankingNote}</p>` : ""}
      ${o.bio ? `<hr/><p><strong>Bio:</strong> ${o.bio}</p>` : ""}
      ${o.education ? `<p><strong>Education:</strong> ${o.education}</p>` : ""}
      ${o.endorsements ? `<p><strong>Endorsements:</strong> ${o.endorsements}</p>` : ""}
      ${o.platform ? `<p><strong>Platform:</strong> ${o.platform}</p>` : ""}
      ${platformDetails ? `<hr/><p><strong>Platform Follow-Through:</strong><br/>${platformDetails}</p>` : ""}
      ${o.proposals ? `<p><strong>Proposals:</strong> ${o.proposals}</p>` : ""}
      ${o.vetoes ? `<p><strong>Veto History:</strong> ${o.vetoes}</p>` : ""}
      ${bills ? `<hr/><p><strong>Bills Signed:</strong></p><ul>${bills}</ul>` : ""}
      ${sources ? `<p><strong>Engagement Sources:</strong></p><ul>${sources}</ul>` : ""}
      <button id="closeModal" class="modal-close">Close</button>
    </div>
  `;

  modal.classList.remove("hidden");

  // ✅ Wire close button immediately
  const closeBtn = document.getElementById("closeModal");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.add("hidden");
    });
  }
}
