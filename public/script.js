document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const dropdown = document.getElementById("stateDropdown");
  const tabsNavButtons = document.querySelectorAll("#tabs button");
  const sections = {
    officials: document.getElementById("officialsTab"),
    calendar: document.getElementById("calendarTab"),
    registration: document.getElementById("registrationTab"),
    rankings: document.getElementById("rankingsTab")
  };
  const officialsContainer = document.getElementById("officialsContainer");
  const calendarContainer = document.getElementById("calendarContainer");
  const registrationContainer = document.getElementById("registrationContainer");
  const rankingsContainer = document.getElementById("rankingsContainer");
  const rankingCategory = document.getElementById("rankingCategory");
  const expandRankings = document.getElementById("expandRankings");

  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modalContent");
  const closeModal = document.getElementById("closeModal");

  // Modal always hidden at start
  modal.classList.add("hidden");
  closeModal.addEventListener("click", () => modal.classList.add("hidden"));

  // Tab navigation: buttons always visible; sections toggle
  tabsNavButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      Object.values(sections).forEach(sec => sec.classList.add("hidden"));
      document.getElementById(targetId).classList.remove("hidden");
    });
  });
  // Default to Officials visible
  Object.values(sections).forEach(sec => sec.classList.add("hidden"));
  sections.officials.classList.remove("hidden");

  // Jurisdictions list (56)
  const states = [
    "Alabama","Alaska","American Samoa","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Guam","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas",
    "Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
    "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York",
    "North Carolina","North Dakota","Northern Mariana Islands","Ohio","Oklahoma","Oregon","Pennsylvania",
    "Puerto Rico","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
    "Virgin Islands","Virginia","Washington","West Virginia","Wisconsin","Wyoming"
  ];
  for (const state of states) {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    dropdown.appendChild(opt);
  }

  // Data holders
  let allOfficials = [];
  const rankingsData = { governors: [], ltgovernors: [], senators: [], housereps: [] };

  // Load officials data from JSON files (must be in same directory)
  Promise.all([
    fetch("governors.json").then(r => r.json()),
    fetch("ltgovernors.json").then(r => r.json()),
    fetch("senators.json").then(r => r.json()),
    fetch("housereps.json").then(r => r.json())
  ]).then(([govs, ltgovs, sens, reps]) => {
    allOfficials = [...govs, ...ltgovs, ...sens, ...reps];
    rankingsData.governors = govs;
    rankingsData.ltgovernors = ltgovs;
    rankingsData.senators = sens;
    rankingsData.housereps = reps;
  }).catch(() => {
    // If JSON fails, keep UI responsive; user will see empty until fixed
    allOfficials = [];
  });

  // Dropdown change: render officials + calendar + registration for selected state
  dropdown.addEventListener("change", () => {
    const state = dropdown.value;
    renderOfficials(state);
    renderCalendar(state);
    renderRegistration(state);
  });

  // Officials rendering
  function renderOfficials(state) {
    officialsContainer.innerHTML = "";
    if (!state) return;

    const filtered = allOfficials.filter(o => o.state === state);
    const hierarchy = ["Governor", "Lt. Governor", "Senator", "House Representative"];
    filtered.sort((a, b) => hierarchy.indexOf(a.office) - hierarchy.indexOf(b.office));

    filtered.forEach(o => {
      const card = document.createElement("div");
      card.className = `card ${getPartyClass(o.party)}`;
      card.innerHTML = `
        <strong>${o.name}</strong><br/>
        ${o.office}<br/>
        ${o.party}<br/>
        Approval: ${o.pollingScore ?? "N/A"}
      `;
      card.addEventListener("click", () => showModal(o));
      officialsContainer.appendChild(card);
    });
  }

  // Calendar: hardcoded entries (no JSON) — expand state mappings as you verify
  function renderCalendar(state) {
    calendarContainer.innerHTML = "";
    sections.calendar.classList.add("hidden");

    const calendarEntries = {
      "Alabama": [
        {
          title: "Municipal Runoff",
          date: "2025-10-15",
          type: "Election",
          description: "Runoff for local offices",
          link: "https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections"
        }
      ]
    };

    const events = calendarEntries[state];
    if (!events || events.length === 0) return;

    sections.calendar.classList.remove("hidden");
    events.forEach(e => {
      const card = document.createElement("div");
      card.className = "calendar-card";
      card.innerHTML = `
        <strong>${e.title}</strong><br/>
        ${e.date} — ${e.type}<br/>
        ${e.description || ""}<br/>
        <a href="${e.link}" target="_blank">Details</a>
      `;
      calendarContainer.appendChild(card);
    });
  }

  // Registration: hardcoded entries (no JSON)
  function renderRegistration(state) {
    registrationContainer.innerHTML = "";
    sections.registration.classList.add("hidden");

    const registrationEntries = {
      "Alabama": {
        register: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
        polling: "https://myinfo.alabamavotes.gov/VoterView/RegistrantSearch.do",
        absentee: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
        volunteer: "https://www.sos.alabama.gov/alabama-votes"
      }
    };

    const entry = registrationEntries[state];
    if (!entry) return;

    sections.registration.classList.remove("hidden");
    const card = document.createElement("div");
    card.className = "registration-card";
    card.innerHTML = `
      <strong>${state}</strong><br/><br/>
      <a href="${entry.register}" target="_blank">Register to Vote</a><br/>
      <a href="${entry.polling}" target="_blank">Find Your Polling Place</a><br/>
      <a href="${entry.absentee}" target="_blank">Request Absentee Ballot</a><br/>
      <a href="${entry.volunteer}" target="_blank">Volunteer</a>
    `;
    registrationContainer.appendChild(card);
  }

  // Rankings
  rankingCategory.addEventListener("change", () => renderRankings(rankingCategory.value, false));
  expandRankings.addEventListener("click", () => renderRankings(rankingCategory.value, true));

  function renderRankings(category, expandAll) {
    rankingsContainer.innerHTML = "";
    sections.rankings.classList.remove("hidden");

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
        ${o.party}<br/>
        Approval: ${o.pollingScore ?? "N/A"}
      `;
      card.addEventListener("click", () => showModal(o));
      rankingsContainer.appendChild(card);
    });

    // Show expand button only if not expanded and list is long enough
    expandRankings.classList.toggle("hidden", expandAll || list.length <= 20);
  }

  // Helpers
  function getPartyClass(party) {
    if (!party) return "unknown";
    const p = String(party).toLowerCase();
    if (p.includes("dem")) return "democratic";
    if (p.includes("rep")) return "republican";
    if (p.includes("ind")) return "independent";
    return "unknown";
  }

  function showModal(o) {
    if (!o || !o.name) return;
    modalContent.innerHTML = `
      <h2>${o.name}</h2>
      <p><strong>Office:</strong> ${o.office}</p>
      <p><strong>Party:</strong> ${o.party}</p>
      <p><strong>State:</strong> ${o.state}</p>
      <p><strong>Approval:</strong> ${o.pollingScore ?? "N/A"}</p>
      <p><strong>Bio:</strong> ${o.bio || "—"}</p>
      <p><strong>Contact:</strong><br/>
        Email: ${o.contact?.email || "—"}<br/>
        Phone: ${o.contact?.phone || "—"}<br/>
        ${o.contact?.website ? `<a href="${o.contact.website}" target="_blank">Website</a>` : "—"}
      </p>
    `;
    modal.classList.remove("hidden");
  }
});
