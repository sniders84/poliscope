document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const dropdown = document.getElementById("stateDropdown");
  const officialsContainer = document.getElementById("officialsContainer");
  const calendarContainer = document.getElementById("calendarContainer");
  const registrationContainer = document.getElementById("registrationContainer");
  const rankingsContainer = document.getElementById("rankingsContainer");
  const rankingCategory = document.getElementById("rankingCategory");
  const expandRankings = document.getElementById("expandRankings");

  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modalContent");
  const closeModal = document.getElementById("closeModal");
  if (closeModal) closeModal.addEventListener("click", () => modal.classList.add("hidden"));

  // Tabs
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });

  // Default to Officials
  document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
  const officialsSection = document.getElementById("officialsTab");
  if (officialsSection) officialsSection.classList.remove("hidden");

  // States (56 jurisdictions)
  const states = [
    "Alabama","Alaska","American Samoa","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Guam","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
    "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Northern Mariana Islands",
    "Ohio","Oklahoma","Oregon","Pennsylvania","Puerto Rico","Rhode Island","South Carolina","South Dakota","Tennessee",
    "Texas","Utah","Vermont","Virgin Islands","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
  ];
  if (dropdown) {
    states.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      dropdown.appendChild(opt);
    });
  }

  // Data stores
  let allOfficials = [];
  const rankingsData = { governors: [], ltgovernors: [], senators: [], housereps: [] };

  // Normalize entries across datasets
  function normalize(entry, office) {
    const raw = entry.pollingScore;
    const pct = typeof raw === "string" ? raw.trim() : raw;
    const numeric = typeof pct === "string" && pct.endsWith("%")
      ? Number(pct.slice(0, -1))
      : typeof pct === "number" ? pct : undefined;

    return {
      name: entry.name,
      state: entry.state || entry.stateName || "",
      party: entry.party || entry.affiliation || "Unknown",
      office,
      slug: entry.slug || "",
      photo: entry.photo || "/assets/placeholder.png",
      ballotpediaLink: entry.ballotpediaLink || "",
      termStart: entry.termStart || "",
      termEnd: entry.termEnd || "",
      contact: {
        email: entry.contact?.email || "",
        phone: entry.contact?.phone || "",
        website: entry.contact?.website || ""
      },
      bio: entry.bio || "",
      education: entry.education || "",
      endorsements: entry.endorsements || "",
      platform: entry.platform || "",
      platformFollowThrough: entry.platformFollowThrough || {},
      proposals: entry.proposals || "",
      engagement: {
        executiveOrders2025: entry.engagement?.executiveOrders2025 ?? undefined,
        socialMediaSurge: entry.engagement?.socialMediaSurge ?? undefined,
        earnedMediaCoverage: entry.engagement?.earnedMediaCoverage ?? undefined,
        sources: Array.isArray(entry.engagement?.sources) ? entry.engagement.sources : []
      },
      billsSigned: Array.isArray(entry.billsSigned) ? entry.billsSigned : [],
      vetoes: entry.vetoes || "",
      salary: entry.salary || "",
      predecessor: entry.predecessor || "",
      pollingScoreRaw: typeof raw === "string" ? raw : (raw ?? ""),
      pollingScore: numeric,
      pollingSource: entry.pollingSource || "",
      pollingDate: entry.pollingDate || "",
      rank: entry.rank || "",
      electionYear: entry.electionYear || "",
      rankingNote: entry.rankingNote || ""
    };
  }

  // Fetch JSONs from /public (served at root)
  Promise.all([
    fetch("/governors.json").then(r => r.json()).catch(() => []),
    fetch("/ltgovernors.json").then(r => r.json()).catch(() => []),
    fetch("/senators.json").then(r => r.json()).catch(() => []),
    fetch("/housereps.json").then(r => r.json()).catch(() => [])
  ]).then(([govs, ltgovs, sens, reps]) => {
    const govNorm = (Array.isArray(govs) ? govs : []).map(g => normalize(g, "Governor"));
    const ltgNorm = (Array.isArray(ltgovs) ? ltgovors : []).map(l => normalize(l, "Lt. Governor"));
    const senNorm = (Array.isArray(sens) ? sens : []).map(s => normalize(s, "Senator"));
    const repNorm = (Array.isArray(reps) ? reps : []).map(h => normalize(h, "House Representative"));

    allOfficials = [...govNorm, ...ltgNorm, ...senNorm, ...repNorm];

    rankingsData.governors = govNorm;
    rankingsData.ltgovernors = ltgNorm;
    rankingsData.senators = senNorm;
    rankingsData.housereps = repNorm;

    // Initialize rankings after data load
    if (rankingCategory) renderRankings(rankingCategory.value || "governors", false);
  });

  // Dropdown handler
  if (dropdown) {
    dropdown.addEventListener("change", () => {
      const state = dropdown.value;
      renderOfficials(state);
      renderCalendar(state);
      renderRegistration(state);
    });
  }

  // Officials renderer
  function renderOfficials(state) {
    if (!officialsContainer) return;
    officialsContainer.innerHTML = "";
    if (!state) return;

    const filtered = allOfficials.filter(o => o.state === state);
    const hierarchy = ["Governor","Lt. Governor","Senator","House Representative"];
    filtered.sort((a, b) => hierarchy.indexOf(a.office) - hierarchy.indexOf(b.office));

    filtered.forEach(o => {
      const card = document.createElement("div");
      card.className = `card ${getPartyClass(o.party)}`;
      card.innerHTML = `
        <img src="${o.photo}" alt="${o.name}" class="official-photo"/>
        <div class="card-body">
          <strong>${o.name}</strong><br/>
          ${o.office} • ${o.party}<br/>
          ${o.termStart ? `Term: ${o.termStart} – ${o.termEnd || "Present"}` : ""}<br/>
          ${o.pollingScoreRaw ? `Approval: ${o.pollingScoreRaw}` : (o.pollingScore !== undefined ? `Approval: ${o.pollingScore}%` : "Approval: N/A")}
          ${o.contact.website ? `<br/><a href="${o.contact.website}" target="_blank" rel="noopener">Website</a>` : ""}
          ${o.ballotpediaLink ? ` • <a href="${o.ballotpediaLink}" target="_blank" rel="noopener">Ballotpedia</a>` : ""}
        </div>
      `;
      card.addEventListener("click", () => showModal(o));
      officialsContainer.appendChild(card);
    });
  }

  // Calendar (example only)
  function renderCalendar(state) {
    if (!calendarContainer) return;
    calendarContainer.innerHTML = "";
    if (state !== "Alabama") return;
    const card = document.createElement("div");
    card.className = "calendar-card";
    card.innerHTML = `
      <strong>Municipal Runoff</strong><br/>
      2025-10-15 — Election<br/>
      Runoff for local offices<br/>
      <a href="https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections" target="_blank" rel="noopener">Details</a>
    `;
    calendarContainer.appendChild(card);
  }

  // Registration (example only)
  function renderRegistration(state) {
    if (!registrationContainer) return;
    registrationContainer.innerHTML = "";
    if (state !== "Alabama") return;
    const card = document.createElement("div");
    card.className = "registration-card";
    card.innerHTML = `
      <strong>Alabama</strong><br/><br/>
      <a href="https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote" target="_blank" rel="noopener">Register to Vote</a><br/>
      <a href="https://myinfo.alabamavotes.gov/VoterView/RegistrantSearch.do" target="_blank" rel="noopener">Find Your Polling Place</a><br/>
      <a href="https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting" target="_blank" rel="noopener">Request Absentee Ballot</a><br/>
      <a href="https://www.sos.alabama.gov/alabama-votes" target="_blank" rel="noopener">Volunteer</a>
    `;
    registrationContainer.appendChild(card);
  }

  // Rankings handlers
  if (rankingCategory) {
    rankingCategory.addEventListener("change", () => renderRankings(rankingCategory.value, false));
  }
  if (expandRankings) {
    expandRankings.addEventListener("click", () => renderRankings(rankingCategory.value, true));
  }

  // Rankings renderer (top 10 + bottom 10 by numeric approval)
  function renderRankings(category, expandAll) {
    if (!rankingsContainer) return;
    rankingsContainer.innerHTML = "";

    let list = (rankingsData[category] || [])
      .filter(o => o.pollingScore !== undefined)
      .sort((a, b) => b.pollingScore - a.pollingScore);

    const displayList = expandAll ? list : [...list.slice(0, 10), ...list.slice(-10)];

    displayList.forEach(o => {
      const card = document.createElement("div");
      card.className = `ranking-card ${getPartyClass(o.party)}`;
      card.innerHTML = `
        <img src="${o.photo}" alt="${o.name}" class="official-photo"/>
        <div class="card-body">
          <strong>${o.name}</strong><br/>
          ${o.office} • ${o.state}<br/>
          Approval: ${o.pollingScoreRaw || (o.pollingScore !== undefined ? o.pollingScore + "%" : "N/A")}
          ${o.rank ? ` • Rank: ${o.rank}` : ""}
          ${o.pollingDate ? ` • ${o.pollingDate}` : ""}
          ${o.pollingSource ? ` • <a href="${o.pollingSource}" target="_blank" rel="noopener">Source</a>` : ""}
        </div>
      `;
      card.addEventListener("click", () => showModal(o));
      rankingsContainer.appendChild(card);
    });

    if (expandRankings) {
      expandRankings.classList.toggle("hidden", expandAll || list.length <= 20);
    }
  }

  // Party class mapping
  function getPartyClass(party) {
    if (!party) return "unknown";
    const p = String(party).toLowerCase();
    if (p.includes("dem")) return "democratic";
    if (p.includes("rep")) return "republican";
    if (p.includes("ind")) return "independent";
    return "unknown";
  }

  // Modal renderer (clean sections)
  function showModal(o) {
    if (!modal || !modalContent) return;

    const pf = o.platformFollowThrough || {};
    const engagementSources = (o.engagement?.sources || [])
      .map(src => `<li><a href="${src}" target="_blank" rel="noopener">${src}</a></li>`).join("");
    const bills = (o.billsSigned || [])
      .map(b => `<li><a href="${b.link}" target="_blank" rel="noopener">${b.title}</a></li>`).join("");

    modalContent.innerHTML = `
      <div class="modal-header">
        <img src="${o.photo}" alt="${o.name}" class="official-photo modal-photo"/>
        <div>
          <h2>${o.name}</h2>
          <p>${o.office} • ${o.party} • ${o.state}</p>
          ${o.termStart ? `<p>Term: ${o.termStart} – ${o.termEnd || "Present"}</p>` : ""}
          <p>Approval: ${o.pollingScoreRaw || (o.pollingScore !== undefined ? o.pollingScore + "%" : "N/A")}
            ${o.pollingSource ? ` • <a href="${o.pollingSource}" target="_blank" rel="noopener">Source</a>` : ""}
            ${o.pollingDate ? ` • ${o.pollingDate}` : ""}
            ${o.rank ? ` • Rank: ${o.rank}` : ""}
          </p>
          ${o.ballotpediaLink ? `<p><a href="${o.ballotpediaLink}" target="_blank" rel="noopener">Ballotpedia</a></p>` : ""}
        </div>
      </div>

      ${o.bio ? `<div class="modal-section"><h3>Biography</h3><p>${o.bio}</p></div>` : ""}
      ${o.education ? `<div class="modal-section"><h3>Education</h3><p>${o.education}</p></div>` : ""}
      ${o.endorsements ? `<div class="modal-section"><h3>Endorsements</h3><p>${o.endorsements}</p></div>` : ""}
      ${o.platform ? `<div class="modal-section"><h3>Platform</h3><p>${o.platform}</p></div>` : ""}

      ${
        Object.keys(pf).length
          ? `<div class="modal-section"><h3>Platform follow-through</h3>
               <ul>${Object.entries(pf).map(([k,v]) => `<li><strong>${k}:</strong> ${v}</li>`).join("")}</ul>
             </div>`
          : ""
      }

      ${o.proposals ? `<div class="modal-section"><h3>Proposals</h3><p>${o.proposals}</p></div>` : ""}

      ${
        (o.engagement?.executiveOrders2025 !== undefined ||
         o.engagement?.socialMediaSurge !== undefined ||
         o.engagement?.earnedMediaCoverage !== undefined ||
         (o.engagement?.sources || []).length)
          ? `<div class="modal-section"><h3>Engagement</h3>
               <ul>
                 ${o.engagement?.executiveOrders2025 !== undefined ? `<li><strong>Executive orders (2025):</strong> ${o.engagement.executiveOrders2025}</li>` : ""}
                 ${o.engagement?.socialMediaSurge !== undefined ? `<li><strong>Social media surge:</strong> ${o.engagement.socialMediaSurge ? "Yes" : "No"}</li>` : ""}
                 ${o.engagement?.earnedMediaCoverage !== undefined ? `<li><strong>Earned media coverage:</strong> ${o.engagement.earnedMediaCoverage ? "Yes" : "No"}</li>` : ""}
                 ${engagementSources ? `<li><strong>Sources:</strong><ul>${engagementSources}</ul></li>` : ""}
               </ul>
             </div>`
          : ""
      }

      ${bills ? `<div class="modal-section"><h3>Bills signed</h3><ul>${bills}</ul></div>` : ""}

      ${o.vetoes ? `<div class="modal-section"><h3>Vetoes</h3><p>${o.vetoes}</p></div>` : ""}

      ${o.salary ? `<div class="modal-section"><h3>Salary</h3><p>${o.salary}</p></div>` : ""}

      ${o.predecessor ? `<div class="modal-section"><h3>Predecessor</h3><p>${o.predecessor}</p></div>` : ""}

      ${o.electionYear ? `<div class="modal-section"><h3>Next election year</h3><p>${o.electionYear}</p></div>` : ""}

      ${o.rankingNote ? `<div class="modal-section"><h3>Ranking note</h3><p>${o.rankingNote}</p></div>` : ""}

      <div class="modal-section"><h3>Contact</h3>
        <p>
          ${o.contact.email ? `Email: <a href="mailto:${o.contact.email}">${o.contact.email}</a><br/>` : ""}
          ${o.contact.phone ? `Phone: ${o.contact.phone}<br/>` : ""}
          ${o.contact.website ? `Website: <a href="${o.contact.website}" target="_blank" rel="noopener">${o.contact.website}</a>` : ""}
        </p>
      </div>
    `;
    modal.classList.remove("hidden");
  }
});
