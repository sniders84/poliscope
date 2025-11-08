// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [];
let ltGovernors = [];
let senators = [];
let houseReps = [];
let cabinet = [];
let allOfficials = [];
let officialsContainer = null;
let searchBar = null;

// === MODAL REFS ===
let officialsModal = null;
let officialsModalContent = null;
let officialsModalCloseBtn = null;

// === POLL CATEGORIES (FULL — ALL 4 CATEGORIES, ALL LINKS) ===
const pollCategories = [
  {
    label: 'President',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – Presidential approval index', url: 'https://ballotpedia.org/Ballotpedia%27s_Polling_Index:_Presidential_approval_rating' },
      { source: 'RCP', name: 'RCP – Presidential job approval', url: 'https://www.realclearpolling.com/polls/approval/donald-trump/approval-rating' },
      { source: '270toWin', name: '270toWin – 2028 Republican primary polls', url: 'https://www.270towin.com/2028-republican-nomination/' },
      { source: '270toWin', name: '270toWin – 2028 Democratic primary polls', url: 'https://www.270towin.com/2028-democratic-nomination/' },
      { source: 'Cook Political', name: 'Cook Political Report – Presidential coverage', url: 'https://www.cookpolitical.com/' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – Presidential elections', url: 'https://centerforpolitics.org/crystalball/' },
      { source: 'AP-NORC', name: 'AP-NORC – Polling tracker (approval and key issues)', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'DDHQ', name: 'Decision Desk HQ – Polls averages hub', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Gallup', name: 'Gallup – Presidential job approval topic', url: 'https://news.gallup.com/topic/presidential-job-approval.aspx' },
      { source: 'American Presidency Project', name: 'UCSB – Presidential job approval (Gallup historical)', url: 'https://www.presidency.ucsb.edu/statistics/data/presidential-job-approval-all-data' }
    ]
  },
  {
    label: 'Vice President',
    polls: [
      { source: 'RCP', name: 'RCP – JD Vance favorability', url: 'https://www.realclearpolling.com/polls/favorability/j-d-vance' },
      { source: 'DDHQ', name: 'Decision Desk HQ – Polls averages hub', url: 'https://decisiondeskhq.com/polls/averages/' },
      { source: 'Ballotpedia', name: 'Ballotpedia – Vice presidential candidates', url: 'https://ballotpedia.org/Vice_presidential_candidates,_2024' },
      { source: 'Cook Political', name: 'Cook Political Report – Vice presidential coverage', url: 'https://www.cookpolitical.com/' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – Vice presidential coverage', url: 'https://centerforpolitics.org/crystalball/' },
      { source: 'RaceToWH', name: 'Race to the WH – GOP VP primary tracker', url: 'https://www.racetothewh.com/2024/rep' },
      { source: 'RaceToWH', name: 'Race to the WH – Democratic VP primary tracker', url: 'https://www.racetothewh.com/2024/dem' },
      { source: 'AP-NORC', name: 'AP-NORC – Polling tracker (issues/approval context)', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'NBC Tracker', name: 'NBC – Presidential candidates tracker context', url: 'https://www.nbcnews.com/politics/2024-elections/presidential-candidates-tracker' },
      { source: 'ABC Explainer', name: 'ABC News – How primaries work explainer', url: 'https://abcnews.go.com/Politics/2024-republican-democratic-presidential-primaries-caucuses-work/story?id=106765290' }
    ]
  },
  {
    label: 'Governor',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – 2025 governor elections', url: 'https://ballotpedia.org/Gubernatorial_elections,_2025' },
      { source: 'RCP', name: 'RCP – Governor polls', url: 'https://www.realclearpolling.com/latest-polls/governor' },
      { source: 'DDHQ', name: 'DDHQ – Virginia governor general ballot test average', url: 'https://polls.decisiondeskhq.com/averages/general-ballot-test/2025-virginia-governor/virginia/lv-rv-adults' },
      { source: '270toWin', name: '270toWin – Latest 2026 governor polls', url: 'https://www.270towin.com/polls/latest-2026-governor-election-polls/' },
      { source: 'Cook Political', name: 'Cook Political Report – Governor ratings', url: 'https://www.cookpolitical.com/ratings/governor-race-ratings' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – 2026 governor elections', url: 'https://centerforpolitics.org/crystalball/2026-governor/' },
      { source: 'AP-NORC', name: 'AP-NORC – Polling tracker (issues/approval context)', url: 'https://apnews.com/projects/polling-tracker/' },
      { source: 'Decision Night', name: 'DDHQ – Election night results hub', url: 'https://election-night.decisiondeskhq.com/date/2025-11-04' },
      { source: 'DDHQ Results', name: 'DDHQ – 2025 Virginia results hub', url: 'https://decisiondeskhq.com/results/2025/General/Virginia/' },
      { source: 'The 19th', name: 'The 19th – Virginia governor overview', url: 'https://19thnews.org/2025/06/virginia-elections-spanberger-earle-sears-primary-governor/' }
    ]
  },
  {
    label: 'U.S. Senate',
    polls: [
      { source: 'Ballotpedia', name: 'Ballotpedia – 2026 Senate elections', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026' },
      { source: 'RCP', name: 'RCP – Latest Senate polls', url: 'https://www.realclearpolling.com/latest-polls/senate' },
      { source: '270toWin', name: '270toWin – Latest 2026 Senate polls', url: 'https://www.270towin.com/polls/latest-2026-senate-election-polls/' },
      { source: 'Cook Political', name: 'Cook Political Report – 2026 Senate ratings', url: 'https://www.cookpolitical.com/ratings/senate-race-ratings' },
      { source: 'Sabato', name: 'Sabato’s Crystal Ball – 2026 Senate races', url: 'https://centerforpolitics.org/crystalball/2026-senate/' }
    ]
  }
];

// === POLL LOGO MAP (ALL 15) ===
const pollLogoMap = {
  'Ballotpedia': 'ballotpedia.png',
  'RCP': 'rcp.png',
  '270toWin': '270towin.png',
  'Cook Political': 'cookpolitical.png',
  'Sabato': 'sabato.png',
  'AP-NORC': 'apnorc.png',
  'DDHQ': 'ddhq.png',
  'Gallup': 'gallup.png',
  'American Presidency Project': 'default-photo.png',
  'RaceToWH': 'racetowh.png',
  'NBC Tracker': 'default-photo.png',
  'ABC Explainer': 'default-photo.png',
  'Decision Night': 'ddhq.png',
  'DDHQ Results': 'ddhq.png',
  'The 19th': 'default-photo.png'
};

// === TAB SWITCHER ===
function showTab(id) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
  const el = document.getElementById(id);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab[onclick="showTab('${id}')"]`)?.classList.add('active');
}

// === RENDER OFFICIALS (FEDERAL + STATE) ===
function renderOfficials(stateFilter = selectedState, query = '') {
  showTab('my-officials');
  if (!officialsContainer) officialsContainer = document.getElementById('officials-container');
  if (!officialsContainer) return;
  officialsContainer.innerHTML = '';

  const queryLower = query.toLowerCase();
  const filterByState = query === '';

  const stateGovs = governors.filter(o => !filterByState || o.state === stateFilter);
  const stateLtGovs = ltGovernors.filter(o => !filterByState || o.state === stateFilter);
  const stateSens = senators.filter(o => !filterByState || o.state === stateFilter);
  const stateReps = houseReps
    .filter(o => !filterByState || o.state === stateFilter)
    .sort((a, b) => parseInt(a.district) - parseInt(b.district));

  const stateOfficials = [...stateGovs, ...stateLtGovs, ...stateSens, ...stateReps];

  const federalOfficials = allOfficials.filter(o => o.state === 'United States' || o.office === 'President' || o.office === 'Vice President');

  const displayOfficials = [...federalOfficials, ...stateOfficials].filter(o =>
    !queryLower ||
    (o.name || '').toLowerCase().includes(queryLower) ||
    (o.office || '').toLowerCase().includes(queryLower)
  );

  const partyMap = {
    republican: 'Republican', democrat: 'Democratic', democratic: 'Democratic',
    independent: 'Independent', green: 'Green', libertarian: 'Libertarian',
    constitution: 'Constitution', 'working families': 'WorkingFamilies',
    workingfamilies: 'WorkingFamilies', progressive: 'Progressive'
  };

  const safeYear = d => {
    if (!d || (typeof d === 'string' && d.trim() === '')) return '';
    const dt = new Date(d);
    return isNaN(dt) ? '' : dt.getFullYear();
  };

  displayOfficials.forEach(o => {
    const rawParty = (o.party || '').toLowerCase().trim();
    const normalizedParty = partyMap[rawParty] || rawParty.replace(/\s+/g, '') || 'Independent';
    const photoSrc = o.photo && o.photo.trim() !== '' ? o.photo : 'assets/default-photo.png';

    const districtDisplay = o.office === 'U.S. Representative' && o.district
      ? `<p class="district-display"><strong>District:</strong> ${o.district}</p>`
      : '';

    const startYear = safeYear(o.termStart);
    const endYear = safeYear(o.termEnd) || 'Present';
    const termDisplay = (startYear || endYear) ? `${startYear}–${endYear}` : 'Present';

    const card = document.createElement('div');
    card.className = 'official-card';
    card.setAttribute('data-party', normalizedParty);

    card.innerHTML = `
      <div class="party-stripe"></div>
      <div class="card-body">
        <div class="photo-wrapper">
          <img src="${photoSrc}" alt="${o.name}"
               onerror="this.onerror=null;this.src='assets/default-photo.png';" />
        </div>
        <div class="official-info">
          <h3>${o.name || 'Unknown'}</h3>
          <p><strong>Position:</strong> ${o.office || 'N/A'}</p>
          ${districtDisplay}
          <p><strong>State:</strong> ${o.state || 'United States'}</p>
          <p><strong>Term:</strong> ${termDisplay}</p>
          <p><strong>Party:</strong> ${o.party || 'N/A'}</p>
        </div>
      </div>
    `;
    card.addEventListener('click', () => openOfficialModal(o));
    officialsContainer.appendChild(card);
  });
}

// === OPEN OFFICIAL MODAL ===
function openOfficialModal(o) {
  const modal = document.getElementById('officials-modal');
  const content = document.getElementById('officials-content');
  if (!modal || !content) return;

  const photo = o.photo ? `<img src="${o.photo}" alt="${o.name}" onerror="this.src='assets/default-photo.png';">` : '';
  const district = o.district ? `<p><strong>District:</strong> ${o.district}</p>` : '';
  const term = o.termStart ? `${new Date(o.termStart).getFullYear()}–${o.termEnd ? new Date(o.termEnd).getFullYear() : 'Present'}` : 'Present';

  content.innerHTML = `
    <div class="modal-photo">${photo}</div>
    <h2>${o.name}</h2>
    <p><strong>Position:</strong> ${o.office}</p>
    ${district}
    <p><strong>State:</strong> ${o.state}</p>
    <p><strong>Term:</strong> ${term}</p>
    <p><strong>Party:</strong> ${o.party}</p>
  `;
  modal.style.display = 'block';
}

// === CLOSE MODAL ===
function closeModalWindow(id) {
  const m = document.getElementById(id);
  if (m) m.style.display = 'none';
}

// === RENDER POLLS ===
function showPolls() {
  showTab('polls');
  const container = document.getElementById('polls-cards');
  if (!container) return;
  container.innerHTML = '';

  pollCategories.forEach(cat => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.innerHTML = `<h3>${cat.label}</h3><div class="poll-links"></div>`;
    const links = card.querySelector('.poll-links');

    cat.polls.forEach(p => {
      const logo = pollLogoMap[p.source] || 'default-photo.png';
      const a = document.createElement('a');
      a.href = p.url; a.target = '_blank';
      a.innerHTML = `<img src="assets/${logo}" alt="${p.source}" onerror="this.src='assets/default-photo.png'"> ${p.name}`;
      links.appendChild(a);
    });

    container.appendChild(card);
  });
}

// === STUBS FOR OTHER TABS (you fill) ===
function showOrganizations() { showTab('organizations'); }
function showVoting() { showTab('voting'); }
function showCivic() { showTab('civic'); }

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {
  officialsContainer = document.getElementById('officials-container');
  searchBar = document.getElementById('search-bar');
  officialsModalCloseBtn = document.getElementById('close-modal');

  if (officialsModalCloseBtn) {
    officialsModalCloseBtn.onclick = () => closeModalWindow('officials-modal');
  }

  document.getElementById('state-dropdown').onchange = (e) => {
    selectedState = e.target.value;
    renderOfficials();
  };

  searchBar.oninput = () => renderOfficials(selectedState, searchBar.value);

  // LOAD ALL DATA
  Promise.all([
    fetch('governors.json').then(r => r.json()),
    fetch('ltgovernors.json').then(r => r.json()),
    fetch('senators.json').then(r => r.json()),
    fetch('housereps.json').then(r => r.json()),
    fetch('cabinet.json').then(r => r.json())
  ]).then(([g, l, s, h, c]) => {
    governors = g; ltGovernors = l; senators = s; houseReps = h; cabinet = c;
    allOfficials = [...c]; // President/VP from cabinet.json
    renderOfficials();
  }).catch(err => {
    console.error('Load failed:', err);
    officialsContainer.innerHTML = '<p style="color:red">Error loading data.</p>';
  });
});
