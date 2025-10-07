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

  const states = [/* full list omitted for brevity */];
  states.forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    dropdown.appendChild(option);
  });

  let allOfficials = [];
  let calendarData = [];
  let registrationData = [];
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
    fetch("housereps.json").then(res => res.json()),
    fetch("calendar.json").then(res => res.json()),
    fetch("registration.json").then(res => res.json())
  ]).then(([govs, ltgovs, sens, reps, cal, reg]) => {
    allOfficials = [...govs, ...ltgovs, ...sens, ...reps];
    calendarData = cal;
    registrationData = reg;
    rankingsData.governors = govs;
    rankingsData.ltgovernors = ltgovs;
    rankingsData.senators = sens;
    rankingsData.housereps = reps;
  });

  dropdown.addEventListener("change", () => {
    const selectedState = dropdown.value;
    renderOfficials(selectedState);
    renderCalendar(selectedState);
    renderRegistration(selectedState);
  });

  function renderOfficials(state) {
    container.innerHTML = "";
    const filtered = allOfficials.filter(o => o.state === state);
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
  }

