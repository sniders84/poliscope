const dropdown = document.getElementById("stateDropdown");
const container = document.getElementById("officialsContainer");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");
const closeModal = document.getElementById("closeModal");

// Load state/territory list
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

// Load all officials
let allOfficials = [];

Promise.all([
  fetch("governors.json").then(res => res.json()),
  fetch("ltgovernors.json").then(res => res.json()),
  fetch("senators.json").then(res => res.json()),
  fetch("housereps.json").then(res => res.json())
]).then(([governors, ltgovernors, senators, housereps]) => {
  allOfficials = [...governors, ...ltgovernors, ...senators, ...housereps];
});

// Render officials for selected state
dropdown.addEventListener("change", () => {
  const selectedState = dropdown.value;
  container.innerHTML = "";

  const filtered = allOfficials.filter(o => o.state === selectedState);

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
});
const calendarTab = document.getElementById("calendarTab");
const calendarContainer = document.getElementById("calendarContainer");
let calendarData = [];

// Load calendar.json
fetch("calendar.json")
  .then(res => res.json())
  .then(data => {
    calendarData = data;
  });

// Sync calendar to selected state
dropdown.addEventListener("change", () => {
  const selectedState = dropdown.value;

  // Officials rendering already handled above
  renderCalendar(selectedState);
});

function renderCalendar(state) {
  calendarContainer.innerHTML = "";
  calendarTab.classList.remove("hidden");

  const filteredEvents = calendarData.filter(e => e.state === state);

  if (filteredEvents.length === 0) {
    calendarContainer.innerHTML = `<p>No events found for ${state}.</p>`;
    return;
  }

  filteredEvents.forEach(e => {
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
// Party color class
function getPartyClass(party) {
  if (!party) return "unknown";
  const p = party.toLowerCase();
  if (p.includes("dem")) return "democratic";
  if (p.includes("rep")) return "republican";
  if (p.includes("ind")) return "independent";
  return "unknown";
}
const registrationTab = document.getElementById("registrationTab");
const registrationContainer = document.getElementById("registrationContainer");
let registrationData = [];

// Load registration.json
fetch("registration.json")
  .then(res => res.json())
  .then(data => {
    registrationData = data;
  });

// Sync registration to selected state
dropdown.addEventListener("change", () => {
  const selectedState = dropdown.value;

  // Officials and calendar already handled
  renderRegistration(selectedState);
});

function renderRegistration(state) {
  registrationContainer.innerHTML = "";
  registrationTab.classList.remove("hidden");

  const entry = registrationData.find(r => r.state === state);

  if (!entry) {
    registrationContainer.innerHTML = `<p>No registration info found for ${state}.</p>`;
    return;
  }

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
// Modal logic
function showModal(o) {
  modalContent.innerHTML = `
    <h2>${o.name}</h2>
    <p><strong>Office:</strong> ${o.office}</p>
    <p><strong>Party:</strong> ${o.party}</p>
    <p><strong>State:</strong> ${o.state}</p>
    <p><strong>Approval:</strong> ${o.pollingScore || "N/A"}</p>
    <p><strong>Bio:</strong> ${o.bio || "—"}</p>
    <p><strong>Contact:</strong><br/>
      Email: ${o.contact?.email || "—"}<br/>
      Phone: ${o.contact?.phone || "—"}<br/>
      <a href="${o.contact?.website}" target="_blank">Website</a>
    </p>
  `;
  modal.classList.remove("hidden");
}

closeModal.addEventListener("click", () => {
  modal.classList.add("hidden");
});
