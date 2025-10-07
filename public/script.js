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

  // Modal
  if (closeModal) closeModal.addEventListener("click", () => modal.classList.add("hidden"));

  // Tabs: always visible, sections toggle
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });

  // Default to Officials on load
  document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
  const officialsSection = document.getElementById("officialsTab");
  if (officialsSection) officialsSection.classList.remove("hidden");

  // States list (56 jurisdictions)
  const states = [
    "Alabama","Alaska","American Samoa","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
    "Florida","Georgia","Guam","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
    "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska",
    "Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
    "Northern Mariana Islands","Ohio","Oklahoma","Oregon","Pennsylvania","Puerto Rico","Rhode Island",
    "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virgin Islands","Virginia",
    "Washington","West Virginia","Wisconsin","Wyoming"
  ];
  if (dropdown) {
    states.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      dropdown.appendChild(opt);
    });
  }

  // Robust asset path resolver (tries multiple locations)
  async function fetchFirst(paths) {
    for (const p of paths) {
      try {
        const res = await fetch(p, { cache: "no-store" });
        if (res.ok) return await res.json();
      } catch (_) { /* try next */ }
    }
    return [];
  }

  // JSON paths (tries root, public/, assets/)
  const GOV_PATHS = ["/governors.json","governors.json","/public/governors.json","public/governors.json","/assets/governors.json","assets/governors.json"];
  const LTG_PATHS = ["/ltgovernors.json","ltgovernors.json","/public/ltgovernors.json","public/ltgovernors.json","/assets/ltgovernors.json","assets/ltgovernors.json"];
  const SEN_PATHS = ["/senators.json","senators.json","/public/senators.json","public/senators.json","/assets/senators.json","assets/senators.json"];
  const REP_PATHS = ["/housereps.json","housereps.json","/public/housereps.json","public/housereps.json","/assets/housereps.json","assets/housereps.json"];

  let allOfficials = [];
  const rankingsData = { governors: [], ltgovernors: [], senators: [], housereps: [] };

  // Load data with fallback
  (async () => {
    const [govs, ltgovs, sens, reps] = await Promise.all([
      fetchFirst(GOV_PATHS),
      fetchFirst(LTG_PATHS),
      fetchFirst(SEN_PATHS),
      fetchFirst(REP_PATHS)
    ]);

    rankingsData.governors = Array.isArray(govs) ? govs : [];
    rankingsData.ltgovernors = Array.isArray(ltgovs) ? ltgovs : [];
    rankingsData.senators = Array.isArray(sens) ? sens : [];
    rankingsData.housereps = Array.isArray(reps) ? reps : [];

    allOfficials = [
      ...rankingsData.governors,
      ...rankingsData.ltgovernors,
      ...rankingsData.senators,
      ...rankingsData.housereps
    ];

    // Guaranteed visible card if datasets resolve empty
    if (!allOfficials.length) {
      allOfficials = [{
        name: "Electorate Demo",
        office: "Governor",
        party: "Independent",
        state: "Alabama",
        pollingScore: 50
      }];
    }

    // Auto-select a state with data, fallback to Alabama
    const statesWithData = [...new Set(allOfficials.map(o => o.state))];
    const defaultState = statesWithData[0] || "Alabama";
    if (dropdown) {
      dropdown.value = defaultState;
      renderOfficials(defaultState);
      renderCalendar(defaultState);
      renderRegistration(defaultState);
    }

    // Initialize rankings with default category
    if (rankingCategory) renderRankings(rankingCategory.value || "governors", false);
  })();

  // Dropdown change handler
  if (dropdown) {
    dropdown.addEventListener("change", () => {
      const state = dropdown.value;
      renderOfficials(state);
      renderCalendar(state);
      renderRegistration(state);
    });
  }

  // Rendering functions
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
        <strong>${o.name}</strong><br/>
        ${o.office}<br/>
        ${o.party || "—"}<br/>
        Approval: ${o.pollingScore ?? "N/A"}
      `;
      card.addEventListener("click", () => showModal(o));
      officialsContainer.appendChild(card);
    });
  }

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
      <a href="https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections" target="_blank">Details</a>
    `;
    calendarContainer.appendChild(card);
  }

  function renderRegistration(state) {
    if (!registrationContainer) return;
    registrationContainer.innerHTML = "";
    if (state !== "Alabama") return;

    const card = document.createElement("div");
    card.className = "registration-card";
    card.innerHTML = `
      <strong>Alabama</strong><br/><br/>
      <a href="https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote" target="_blank">Register to Vote</a><br/>
      <a href="https://myinfo.alabamavotes.gov/VoterView/RegistrantSearch.do" target="_blank">Find Your Polling Place</a><br/>
      <a href="https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting" target="_blank">Request Absentee Ballot</a><br/>
      <a href="https://www.sos.alabama.gov/alabama-votes" target="_blank">Volunteer</a>
    `;
    registrationContainer.appendChild(card);
  }

  if (rankingCategory) {
    rankingCategory.addEventListener("change", () => renderRankings(rankingCategory.value, false));
  }
  if (expandRankings) {
    expandRankings.addEventListener("click", () => renderRankings(rankingCategory.value, true));
  }

  function renderRankings(category, expandAll) {
    if (!rankingsContainer) return;
    rankingsContainer.innerHTML = "";

    let list = (rankingsData[category] || []).filter(o => o.pollingScore !== undefined);
    list.sort((a, b) => {
      if (b.pollingScore !== a.pollingScore) return b.pollingScore - a.pollingScore;
      return (a.dkno || 0) - (b.dkno || 0);
    });

    const displayList = expandAll ? list : [...list.slice(0, 10), ...list.slice(-10)];
    displayList.forEach(o => {
      const card = document.createElement("div");
      card.className = `ranking-card ${getPartyClass(o.party)}`;
      card.innerHTML = `
        <strong>${o.name}</strong><br/>
        ${o.office}<br/>
        ${o.party || "—"}<br/>
        Approval: ${o.pollingScore ?? "N/A"}
      `;
      card.addEventListener("click", () => showModal(o));
      rankingsContainer.appendChild(card);
    });

    if (expandRankings) {
      expandRankings.classList.toggle("hidden", expandAll || list.length <= 20);
    }
  }

  function getPartyClass(party) {
    if (!party) return "unknown";
    const p = String(party).toLowerCase();
    if (p.includes("dem")) return "democratic";
    if (p.includes("rep")) return "republican";
    if (p.includes("ind")) return "independent";
    return "unknown";
  }

  function showModal(o) {
    if (!modal || !modalContent) return;
    modalContent.innerHTML = `
      <h2>${o.name}</h2>
      <p><strong>Office:</strong> ${o.office}</p>
      <p><strong>Party:</strong> ${o.party || "—"}</p>
      <p><strong>State:</strong> ${o.state}</p>
      <p><strong>Approval:</strong> ${o.pollingScore ?? "N/A"}</p>
      <p><strong>Contact:</strong><br/>
        Email: ${o.contact?.email || "—"}<br/>
        Phone: ${o.contact?.phone || "—"}<br/>
        ${o.contact?.website ? `<a href="${o.contact.website}" target="_blank">Website</a>` : "—"}
      </p>
    `;
    modal.classList.remove("hidden");
  }

  // Logo fallback: try multiple possible locations if the first fails
  const logoEl = document.querySelector('#appHeader img');
  const logoPaths = [
    "/assets/electorate-logo.png",
    "assets/electorate-logo.png",
    "/public/assets/electorate-logo.png",
    "public/assets/electorate-logo.png"
  ];
  let logoIndex = 0;
  if (logoEl) {
    logoEl.onerror = () => {
      logoIndex++;
      if (logoIndex < logoPaths.length) {
        logoEl.src = logoPaths[logoIndex];
      }
    };
    // Kick off with first path
    logoEl.src = logoPaths[0];
  }
});
```
