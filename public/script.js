// === GLOBAL STATE ===
let selectedState = 'North Carolina';
let governors = [], ltGovernors = [], senators = [], houseReps = [], cabinet = [];
let officialsContainer = null, searchBar = null;

// === STATE ALIASES ===
const stateAliases = { "Virgin Islands": "U.S. Virgin Islands" };

// === VOTING TAB ===
function showVoting() {
  showTab('voting');
  const container = document.getElementById('voting-cards');
  if (!container) return;
  container.innerHTML = '';

  const votingData = {
    "North Carolina": {
      register: { url: "https://www.ncsbe.gov/registering", icon: "Register", description: "Register to vote or update your registration online or by mail", deadline: "October 11, 2025" },
      id: { url: "https://www.ncsbe.gov/voting/voter-id", icon: "ID", description: "Review North Carolina's voter ID requirements for in-person voting" },
      absentee: { url: "https://www.ncsbe.gov/voting/vote-mail", icon: "Mail", description: "Request and return your absentee ballot by mail or drop box", deadline: "Request by: October 29, 2025" },
      early: { url: "https://www.ncsbe.gov/voting/early-voting", icon: "Clock", description: "Find early voting locations and hours in your county", deadline: "Starts: October 16, 2025" },
      polling: { url: "https://vt.ncsbe.gov/RegLkup/", icon: "Location", description: "Locate your polling place and Election Day hours", deadline: "Election Day: November 4, 2025" },
      sample: { url: "https://vt.ncsbe.gov/RegLkup/", icon: "Ballot", description: "View your sample ballot and voting instructions" },
      military: { url: "https://www.ncsbe.gov/voting/military-overseas", icon: "Military", description: "Voting options for military and overseas North Carolinians", deadline: "Request by: October 29, 2025" },
      counties: { url: "https://www.ncsbe.gov/about-elections/county-boards-elections", icon: "Building", description: "Contact your county board of elections for local info" },
      tools: { url: "https://vt.ncsbe.gov/RegLkup/", icon: "Tools", description: "Check registration, ballot status, and voting tools" }
    }
  };

  const state = stateAliases[selectedState] || selectedState;
  const data = votingData[state] || {};

  Object.entries(data).forEach(([key, val]) => {
    const card = document.createElement('div');
    card.className = 'voting-card';
    card.innerHTML = `
      <a href="${val.url}" target="_blank">
        <div class="card-icon"><span class="emoji">${val.icon}</span></div>
        <div class="card-label">${val.description.split(' ')[0] + ' ' + val.description.split(' ').slice(1).join(' ')}</div>
        <div class="card-description">${val.description}</div>
        ${val.deadline ? `<div class="card-date">${val.deadline}</div>` : ''}
      </a>
    `;
    container.appendChild(card);
  });
}

// === POLLS TAB ===
function showPolls() {
  showTab('polls');
  const container = document.getElementById('polls-cards');
  if (!container) return;
  container.innerHTML = '<h3>Polls</h3><div class="poll-grid"></div>';
  const grid = container.querySelector('.poll-grid');

  // Your poll sources
  const polls = [
    { source: "RCP", name: "Real Clear Politics", url: "https://realclearpolitics.com", logo: "assets/rcp.png" },
    { source: "270toWin", name: "270toWin", url: "https://270towin.com", logo: "assets/270towin.png" },
    // Add all your logos
  ];

  polls.forEach(p => {
    const card = document.createElement('div');
    card.className = 'poll-card';
    card.innerHTML = `
      <img src="${p.logo}" alt="${p.source}" onerror="this.style.display='none'">
      <p><strong>${p.source}</strong><br><small>${p.name}</small></p>
      <a href="${p.url}" target="_blank">View →</a>
    `;
    grid.appendChild(card);
  });
}
// === CIVIC INTELLIGENCE TAB ===
function showCivic() {
  showTab('civic');
  const container = document.getElementById('civic-container');
  if (!container) return;
  container.innerHTML = '';

  const sections = [
    { title: "State Legislative Links", items: [
      { label: "Bills", desc: "Click to view Bills information for North Carolina.", url: "https://www.ncleg.gov/BillLookup" },
      { label: "State Senate", desc: "Click to view State Senate information for North Carolina.", url: "https://www.ncleg.gov/Members/MemberList/S" },
      { label: "State House", desc: "Click to view State House information for North Carolina.", url: "https://www.ncleg.gov/Members/MemberList/H" },
      { label: "governorOrders", desc: "Click to view governorOrders information for North Carolina.", url: "https://governor.nc.gov/executive-orders" },
      { label: "ltGovPress", desc: "Click to view ltGovPress information for North Carolina.", url: "https://ltgov.nc.gov/press-releases" }
    ]},
    { title: "National Governor's Association", items: [
      { label: "NGA Leadership", desc: "Meet the current leadership...", url: "https://www.nga.org/leadership/" },
      { label: "Council of Governors", desc: "Explore the bipartisan Council...", url: "https://www.nga.org/cog/" },
      { label: "Gubernatorial Elections", desc: "Track upcoming...", url: "https://www.nga.org/elections/" },
      { label: "Education Task Force", desc: "See how governors...", url: "https://www.nga.org/education/" },
      { label: "Economic Development", desc: "Review strategies...", url: "https://www.nga.org/economic/" },
      { label: "Public Health", desc: "Understand how...", url: "https://www.nga.org/health/" }
    ]},
    { title: "Federal Oversight & Transparency", items: [
      { label: "Committees", desc: "Explore congressional committees...", url: "https://www.congress.gov/committees" },
      { label: "Legislator Report Cards", desc: "See performance grades...", url: "https://www.heritageaction.com/scorecard" },
      { label: "All Federal Bills", desc: "Track every bill...", url: "https://www.congress.gov/" },
      { label: "Recent Votes", desc: "Review the latest...", url: "https://clerk.house.gov/Votes" },
      { label: "Cabinet", desc: "View members of the President's Cabinet.", url: "#" }
    ]}
  ];

  sections.forEach(sec => {
    const section = document.createElement('div');
    section.innerHTML = `<h3>${sec.title}</h3><div class="civic-grid"></div>`;
    const grid = section.querySelector('.civic-grid');
    sec.items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'civic-card';
      card.innerHTML = `
        <a href="${item.url}" target="_blank">
          <div class="card-label">${item.label}</div>
          <div class="card-description">${item.desc}</div>
        </a>
      `;
      grid.appendChild(card);
    });
    container.appendChild(section);
  });

  // Cabinet Grid
  const cabGrid = document.createElement('div');
  cabGrid.innerHTML = '<h3>Cabinet</h3><div class="official-grid" id="cabinet-grid"></div>';
  container.appendChild(cabGrid);
  renderCabinet();
}

function renderCabinet() {
  const grid = document.getElementById('cabinet-grid');
  if (!grid) return;
  grid.innerHTML = '';
  cabinet.forEach(m => {
    const card = document.createElement('div');
    card.className = 'official-card';
    card.innerHTML = `<div class="card-body">...`; // same as before
    grid.appendChild(card);
  });
}
// === ORGANIZATIONS TAB ===
function showOrganizations() {
  showTab('organizations');
  const container = document.getElementById('orgs-container');
  if (!container) return;
  container.innerHTML = '<div class="org-grid"></div>';
  const grid = container.querySelector('.org-grid');

  const orgs = [
    { name: "Turning Point USA", platform: "Promotes capitalism...", logo: "assets/turningpoint.png", url: "https://tpusa.com" },
    { name: "Heritage Action", platform: "Advocacy arm...", logo: "assets/heritageaction.png", url: "https://heritageaction.com" },
    // ... ALL 52 ORGS WITH LOGOS
  ];

  orgs.forEach(org => {
    const card = document.createElement('div');
    card.className = 'org-card';
    card.innerHTML = `
      <img src="${org.logo}" alt="${org.name}" onerror="this.style.display='none'">
      <p><strong>${org.name}</strong></p>
      <p class="platform">${org.platform}</p>
      <a href="${org.url}" target="_blank">Visit Website</a>
    `;
    grid.appendChild(card);
  });
}

// === DOM READY ===
document.addEventListener('DOMContentLoaded', () => {
  // Populate state dropdown
  const states = ["Alabama", "Alaska", /* ... */ "North Carolina"];
  const dropdown = document.getElementById('state-dropdown');
  states.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    if (s === 'North Carolina') opt.selected = true;
    dropdown.appendChild(opt);
  });

  // Wire controls
  document.getElementById('state-dropdown').onchange = () => {
    selectedState = this.value;
    renderOfficials();
    showVoting();
  };

  // Load data
  Promise.all([
    fetch('governors.json').then(r => r.json()),
    fetch('ltgovernors.json').then(r => r.json()),
    fetch('senators.json').then(r => r.json()),
    fetch('housereps.json').then(r => r.json()),
    fetch('cabinet.json').then(r => r.json())
  ]).then(([g, l, s, h, c]) => {
    governors = g; ltGovernors = l; senators = s; houseReps = h; cabinet = c;
    renderOfficials();
  });
});
