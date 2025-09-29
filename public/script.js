// ===== Global Variables =====
const tabs = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");
const searchInput = document.getElementById("search");
const resultsList = document.getElementById("results");
const officialsContainer = document.getElementById("officials-cards");
const rankingsContainer = document.getElementById("rankings-cards");
const matchupContainer = document.getElementById("matchup-cards");
const matchupSearch = document.getElementById("matchup-search");
const rookiesContainer = document.getElementById("rookies-cards");
const modal = document.getElementById("modal");
const modalPhoto = document.getElementById("modal-photo");
const modalInfo = document.getElementById("modal-info");

let officialsData = [];
let matchupsData = []; // Add your matchups JSON if needed

// ===== Load JSON Data =====
async function loadJSON() {
  const files = ["Senate.json", "House.json", "Governors.json", "LtGovernors.json"];
  let allOfficials = [];

  for (let file of files) {
    const res = await fetch(file);
    if (!res.ok) {
      console.error(`Failed to load ${file}`);
      continue;
    }
    const data = await res.json();
    allOfficials = allOfficials.concat(data);
  }

  officialsData = allOfficials;
  displayOfficials(officialsData);
  populateRankings(officialsData);
  populateRookies(officialsData);
}

// ===== Tab Switching =====
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const tabName = tab.dataset.tab;
    tabContents.forEach(tc => tc.classList.remove("active"));
    document.getElementById(tabName).classList.add("active");

    if (tabName === "calendar") {
      populateCalendar();
    } else if (tabName === "registration") {
      populateRegistration();
    }
  });
});

// ===== Display Officials =====
function displayOfficials(data, stateFilter = "") {
  officialsContainer.innerHTML = "";
  let filtered = data;
  if (stateFilter) {
    filtered = data.filter(off => off.state.toLowerCase() === stateFilter.toLowerCase());
  }

  filtered.sort((a, b) => {
    const order = { "Senate": 1, "House": 2, "Governor": 3, "Lieutenant Governor": 4 };
    return order[a.office] - order[b.office];
  });

  filtered.forEach(off => {
    const card = createCard(off);
    officialsContainer.appendChild(card);
  });
}

// ===== Create Card =====
function createCard(off) {
  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
    <img src="${off.photo}" alt="${off.name}">
    <h3>${off.name}</h3>
    <p>${off.office}, ${off.state}</p>
    <p>${off.party}</p>
  `;
  card.addEventListener("click", () => showModal(off));
  return card;
}

// ===== Modal =====
function showModal(off) {
  modal.style.display = "flex";
  modalPhoto.src = off.photo;
  modalInfo.innerHTML = `
    <h2>${off.name}</h2>
    <p><strong>Office:</strong> ${off.office}</p>
    <p><strong>State:</strong> ${off.state}</p>
    <p><strong>Party:</strong> ${off.party}</p>
    <p><strong>Term Start:</strong> ${off.termStart}</p>
    <p><strong>Term End:</strong> ${off.termEnd}</p>
    <p><strong>Email:</strong> ${off.contact?.email || "N/A"}</p>
    <p><strong>Phone:</strong> ${off.contact?.phone || "N/A"}</p>
    <p><strong>Website:</strong> ${off.contact?.website ? `<a href="${off.contact.website}" target="_blank">${off.contact.website}</a>` : "N/A"}</p>
    <p><strong>Education:</strong> ${off.education || "N/A"}</p>
    <p><strong>Platform:</strong> ${off.platform || "N/A"}</p>
    <p><strong>Proposals:</strong> ${off.proposals || "N/A"}</p>
    <p><strong>Salary:</strong> ${off.salary || "N/A"}</p>
  `;
}

// Close modal on click outside
window.addEventListener("click", e => {
  if (e.target === modal) modal.style.display = "none";
});

// ===== Search Officials =====
searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim();
  displayOfficials(officialsData, query);
});

// ===== Rankings =====
function populateRankings(data) {
  rankingsContainer.innerHTML = "";
  const categories = ["Senate", "House", "Governor", "Lieutenant Governor"];
  categories.forEach(cat => {
    const catHeader = document.createElement("h2");
    catHeader.textContent = cat;
    rankingsContainer.appendChild(catHeader);

    const catOfficials = data.filter(off => off.office === cat);
    catOfficials.forEach(off => {
      const card = createCard(off);
      rankingsContainer.appendChild(card);
    });
  });
}

// ===== Rookies =====
function populateRookies(data) {
  rookiesContainer.innerHTML = "";
  const today = new Date();
  const categories = ["Senate", "House", "Governor", "Lieutenant Governor"];
  categories.forEach(cat => {
    const catHeader = document.createElement("h2");
    catHeader.textContent = cat;
    rookiesContainer.appendChild(catHeader);

    const catOfficials = data.filter(off => {
      if (off.office !== cat) return false;
      const startYear = new Date(off.termStart).getFullYear();
      if (cat === "Senate") return today.getFullYear() - startYear <= 6;
      if (cat === "House") return today.getFullYear() - startYear <= 2;
      return today.getFullYear() - startYear <= 4; // Governors and Lt Govs
    });

    catOfficials.forEach(off => {
      const card = createCard(off);
      rookiesContainer.appendChild(card);
    });
  });
}

// ===== Matchups =====
matchupSearch.addEventListener("input", () => {
  const query = matchupSearch.value.trim().toLowerCase();
  matchupContainer.innerHTML = "";
  const filtered = matchupsData.filter(m => m.state.toLowerCase() === query);
  filtered.forEach(match => {
    const card = createCard(match);
    matchupContainer.appendChild(card);
  });
});

// ===== Calendar Placeholder =====
function populateCalendar() {
  const calendarDiv = document.getElementById("calendar-content");
  calendarDiv.innerHTML = `<p>Calendar will sync with selected state officials soon.</p>`;
}

// ===== Registration Placeholder =====
function populateRegistration() {
  const regDiv = document.getElementById("registration-content");
  regDiv.innerHTML = `<p>Registration info will sync with selected state officials soon.</p>`;
}

// ===== Initialize App =====
loadJSON();
