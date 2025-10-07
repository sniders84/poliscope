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
  closeModal.addEventListener("click", () => modal.classList.add("hidden"));

  // Tab switching
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#content section").forEach(sec => sec.classList.add("hidden"));
      document.getElementById(btn.dataset.tab).classList.remove("hidden");
    });
  });

  const states = ["Alabama","Alaska","American Samoa","Arizona","Arkansas","California","Colorado","Connecticut",
    "Delaware","Florida","Georgia","Guam","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
    "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
    "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Northern Mariana Islands",
    "Ohio","Oklahoma","Oregon","Pennsylvania","Puerto Rico","Rhode Island","South Carolina","South Dakota","Tennessee",
    "Texas","Utah","Vermont","Virgin Islands","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];

  states.forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    dropdown.appendChild(option);
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
    const selectedState = dropdown.value;
    container.innerHTML = "";
    const filtered = allOfficials.filter(o => o.state === selectedState);
    const hierarchy = ["Governor","Lt. Governor","Senator","House Representative"];
    filtered.sort((a,b) => hierarchy.indexOf(a.office) - hierarchy.indexOf(b.office));
    filtered.forEach(o => {
      const card = document.createElement("div");
      card.className = `card ${getPartyClass(o.party)}`;
      card.innerHTML = `<strong>${o.name}</strong><br/>${o.office}<br/>${o.party}<br/>Approval: ${o.pollingScore||"N/A"}`;
      card.addEventListener("click", () => showModal(o));
      container.appendChild(card);
    });
    renderCalendar(selectedState);
    renderRegistration(selectedState);
  });

  function renderCalendar(state) {
    calendarContainer.innerHTML = "";
    const entries = {
      "Alabama":[{title:"Municipal Runoff",date:"2025-10-15",type:"Election",
        description:"Runoff for local offices",
        link:"https://www.sos.alabama.gov/alabama-votes/voter/upcoming-elections"}]
    };
    const events = entries[state];
    if(!events) return;
    events.forEach(e=>{
      const card=document.createElement("div");
      card.class
