// ==========================
// Global Data
// ==========================
let officialsData = { governors: [], ltGovernors: [], senate: [], house: [] };
let currentState = "";

// ==========================
// Load Data
// ==========================
async function loadData() {
  try {
    const [govRes, ltGovRes, senateRes, houseRes] = await Promise.all([
      fetch('public/Governors.json'),
      fetch('public/LtGovernors.json'),
      fetch('public/Senate.json'),
      fetch('public/House.json')
    ]);

    officialsData.governors = await govRes.json();
    officialsData.ltGovernors = await ltGovRes.json();
    officialsData.senate = await senateRes.json();
    officialsData.house = await houseRes.json();

    populateStateSelectors();
    populateAllOfficials();
  } catch (err) {
    console.error("Error loading JSON data:", err);
  }
}

// ==========================
// Populate State Selectors
// ==========================
function populateStateSelectors() {
  const states = [...new Set([
    ...officialsData.governors.map(o => o.state),
    ...officialsData.ltGovernors.map(o => o.state),
    ...officialsData.senate.map(o => o.state),
    ...officialsData.house.map(o => o.state)
  ])].sort();

  ['stateSelect','matchupStateSelect'].forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">All States</option>';
    states.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      select.appendChild(option);
    });
    select.addEventListener('change', e => {
      currentState = e.target.value;
      if(id === 'stateSelect') populateAllOfficials();
      else populateMatchups();
    });
  });
}

// ==========================
// Populate Officials Cards
// ==========================
function populateAllOfficials() {
  const container = document.getElementById('officialsContainer');
  container.innerHTML = '';

  const allOfficials = [
    ...officialsData.senate,
    ...officialsData.house,
    ...officialsData.governors,
    ...officialsData.ltGovernors
  ];

  const filtered = currentState ? allOfficials.filter(o => o.state === currentState) : allOfficials;

  filtered.forEach(o => container.appendChild(createCard(o)));
}

// ==========================
// Populate Matchups Cards
// ==========================
function populateMatchups() {
  const container = document.getElementById('matchupsContainer');
  container.innerHTML = '';
  // TODO: Replace with your matchups data logic
}

// ==========================
// Create Card
// ==========================
function createCard(official) {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img src="${official.photo}" alt="${official.name}">
    <h3>${official.name}</h3>
    <p>${official.office} - ${official.state}</p>
    <p>${official.party}</p>
  `;
  card.addEventListener('click', () => showModal(official));
  return card;
}

// ==========================
// Show Modal
// ==========================
function showModal(official) {
  document.getElementById('modalPhoto').src = official.photo;
  const modalContent = document.getElementById('modalContent');
  modalContent.innerHTML = `
    <h2>${official.name}</h2>
    <p><strong>Office:</strong> ${official.office}</p>
    <p><strong>Party:</strong> ${official.party}</p>
    <p><strong>State:</strong> ${official.state}</p>
    <p><strong>Term:</strong> ${official.termStart} - ${official.termEnd}</p>
    <p><strong>Bio:</strong> ${official.bio || 'No bio available'}</p>
  `;
  document.getElementById('modal').style.display = 'flex';
}

// Close modal on click outside
document.getElementById('modal').addEventListener('click', (e) => {
  if(e.target.id === 'modal') document.getElementById('modal').style.display = 'none';
});

// ==========================
// Tab Switching
// ==========================
document.querySelectorAll('.tab-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    button.classList.add('active');
    document.getElementById(button.dataset.tab).style.display = 'block';
  });
});

// ==========================
// Search Functionality
// ==========================
document.getElementById('search').addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const container = document.getElementById('officialsContainer');
  container.childNodes.forEach(card => {
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? 'block' : 'none';
  });
});

// ==========================
// Init
// ==========================
window.onload = loadData;
