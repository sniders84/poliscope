// Normalize incoming entries
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
    pollingScore: entry.pollingScore ?? null,
    pollingDate: entry.pollingDate ?? null,
    pollingSource: entry.pollingSource ?? null,
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

// Data load
Promise.all([
  fetch("/governors.json").then(r => r.json()).catch(() => []),
  fetch("/ltgovernors.json").then(r => r.json()).catch(() => []),
  fetch("/senators.json").then(r => r.json()).catch(() => []),
  fetch("/housereps.json").then(r => r.json()).catch(() => [])
]).then(([govs, ltgovs, sens, reps]) => {
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

  populateStates();
  renderHeader();
  activateTab("officials");

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
    searchInput.disabled = false;
  }

  const stateSelect = document.getElementById("stateSelect");
  if (stateSelect) {
    stateSelect.addEventListener("change", () => {
      const state = stateSelect.value;
      activateTab("officials");
      renderOfficials(state || window.allOfficials);
    });
  }
});
        <div class="ranking-row">${renderRankingCards(bottomRight)}</div>
      </div>
    </div>
    `;
    container.appendChild(section);
  });

  // Toggle sections
  document.querySelectorAll(".ranking-header").forEach(header => {
    header.addEventListener("click", () => {
      const key = header.getAttribute("data-toggle");
      const content = document.getElementById(`content-${key}`);
      if (content) content.classList.toggle("active");
    });
  });

  // Expand full rankings
  document.querySelectorAll(".expand-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);
      if (!target) return;
      const isHidden = target.style.display === "none";
      target.style.display = isHidden ? "grid" : "none";
      btn.textContent = isHidden ? "Hide Full Rankings" : "Show Full Rankings";
    });
  });
}
// Calendar and Registration placeholders
function renderCalendar() {
  const container = document.getElementById("calendar");
  if (!container) return;
  container.innerHTML = `<p>Calendar content will go here. Wire in election dates, civic events, and deadlines.</p>`;
}

function renderRegistration() {
  const container = document.getElementById("registration");
  if (!container) return;
  container.innerHTML = `<p>Registration info will go here. Wire in mail-in ballot links, deadlines, and instructions.</p>`;
}

// States
function populateStates() {
  const stateSelect = document.getElementById("stateSelect");
  if (!stateSelect) return;
  const states = Array.from(new Set(window.allOfficials.map(o => o.state))).sort();
  states.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    stateSelect.appendChild(opt);
  });
}
// Modal
function openModal(o) {
  const modal = document.getElementById("modal");
  const photo = document.getElementById("modalPhoto");
  const name = document.getElementById("modalName");
  const office = document.getElementById("modalOffice");
  const state = document.getElementById("modalState");
  const link = document.getElementById("modalLink");
  const bio = document.getElementById("modalBio");
  const details = document.getElementById("modalDetails");

  photo.src = (o.photo && o.photo.startsWith("http")) ? o.photo : "assets/default-photo.png";
  photo.alt = o.name;
  name.textContent = o.name;
  office.textContent = o.office;
  state.textContent = o.state;
  link.href = o.ballotpediaLink || "#";
  bio.textContent = o.bio || "";

  details.innerHTML = `
    <li><strong>Party:</strong> ${o.party || "N/A"}</li>
    <li><strong>Term:</strong> ${o.termStart || "?"} – ${o.termEnd || "?"}</li>
    <li><strong>Polling:</strong> ${o.pollingScore ?? "N/A"} (${o.pollingSource || "N/A"})</li>
  `;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // Close handlers
  document.getElementById("modalClose").onclick = closeModal;
  document.querySelector(".modal-overlay").onclick = closeModal;

  // Escape to close
  document.addEventListener("keydown", escCloseOnce);
}

function escCloseOnce(e) {
  if (e.key === "Escape") {
    closeModal();
    document.removeEventListener("keydown", escCloseOnce);
  }
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}
        <div class="ranking-row">${renderRankingCards(bottomRight)}</div>
      </div>
    </div>
    `;
    container.appendChild(section);
  });

  // Toggle sections
  document.querySelectorAll(".ranking-header").forEach(header => {
    header.addEventListener("click", () => {
      const key = header.getAttribute("data-toggle");
      const content = document.getElementById(`content-${key}`);
      if (content) content.classList.toggle("active");
    });
  });

  // Expand full rankings
  document.querySelectorAll(".expand-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);
      if (!target) return;
      const isHidden = target.style.display === "none";
      target.style.display = isHidden ? "grid" : "none";
      btn.textContent = isHidden ? "Hide Full Rankings" : "Show Full Rankings";
    });
  });
}
// Modal
function openModal(o) {
  const modal = document.getElementById("modal");
  const photo = document.getElementById("modalPhoto");
  const name = document.getElementById("modalName");
  const office = document.getElementById("modalOffice");
  const state = document.getElementById("modalState");
  const link = document.getElementById("modalLink");
  const bio = document.getElementById("modalBio");
  const details = document.getElementById("modalDetails");

  photo.src = (o.photo && o.photo.startsWith("http")) ? o.photo : "assets/default-photo.png";
  photo.alt = o.name;
  name.textContent = o.name;
  office.textContent = o.office;
  state.textContent = o.state;
  link.href = o.ballotpediaLink || "#";
  bio.textContent = o.bio || "";

  details.innerHTML = `
    <li><strong>Party:</strong> ${o.party || "N/A"}</li>
    <li><strong>Term:</strong> ${o.termStart || "?"} – ${o.termEnd || "?"}</li>
    <li><strong>Polling:</strong> ${o.pollingScore ?? "N/A"} (${o.pollingSource || "N/A"})</li>
  `;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  document.getElementById("modalClose").onclick = closeModal;
  document.querySelector(".modal-overlay").onclick = closeModal;
  document.addEventListener("keydown", escCloseOnce);
}

function escCloseOnce(e) {
  if (e.key === "Escape") {
    closeModal();
    document.removeEventListener("keydown", escCloseOnce);
  }
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}
// Calendar and Registration placeholders
function renderCalendar() {
  const container = document.getElementById("calendar");
  if (!container) return;
  container.innerHTML = `<p>Calendar content will go here. Wire in election dates, civic events, and deadlines.</p>`;
}

function renderRegistration() {
  const container = document.getElementById("registration");
  if (!container) return;
  container.innerHTML = `<p>Registration info will go here. Wire in mail-in ballot links, deadlines, and instructions.</p>`;
}
// States
function populateStates() {
  const stateSelect = document.getElementById("stateSelect");
  if (!stateSelect) return;
  const states = Array.from(new Set(window.allOfficials.map(o => o.state))).sort();
  states.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    stateSelect.appendChild(opt);
  });
}
// Modal
function openModal(o) {
  const modal = document.getElementById("modal");
  const photo = document.getElementById("modalPhoto");
  const name = document.getElementById("modalName");
  const office = document.getElementById("modalOffice");
  const state = document.getElementById("modalState");
  const link = document.getElementById("modalLink");
  const bio = document.getElementById("modalBio");
  const details = document.getElementById("modalDetails");

  photo.src = (o.photo && o.photo.startsWith("http")) ? o.photo : "assets/default-photo.png";
  photo.alt = o.name;
  name.textContent = o.name;
  office.textContent = o.office;
  state.textContent = o.state;
  link.href = o.ballotpediaLink || "#";
  bio.textContent = o.bio || "";

  details.innerHTML = `
    <li><strong>Party:</strong> ${o.party || "N/A"}</li>
    <li><strong>Term:</strong> ${o.termStart || "?"} – ${o.termEnd || "?"}</li>
    <li><strong>Polling:</strong> ${o.pollingScore ?? "N/A"} (${o.pollingSource || "N/A"})</li>
  `;

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  document.getElementById("modalClose").onclick = closeModal;
  document.querySelector(".modal-overlay").onclick = closeModal;
  document.addEventListener("keydown", escCloseOnce);
}
function escCloseOnce(e) {
  if (e.key === "Escape") {
    closeModal();
    document.removeEventListener("keydown", escCloseOnce);
  }
}

function closeModal() {
  const modal = document.getElementById("modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}
// Rankings
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
      if (content) content.classList.toggle("active");
    });
  });

  document.querySelectorAll(".expand-button").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-target");
      const target = document.getElementById(targetId);
      if (!target) return;
      const isHidden = target.style.display === "none";
      target.style.display = isHidden ? "grid" : "none";
      btn.textContent = isHidden ? "Hide Full Rankings" : "Show Full Rankings";
    });
  });
}
