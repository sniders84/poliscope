document.addEventListener("DOMContentLoaded", () => {
  const dropdown = document.getElementById("stateDropdown");
  const container = document.getElementById("officialsContainer");
  const modal = document.getElementById("modal");
  const modalContent = document.getElementById("modalContent");
  const closeModal = document.getElementById("closeModal");

  const calendarTab = document.getElementById("calendarTab");
  const calendarContainer = document.getElementById("calendarContainer");

  const registrationTab = document.getElementById("registrationTab");
  const registrationContainer = document.getElementById("registrationContainer");

  const rankingsTab = document.getElementById("rankingsTab");
  const rankingsContainer = document.getElementById("rankingsContainer");
  const rankingCategory = document.getElementById("rankingCategory");
  const expandRankings = document.getElementById("expandRankings");

  modal.classList.add("hidden");
  closeModal.addEventListener("click", () => {
    modal.classList.add("hidden");
  });

  const states = [
    "Alabama", "Alaska", "American Samoa", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "Florida", "Georgia", "Guam", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas",
    "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi",
    "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Northern Mariana Islands", "Ohio", "Oklahoma", "Oregon", "Pennsylvania",
    "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
    "Virgin Islands", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
  ];

  states.forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    dropdown.appendChild(option);
  });

  let allOfficials = [];
  let rankingsData = {
    governors: [],
    ltgovernors: [],
    senators: [],
    housereps: []
  };

  Promise.all([
    fetch("governors.json").then(res => res.json()),
    fetch("ltgovernors.json").then(res => res.json()),
    fetch("senators.json").then(res => res.json()),
    fetch("housereps.json").then(res => res.json())
  ]).then(([govs, ltgovs, sens, reps]) => {
    allOfficials = [...govs, ...ltgovs, ...sens, ...reps];
    rankingsData.governors = govs;
    rankingsData.ltgovernors = ltgovs;
    rankingsData.senators = sens;
    rankingsData.housereps = reps;
  });

  dropdown.addEventListener("change", () => {
    const selectedState = dropdown.value;

    // Officials tab
    container.innerHTML = "";
    const filtered = allOfficials.filter(o => o.state === selectedState);

    const hierarchy = ["Governor", "Lt. Governor", "Senator", "House Representative"];
    filtered.sort((a, b) => {
      return hierarchy.indexOf(a.office) - hierarchy.indexOf(b.office);
    });

    filtered.forEach(o => {
      const card = document.createElement("div");
      card.className = `card ${getPartyClass(o.party)}`;
      card.innerHTML = `
        <strong>${o.name}</strong><br/>
        ${o.office}<br/>
        ${o.party}<br/>
        Approval: ${o.pollingScore || "N/A"}
      `;
      card.addEventListener("click", () => showModal(o));
      container.appendChild(card);
    });

    renderCalendar(selectedState);
    renderRegistration(selectedState);
  });

  function renderCalendar(state) {
    calendarContainer.innerHTML = "";
    calendarTab.classList.add("hidden");

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
      // Add more states here as needed
    };

    const events = calendarEntries[state];
    if (!events || events.length === 0) return;

    calendarTab.classList.remove("hidden");
    events.forEach(e => {
      const card = document.createElement("div");
      card.className = "calendar-card";
      card.innerHTML = `
        <strong>${e.title}</strong><br/>
        ${e.date} – ${e.type}<br/>
        ${e.description || ""}<br/>
        <a href="${e.link}" target="_blank">Details</a>
      `;
      calendarContainer.appendChild(card);
    });
  }

  function renderRegistration(state) {
    registrationContainer.innerHTML = "";
    registrationTab.classList.add("hidden");

    const registrationEntries = {
      "Alabama": {
        register: "https://www.sos.alabama.gov/alabama-votes/voter/register-to-vote",
        polling: "https://myinfo.alabamavotes.gov/VoterView/RegistrantSearch.do",
        absentee: "https://www.sos.alabama.gov/alabama-votes/voter/absentee-voting",
        volunteer: "https://www.sos.alabama.gov/alabama-votes"
      }
      // Add more states here as needed
    };

    const entry = registrationEntries[state];
    if (!entry || !entry.register || !entry.polling || !entry.absentee || !entry.volunteer) return;

    registrationTab.classList.remove("hidden");
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

  rankingCategory.addEventListener("change", () => {
    renderRankings(rankingCategory.value, false);
  });

  expandRankings.addEventListener("click", () => {
    renderRankings(rankingCategory.value, true);
  });

  function renderRankings(category, expandAll) {
    rankingsContainer.innerHTML = "";
    rankingsTab.classList.remove("hidden");
    let list = rankingsData[category].filter(o => o.pollingScore !== undefined);
    list.sort((a, b) => {
      if (b.pollingScore !== a.pollingScore) {
        return b.pollingScore - a.pollingScore;
      }
      return (a.dkno || 0) - (b.dkno || 0);
    });
    let displayList = expandAll ? list : [...list.slice(0, 10), ...list.slice(-10)];
    displayList.forEach(o => {
      const card = document.createElement("div");
      card.className = `ranking-card ${getPartyClass(o.party)}`;
      card.innerHTML = `
        <strong>${o.name}</strong><br/>
        ${o.office}<br/>
        ${o.party}<br/>
        Approval: ${o.pollingScore || "N/A"}
      `;
      card.addEventListener("click", () => showModal(o));
      rankingsContainer.appendChild(card);
    });
    expandRankings.classList.toggle("hidden", expandAll);
  }

  function getPartyClass(party) {
    if (!party) return "unknown";
    const p = party.toLowerCase();
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
      <p><strong>Approval:</strong> ${o.pollingScore || "N/A"}</p>
      <p><strong>Bio:</strong> ${o.bio || "—"}</p>
      <p><strong>Contact:</strong><br/>
