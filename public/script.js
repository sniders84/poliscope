// =================== Data Loading ===================
const publicPath = ''; // Your JSON files are in the public folder

let senate = [];
let house = [];
let governors = [];
let ltgovernors = [];
let matchups = [];

// Fetch JSON files
async function loadData() {
  [senate, house, governors, ltgovernors, matchups] = await Promise.all([
    fetch(`${publicPath}/senate.json`).then(res => res.json()),
    fetch(`${publicPath}/house.json`).then(res => res.json()),
    fetch(`${publicPath}/governors.json`).then(res => res.json()),
    fetch(`${publicPath}/ltgovernors.json`).then(res => res.json()),
    fetch(`${publicPath}/matchups.json`).then(res => res.json())
  ]);
}

// =================== Utility Functions ===================
function createCardHTML(official) {
  return `
    <div class="card" data-slug="${official.slug}">
      <img src="${official.photo}" alt="${official.name}">
      <h3>${official.name}</h3>
      <p>${official.office} - ${official.state}</p>
      <p>${official.party}</p>
    </div>
  `;
}

function showModal(official) {
  document.getElementById('modal-photo').src = official.photo;
  document.getElementById('modal-name').innerText = official.name;
  document.getElementById('modal-office').innerText = official.office + ' - ' + official.state;
  document.getElementById('modal-party').innerText = official.party;
  document.getElementById('modal-bio').innerText = official.bio || '';
  document.getElementById('modal-education').innerText = official.education || '';
  document.getElementById('modal-contact').innerText = official.contact?.email || '';
  document.getElementById('modal-platform').innerText = official.platform || '';
  document.getElementById('modal-proposals').innerText = official.proposals || '';
  
  const billsUl = document.getElementById('modal-bills');
  billsUl.innerHTML = '';
  if(official.billsSigned) {
    official.billsSigned.forEach(bill => {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${bill.link}" target="_blank">${bill.title}</a>`;
      billsUl.appendChild(li);
    });
  }
  
  document.getElementById('modal-vetoes').innerText = official.vetoes || '';
  document.getElementById('modal-salary').innerText = official.salary || '';
  document.getElementById('modal-predecessor').innerText = official.predecessor || '';
  document.getElementById('modal-polling').innerText = official.pollingScore || '';
  
  document.getElementById('modal').style.display = 'flex';
}

// Close modal
document.getElementById('modal-close').addEventListener('click', () => {
  document.getElementById('modal').style.display = 'none';
});

// =================== Populate Functions ===================
function populateOfficials(state = '') {
  const container = document.getElementById('officials-cards');
  container.innerHTML = '';
  
  const allOfficials = [...senate, ...house, ...governors, ...ltgovernors];
  const filtered = state ? allOfficials.filter(o => o.state.toLowerCase() === state.toLowerCase()) : allOfficials;
  
  filtered.forEach(official => {
    container.innerHTML += createCardHTML(official);
  });

  addCardClickEvents(container);
}

function populateRankings() {
  document.getElementById('senate-rankings').innerHTML = senate.map(createCardHTML).join('');
  document.getElementById('house-rankings').innerHTML = house.map(createCardHTML).join('');
  document.getElementById('governor-rankings').innerHTML = governors.map(createCardHTML).join('');
  document.getElementById('ltgovernor-rankings').innerHTML = ltgovernors.map(createCardHTML).join('');

  addCardClickEvents(document);
}

function populateMatchups(state = '') {
  const container = document.getElementById('matchups-cards');
  container.innerHTML = '';
  const filtered = state ? matchups.filter(m => m.state.toLowerCase() === state.toLowerCase()) : matchups;
  filtered.forEach(m => container.innerHTML += createCardHTML(m));
  addCardClickEvents(container);
}

function populateRookies() {
  const now = new Date();
  const categories = [
    { data: senate, id: 'rookies-senate' },
    { data: house, id: 'rookies-house' },
    { data: governors, id: 'rookies-governor' },
    { data: ltgovernors, id: 'rookies-ltgovernor' }
  ];
  
  categories.forEach(cat => {
    const container = document.getElementById(cat.id);
    container.innerHTML = '';
    cat.data.filter(o => {
      const start = new Date(o.termStart);
      const end = new Date(o.termEnd);
      return ((end - start)/1000/60/60/24/365.25 <= 6); // 6 years or less
    }).forEach(official => container.innerHTML += createCardHTML(official));
    addCardClickEvents(container);
  });
}

// =================== Card Click Event ===================
function addCardClickEvents(parent) {
  parent.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', () => {
      const slug = card.dataset.slug;
      const allOfficials = [...senate, ...house, ...governors, ...ltgovernors, ...matchups];
      const official = allOfficials.find(o => o.slug === slug);
      if (official) showModal(official);
    });
  });
}

// =================== Tab Switching ===================
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tabId = btn.dataset.tab;
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
  });
});

// =================== Search ===================
document.getElementById('search-officials').addEventListener('input', (e) => {
  populateOfficials(e.target.value);
});

document.getElementById('search-matchups').addEventListener('input', (e) => {
  populateMatchups(e.target.value);
});

// =================== Initialization ===================
async function init() {
  await loadData();
  populateOfficials();
  populateRankings();
  populateMatchups();
  populateRookies();
}

init();
