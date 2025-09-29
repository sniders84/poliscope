// =====================
// 🔹 Globals
// =====================
let allOfficials = []; // Load this with JSON files: governors.json, ltgovernors.json, senate.json, house.json
let matchupsData = []; // Load matchup info JSON
let selectedState = ""; // Tracks current selected state

// =====================
// 🔹 Tab Switching
// =====================
const tabButtons = document.querySelectorAll(".tab-button");
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const parent = btn.closest(".tab-buttons");
    parent.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    const tabName = btn.dataset.tab || btn.dataset.category;
    switchTab(btn.closest(".tab-container"), tabName);
  });
});

function switchTab(container, tabName) {
  const contents = container.querySelectorAll(".tab-content");
  contents.forEach(c => (c.style.display = "none"));

  const target = container.querySelector(`#${tabName}`);
  if (target) target.style.display = "block";

  if (tabName === "my-officials") populateOfficials();
  if (tabName === "rankings") populateRankings();
  if (tabName === "matchups") populateMatchups();
  if (tabName === "rookies") populateRookies();
  if (tabName === "calendar") populateCalendar();
  if (tabName === "registration") populateRegistration();
}

// =====================
// 🔹 Populate Officials
// =====================
const searchInput = document.getElementById("search");
searchInput.addEventListener("input", () => {
  selectedState = searchInput.value.trim();
  populateOfficials();
});

function populateOfficials() {
  const container = document.getElementById("officials-container");
  container.innerHTML = "";

  let filtered = allOfficials;
  if (selectedState) {
    filtered = allOfficials.filter(o => o.state.toLowerCase() === selectedState.toLowerCase());
  }

  // Sort by office: Senate -> House -> Governor -> Lt Governor
  const officeOrder = ["Senator", "Representative", "Governor", "Lt Governor"];
  filtered.sort((a, b) => officeOrder.indexOf(a.office) - officeOrder.indexOf(b.office));

  filtered.forEach(o => {
    const card = createOfficialCard(o);
    container.appendChild(card);
  });
}

// =====================
// 🔹 Populate Rankings
// =====================
function populateRankings() {
  const container = document.getElementById("rankings-container");
  container.innerHTML = "";

  const activeTab = document.querySelector("#rankings-tabs .tab-button.active");
  const category = activeTab.dataset.category;

  let filtered = allOfficials.filter(o => getCategory(o.office) === category);
  filtered.sort((a, b) => (b.pollingScore || 0) - (a.pollingScore || 0));

  filtered.forEach(o => {
    container.appendChild(createOfficialCard(o));
  });
}

// =====================
// 🔹 Populate Matchups
// =====================
const matchupSearch = document.getElementById("matchup-search");
matchupSearch.addEventListener("input", () => {
  selectedState = matchupSearch.value.trim();
  populateMatchups();
});

function populateMatchups() {
  const container = document.getElementById("matchups-container");
  container.innerHTML = "";

  let filtered = matchupsData;
  if (selectedState) {
    filtered = matchupsData.filter(m => m.state.toLowerCase() === selectedState.toLowerCase());
  }

  filtered.forEach(m => {
    container.appendChild(createOfficialCard(m));
  });
}

// =====================
// 🔹 Populate Rookies
// =====================
function populateRookies() {
  const container = document.getElementById("rookies-container");
  container.innerHTML = "";

  const activeTab = document.querySelector("#rookie-tabs .tab-button.active");
  const category = activeTab.dataset.category;

  const now = new Date();
  const filtered = allOfficials.filter(o => {
    return getCategory(o.office) === category &&
      new Date(o.termStart) >= new Date(now.getFullYear() - 6, now.getMonth(), now.getDate());
  });

  filtered.forEach(o => container.appendChild(createOfficialCard(o)));
}

// =====================
// 🔹 Populate Calendar
// =====================
function populateCalendar() {
  const container = document.getElementById("calendar-container");
  container.innerHTML = "";

  if (!selectedState) return;

  // Example placeholder, replace with real data
  container.innerHTML = `
    <h3>${selectedState} Calendar</h3>
    <ul>
      <li>Election Day: Nov 5, 2025</li>
      <li>Voter Registration Deadline: Oct 10, 2025</li>
      <li>Town Hall: Sep 15, 2025</li>
    </ul>
  `;
}

// =====================
// 🔹 Populate Registration
// =====================
function populateRegistration() {
  const container = document.getElementById("registration-container");
  container.innerHTML = "";

  if (!selectedState) return;

  // Example placeholder, replace with real data
  container.innerHTML = `
    <h3>${selectedState} Voter Registration</h3>
    <ul>
      <li>Register to vote: <a href="#">Click here</a></li>
      <li>Polling stations info</li>
      <li>Volunteer opportunities</li>
    </ul>
  `;
}

// =====================
// 🔹 Helper Functions
// =====================
function getCategory(office) {
  office = office.toLowerCase();
  if (office.includes("governor") && !office.includes("lt")) return "governor";
  if (office.includes("lt governor")) return "lt-governor";
  if (office.includes("senator")) return "senate";
  if (office.includes("representative") || office.includes("house")) return "house";
  return "";
}

function createOfficialCard(o) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${o.photo}" alt="${o.name}">
    <h3>${o.name}</h3>
    <p>${o.office} - ${o.state}</p>
    <p>${o.party}</p>
  `;

  card.addEventListener("click", () => openModal(o));
  return card;
}

// =====================
// 🔹 Modal Functions
// =====================
const modal = document.getElementById("modal");
const modalPhoto = document.getElementById("modal-photo");
const modalContent = document.getElementById("modal-content");
document.getElementById("modal-close").addEventListener("click", () => modal.style.display = "none");

function openModal(o) {
  modalPhoto.src = o.photo;
  modalContent.innerHTML = `
    <h2>${o.name}</h2>
    <p><strong>Office:</strong> ${o.office}</p>
    <p><strong>State:</strong> ${o.state}</p>
    <p><strong>Party:</strong> ${o.party}</p>
    <p><strong>Term:</strong> ${o.termStart} - ${o.termEnd}</p>
    <p><strong>Salary:</strong> ${o.salary}</p>
    <p><strong>Bio:</strong> ${o.bio}</p>
    <p><strong>Education:</strong> ${o.education}</p>
    <p><strong>Platform:</strong> ${o.platform}</p>
    <p><strong>Endorsements:</strong> ${o.endorsements}</p>
    <p><strong>Proposals:</strong> ${o.proposals}</p>
    <p><strong>Bills Signed:</strong></p>
    <ul>
      ${o.billsSigned?.map(b => `<li><a href="${b.link}" target="_blank">${b.title}</a></li>`).join("") || ""}
    </ul>
    <p><strong>Vetoes:</strong> ${o.vetoes || "None"}</p>
    <p><strong>Contact:</strong> Email: <a href="mailto:${o.contact.email}">${o.contact.email}</a>, Phone: ${o.contact.phone}, Website: <a href="${o.contact.website}" target="_blank">${o.contact.website}</a></p>
  `;
  modal.style.display = "flex";
}
