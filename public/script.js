// script.js

const cardsContainer = document.querySelector('.cards-container');
const stateFilter = document.getElementById('stateFilter');
const partyFilter = document.getElementById('partyFilter');
const officeFilter = document.getElementById('officeFilter');
const modal = document.getElementById('modal');
const modalClose = document.querySelector('.modal-close');

let allData = [];

// Fetch all JSON files and combine
Promise.all([
  fetch('Senate.json').then(res => res.json()),
  fetch('House.json').then(res => res.json()),
  fetch('Governors.json').then(res => res.json()),
  fetch('LtGovernors.json').then(res => res.json())
]).then(files => {
  allData = files.flat();
  populateFilters();
  displayCards(allData);
}).catch(err => console.error('Error loading JSON files:', err));

function populateFilters() {
  const states = [...new Set(allData.map(item => item.state))].sort();
  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    stateFilter.appendChild(option);
  });

  const parties = [...new Set(allData.map(item => item.party))].sort();
  parties.forEach(party => {
    const option = document.createElement('option');
    option.value = party;
    option.textContent = party;
    partyFilter.appendChild(option);
  });

  const offices = [...new Set(allData.map(item => item.office))].sort();
  offices.forEach(office => {
    const option = document.createElement('option');
    option.value = office;
    option.textContent = office;
    officeFilter.appendChild(option);
  });
}

function createCard(item) {
  const card = document.createElement('article');
  card.className = 'card';

  const img = document.createElement('img');
  img.src = item.photo || 'assets/default-photo.jpg';
  img.alt = item.name;
  card.appendChild(img);

  const content = document.createElement('div');
  content.className = 'card-content';

  const name = document.createElement('h3');
  name.textContent = item.name;
  content.appendChild(name);

  const office = document.createElement('p');
  office.textContent = item.office;
  content.appendChild(office);

  const state = document.createElement('p');
  state.textContent = item.state;
  content.appendChild(state);

  card.appendChild(content);

  card.addEventListener('click', () => openModal(item));

  return card;
}

function displayCards(data) {
  cardsContainer.innerHTML = '';
  data.forEach(item => {
    const card = createCard(item);
    cardsContainer.appendChild(card);
  });
}

function openModal(item) {
  modal.querySelector('.modal-title').textContent = item.name;
  modal.querySelector('.modal-photo').src = item.photo || 'assets/default-photo.jpg';
  modal.querySelector('.modal-body').textContent = item.platform || 'No platform info';

  const link = modal.querySelector('.modal-link');
  link.href = item.ballotpediaLink || '#';
  link.textContent = 'View on Ballotpedia';

  modal.style.display = 'block';
}

function closeModal() {
  modal.style.display = 'none';
}

modalClose.addEventListener('click', closeModal);
window.addEventListener('click', e => {
  if (e.target === modal) closeModal();
});

// Filter change events
[stateFilter, partyFilter, officeFilter].forEach(filter => {
  filter.addEventListener('change', applyFilters);
});

function applyFilters() {
  const stateValue = stateFilter.value;
  const partyValue = partyFilter.value;
  const officeValue = officeFilter.value;

  const filtered = allData.filter(item => {
    return (stateValue === '' || item.state === stateValue) &&
           (partyValue === '' || item.party === partyValue) &&
           (officeValue === '' || item.office === officeValue);
  });

  displayCards(filtered);
}
