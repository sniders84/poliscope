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

// Party color class
function getPartyClass(party) {
  if (!party) return "unknown";
  const p = party.toLowerCase();
  if (p.includes("dem")) return "democratic";
  if (p.includes("rep")) return "republican";
  if (p.includes("ind")) return "independent";
  return "unknown";
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
