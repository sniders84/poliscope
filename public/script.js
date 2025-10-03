// script.js

// Global variables
let allMembers = [];
let filteredMembers = [];
const modal = document.getElementById('modal');
const cardsContainer = document.getElementById('cards-container');
const stateFilter = document.getElementById('state-filter');
const partyFilter = document.getElementById('party-filter');

// Fetch data from JSON files
Promise.all([
  fetch('Senate.json').then(res => res.json()),
  fetch('House.json').then(res => res.json()),
  fetch('Governors.json').then(res => res.json()),
  fetch('LtGovernors.json').then(res => res.json())
]).then(([senate, house, governors, ltGovernors]) => {
  allMembers = [...senate, ...house, ...governors, ...ltGovernors];
  filteredMembers = allMembers;
  populateStateFilter();
  displayCards(filteredMembers);
}).catch(err => console.error('Error loading JSON files:', err));

// Populate state filter dropdown
function populateStateFilter() {
  const states = [...new Set(allMembers.map(member => member.state))].sort();
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateFilter.appendChild(option);
  });
}
// Display member cards
function displayCards(members) {
  cardsContainer.innerHTML = '';
  members.forEach(member => {
    const card = createCard(member);
    cardsContainer.appendChild(card);
  });
}

// Create a single card element
function createCard(member) {
  const card = document.createElement('article');
  card.className = 'card';

  const img = document.createElement('img');
  img.src = member.photo || 'assets/default-photo.png';
  img.alt = member.name;

  const name = document.createElement('h3');
  name.textContent = member.name;

  const office = document.createElement('p');
  office.textContent = member.office;

  const state = document.createElement('p');
  state.textContent = member.state;

  card.appendChild(img);
  card.appendChild(name);
  card.appendChild(office);
  card.appendChild(state);

  // Click event to open modal
  card.addEventListener('click', () => openModal(member));

  return card;
}

// Open modal with member info
function openModal(member) {
  modal.querySelector('.modal-title').textContent = member.name;
  modal.querySelector('.modal-photo').src = member.photo || 'assets/default-photo.png';
  modal.querySelector('.modal-body').textContent = member.platform || 'No platform info';
  modal.style.display = 'block';
}

// Close modal
modal.querySelector('.modal-close').addEventListener('click', () => {
  modal.style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});
// Filters and search
const officeFilter = document.getElementById('officeFilter');
const stateFilter = document.getElementById('stateFilter');
const partyFilter = document.getElementById('partyFilter');
const searchInput = document.getElementById('searchInput');

function applyFilters() {
  let filtered = allMembers;

  const officeVal = officeFilter.value;
  const stateVal = stateFilter.value;
  const partyVal = partyFilter.value;
  const searchVal = searchInput.value.toLowerCase();

  if (officeVal) filtered = filtered.filter(m => m.office === officeVal);
  if (stateVal) filtered = filtered.filter(m => m.state === stateVal);
  if (partyVal) filtered = filtered.filter(m => m.party === partyVal);
  if (searchVal) filtered = filtered.filter(m => m.name.toLowerCase().includes(searchVal));

  displayCards(filtered);
}

// Event listeners for filters/search
officeFilter.addEventListener('change', applyFilters);
stateFilter.addEventListener('change', applyFilters);
partyFilter.addEventListener('change', applyFilters);
searchInput.addEventListener('input', applyFilters);
let allMembers = [];

// Fetch all JSON files and combine
Promise.all([
  fetch('Senate.json').then(res => res.json()),
  fetch('House.json').then(res => res.json()),
  fetch('Governors.json').then(res => res.json()),
  fetch('LtGovernors.json').then(res => res.json())
])
.then(dataArrays => {
  allMembers = dataArrays.flat(); // combine all arrays
  populateFilters(allMembers);    // populate dropdown options
  displayCards(allMembers);       // display all cards initially
})
.catch(err => console.error('Error loading data:', err));

// Close modal functionality
const modal = document.getElementById('modal');
modal.querySelector('.close').addEventListener('click', () => {
  modal.style.display = 'none';
});
window.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});
