// ====================
// Global Variables
// ====================
let officialsData = {
  governors: [],
  ltGovernors: [],
  senate: [],
  house: []
};

let currentState = "";

// ====================
// Fetch JSON Data
// ====================
async function loadOfficials() {
  try {
    const [govRes, ltGovRes, senRes, houseRes] = await Promise.all([
      fetch("/Governors.json"),
      fetch("/LtGovernors.json"),
      fetch("/Senate.json"),
      fetch("/House.json")
    ]);

    officialsData.governors = await govRes.json();
    officialsData.ltGovernors = await ltGovRes.json();
    officialsData.senate = await senRes.json();
    officialsData.house = await houseRes.json();
  } catch (err) {
    console.error("Error loading JSON data:", err);
  }
}

// ====================
// Utility Functions
// ====================
function slugify(name) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function createCard(official) {
  const card = document.createElement("div");
  card.classList.add("card");
  card.innerHTML = `
    <img src="${official.photo}" alt="${official.name}">
    <h3>${official.name}</h3>
    <p>${official.office} - ${official.state}</p>
    <p>${official.party}</p>
  `;
  card.addEventListener("click", () => openModal(official));
  return card;
}

// ====================
// Modal Functions
// ====================
function openModal(official) {
  const modal = document.getElementById("modal");
  const modalContent = modal.querySelector(".modal-content");
  modalContent.innerHTML = `
    <div class="modal-container">
      <div class="modal-left">
        <img src="${official.photo}" alt="${official.name}">
      </div>
      <div class="modal-right">
        <h2>${official.name}</h2>
        <p><strong>Office:</strong> ${official.office}</p>
        <p><strong>State:</strong> ${official.state}</p>
        <p><strong>Party:</strong> ${official.party}</p>
        <p><strong>Term Start:</strong> ${official.termStart}</p>
        <p><strong>Term End:</strong> ${official.termEnd}</p>
        <p><strong>Contact:</strong> ${official.contact?.phone || "N/A"}, ${official.contact?.email || "N/A"}</p>
        <p><strong>Website:</strong> <a href="${official.contact?.website || "#"}" target="_blank">${official.contact?.website || "N/A"}</a></p>
        <p><strong>Bio:</strong> ${official.bio || "N/A"}</p>
        <p><strong>Education:</strong> ${official.education || "N/A"}</p>
        <p><strong>Endorsements:</strong> ${official.endorsements || "N/A"}</p>
        <p><strong>Platform:</strong> ${official.platform || "N/A"}</p>
        <p><strong>Proposals:</strong> ${official.proposals || "N/A"}</p>
        <p><strong>Engagement:</strong> ${official.engagement || "N/A"}</p>
        <p><strong>Salary:</strong> ${official.salary || "N/A"}</p>
        <p><strong>Predecessor:</strong> ${official.predecessor || "N/A"}</p>
        <p><strong>Polling Score:</strong> ${official.pollingScore || "N/A"}</p>
        <p><strong>Election Year:</strong> ${official.electionYear || "N/A"}</p>
      </div>
    </div>
  `;
  modal.style.display = "flex";
}

function closeModal() {
  document.getElementById("modal").style.display = "none";
}

// ====================
// Populate Cards by State
// ====================
function populateOfficials(state) {
  const container = document.getElementById("cards");
  container.innerHTML = "";
  currentState = state;

  const combined = [
    ...officialsData.senate.filter(o => o.state === state),
    ...officialsData.house.filter(o => o.state === state),
    ...officialsData.governors.filter(o => o.state === state),
    ...officialsData.ltGovernors.filter(o => o.state === state)
  ];

  combined.forEach(official => {
    container.appendChild(createCard(official));
  });
}

// ====================
// Tab Functions
// ====================
function setupTabs() {
  const tabButtons = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabContents.forEach(c => c.style.display = "none");

      btn.classList.add("active");
      const target = document.getElementById(btn.dataset.target);
      if (target) target.style.display = "block";
    });
  });

  // Activate first tab by default
  if (tabButtons.length > 0) tabButtons[0].click();
}

// ====================
// Search Function
// ====================
function setupSearch() {
  const searchInput = document.getElementById("search");
  searchInput.addEventListener("input", () => {
    const term = searchInput.value.toLowerCase();
    const container = document.getElementById("cards");
    container.innerHTML = "";

    const combined = [
      ...officialsData.senate,
      ...officialsData.house,
      ...officialsData.governors,
      ...officialsData.ltGovernors
    ].filter(o => o.name.toLowerCase().includes(term) || o.state.toLowerCase().includes(term));

    combined.forEach(official => {
      container.appendChild(createCard(official));
    });
  });
}

// ====================
// Init Function
// ====================
async function init() {
  await loadOfficials();
  setupTabs();
  setupSearch();
  document.getElementById("stateSelect").addEventListener("change", (e) => populateOfficials(e.target.value));

  // Close modal when clicking outside
  document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
}

window.addEventListener("DOMContentLoaded", init);
