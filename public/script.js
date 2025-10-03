// script.js

// Fetch and combine all JSON data
const files = ['Senate.json', 'House.json', 'Governors.json', 'LtGovernors.json'];
let allData = [];

Promise.all(files.map(file => fetch(file).then(res => res.json())))
  .then(dataArrays => {
    allData = dataArrays.flat();
    populateOfficials(allData);
  })
  .catch(err => console.error('Error loading JSON files:', err));

// Populate main Officials tab
function populateOfficials(data) {
  const container = document.getElementById('officials-container');
  container.innerHTML = '';
  data.forEach(item => {
    const card = createCard(item);
    container.appendChild(card);
  });
}

// Create a single card
function createCard(item) {
  const card = document.createElement('article');
  card.className = 'card';

  const img = document.createElement('img');
  img.src = item.photo || 'assets/default-photo.png';
  img.alt = item.name;
  img.className = 'card-photo';

  const name = document.createElement('h3');
  name.textContent = item.name;

  const office = document.createElement('p');
  office.textContent = item.office;

  card.appendChild(img);
  card.appendChild(name);
  card.appendChild(office);

  card.addEventListener('click', () => openModal(item));

  return card;
}

// Open modal with full information
function openModal(item) {
  const modal = document.getElementById('modal');
  modal.querySelector('.modal-title').textContent = item.name;
  modal.querySelector('.modal-photo').src = item.photo || 'assets/default-photo.png';
  modal.querySelector('.modal-office').textContent = item.office || '';
  modal.querySelector('.modal-party').textContent = item.party || '';
  modal.querySelector('.modal-state').textContent = item.state || '';
  modal.querySelector('.modal-platform').textContent = item.platform || 'No platform info';

  const socialContainer = modal.querySelector('.modal-social');
  socialContainer.innerHTML = '';
  for (const [key, value] of Object.entries(item.social || {})) {
    if (value) {
      const a = document.createElement('a');
      a.href = value;
      a.target = '_blank';
      a.textContent = key.charAt(0).toUpperCase() + key.slice(1);
      socialContainer.appendChild(a);
    }
  }

  modal.style.display = 'block';
}

// Close modal
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// Rankings logic (placeholder)
function populateRankings(governorsData) {
  // Sort by approval descending, then disapproval ascending, then "don't know" ascending
  governorsData.sort((a, b) => {
    if ((b.approval || 0) !== (a.approval || 0)) return (b.approval || 0) - (a.approval || 0);
    if ((a.disapproval || 0) !== (b.disapproval || 0)) return (a.disapproval || 0) - (b.disapproval || 0);
    return (a.unknown || 0) - (b.unknown || 0);
  });

  const top10 = governorsData.slice(0, 10);
  const bottom10 = governorsData.slice(-10);

  const topContainer = document.getElementById('top-rankings');
  const bottomContainer = document.getElementById('bottom-rankings');
  topContainer.innerHTML = '';
  bottomContainer.innerHTML = '';

  top10.forEach(g => topContainer.appendChild(createRankingCard(g, 'green')));
  bottom10.forEach(g => bottomContainer.appendChild(createRankingCard(g, 'red')));
}

// Create a small ranking card
function createRankingCard(item, color) {
  const card = document.createElement('div');
  card.className = 'ranking-card';
  card.style.borderColor = color;

  const name = document.createElement('span');
  name.textContent = item.name;

  const approval = document.createElement('span');
  approval.textContent = `Approval: ${item.approval || 'N/A'}%`;

  card.appendChild(name);
  card.appendChild(approval);

  card.addEventListener('click', () => openModal(item));

  return card;
}

// Example: Populate Governors rankings when Rankings tab is selected
document.getElementById('rankings-tab').addEventListener('click', () => {
  const governors = allData.filter(o => o.office === 'Governor');
  populateRankings(governors);
});

// Calendar links
const calendarLinks = {
  'National General Election': 'https://www.usa.gov/election',
  'State Elections': 'https://www.nass.org/elections',
  'Runoff Elections': 'https://www.nass.org/elections',
  'Town Halls': 'https://www.congress.gov/events',
};
function populateCalendar() {
  const container = document.getElementById('calendar-links');
  container.innerHTML = '';
  for (const [name, url] of Object.entries(calendarLinks)) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.textContent = name;
    container.appendChild(a);
  }
}

// Registration links
const registrationLinks = {
  'Register to Vote': 'https://www.nass.org/can-I-vote',
  'Check Registration Status': 'https://www.vote.org/am-i-registered-to-vote/',
  'Deadlines': 'https://www.nass.org/can-I-vote',
  'Find Your Polling Place': 'https://www.nass.org/can-I-vote',
  'Vote by Mail/Request Absentee Ballot': 'https://www.vote.org/absentee-vote/',
  'Early Voting': 'https://www.nass.org/can-I-vote',
  'Volunteer/Become a Poll Worker': 'https://www.nass.org/can-I-vote',
};
function populateRegistration() {
  const container = document.getElementById('registration-links');
  container.innerHTML = '';
  for (const [name, url] of Object.entries(registrationLinks)) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.textContent = name;
    container.appendChild(a);
  }
}

// Initialize Calendar & Registration tabs
document.getElementById('calendar-tab').addEventListener('click', populateCalendar);
document.getElementById('registration-tab').addEventListener('click', populateRegistration);

// Close modal if clicking outside
window.addEventListener('click', e => {
  const modal = document.getElementById('modal');
  if (e.target === modal) modal.style.display = 'none';
});
