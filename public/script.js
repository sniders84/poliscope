document.addEventListener("DOMContentLoaded", () => {
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

  closeModal.addEventListener("click", () => modal.classList.add("hidden"));

  // Tabs
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });

  // Default to Officials
  document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById("officialsTab").classList.remove("hidden");

  // States
  const states = ["Alabama","Alaska","American Samoa","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Guam","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
    "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Northern Mariana Islands",
    "Ohio","Oklahoma","Oregon","Pennsylvania","Puerto Rico","Rhode Island","South Carolina","South Dakota","Tennessee",
    "Texas","Utah","Vermont","Virgin Islands","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
  states.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    dropdown.appendChild(opt);
  });

  let allOfficials = [];
  let rankingsData = { governors: [], ltgovernors: [], senators: [], housereps: [] };

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
  });

  dropdown.addEventListener("change", () => {
    const state = dropdown.value;
    renderOfficials(state);
    renderCalendar(state);
    renderRegistration(state);
  });

  function renderOfficials(state) {
    officialsContainer.innerHTML = "";
    if (!state) return;
    const filtered = allOfficials.filter(o => o.state === state);
    const hierarchy = ["Governor","Lt. Governor","Sen
