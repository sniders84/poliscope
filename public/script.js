(() => {
  let selectedState = '';
  let currentTab = 'my-officials';
  const dataCache = {};
  const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  async function loadData(file) {
    if (dataCache[file]) return dataCache[file];
    try {
      const response = await fetch(file);
      const data = await response.json();
      dataCache[file] = data;
      return data;
    } catch (error) {
      console.error(`Error loading ${file}:`, error);
      return [];
    }
  }

  function calculateRankings(officials) {
    return officials
      .filter(official => official.pollingScore && official.pollingScore !== 'N/A')
      .map(official => {
        const scoreMatch = String(official.pollingScore).match(/[\d.]+/);
        const score = scoreMatch ? parseFloat(scoreMatch[0]) : 0;

        const disapprovalMatch = String(official.disapprovalRating || '0').match(/[\d.]+/);
        const disapproval = disapprovalMatch ? parseFloat(disapprovalMatch[0]) : 0;

        const dontKnowMatch = String(official.dontKnow || '0').match(/[\d.]+/);
        const dontKnow = dontKnowMatch ? parseFloat(dontKnowMatch[0]) : 0;

        return {
          ...official,
          approvalScore: score,
          disapprovalScore: disapproval,
          dontKnowScore: dontKnow
        };
      })
      .sort((a, b) => {
        if (b.approvalScore !== a.approvalScore) {
          return b.approvalScore - a.approvalScore;
        }
        if (a.disapprovalScore !== b.disapprovalScore) {
          return a.disapprovalScore - b.disapprovalScore;
        }
        return a.dontKnowScore - b.dontKnowScore;
      })
      .map((official, index) => ({
        ...official,
        rank: index + 1
      }));
  }

  function createOfficialCard(official, showRank = false) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.src = official.photo || 'https://via.placeholder.com/120';
    img.alt = official.name;
    img.onerror = () => {
      img.style.display = 'none';
    };

    const name = document.createElement('h3');
    name.textContent = official.name;

    const office = document.createElement('p');
    office.textContent = `${official.office} ${official.district ? '(District ' + official.district + ')' : ''}`;

    const state = document.createElement('p');
    state.textContent = `${official.state} • ${official.party}`;

    card.appendChild(img);
    card.appendChild(name);
    card.appendChild(office);
    card.appendChild(state);

    if (showRank && official.rank) {
      const rank = document.createElement('p');
      rank.style.fontWeight = 'bold';
      rank.style.color = '#0055a5';
      rank.textContent = `Rank: #${official.rank}`;
      card.appendChild(rank);
    }

    if (official.pollingScore && official.pollingScore !== 'N/A') {
      const polling = document.createElement('p');
      polling.textContent = `Approval: ${official.pollingScore}`;
      card.appendChild(polling);
    }

    if (official.ballotpediaLink) {
      const link = document.createElement('a');
      link.href = official.ballotpediaLink;
      link.target = '_blank';
      link.textContent = 'View Profile';
      link.style.color = '#0055a5';
      link.style.textDecoration = 'none';
      link.style.fontWeight = 'bold';
      card.appendChild(link);
    }

    return card;
  }

  function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.textAlign = 'left';

    const title = document.createElement('h3');
    title.textContent = event.title;

    const date = document.createElement('p');
    date.textContent = `Date: ${event.date}`;
    date.style.fontWeight = 'bold';

    const link = document.createElement('a');
    link.href = event.link;
    link.target = '_blank';
    link.textContent = 'More Information';
    link.style.color = '#0055a5';
    link.style.textDecoration = 'none';
    link.style.fontWeight = 'bold';

    card.appendChild(title);
    card.appendChild(date);
    card.appendChild(link);

    return card;
  }

  function createResourceCard(title, url) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.textAlign = 'left';

    const heading = document.createElement('h3');
    heading.textContent = title;

    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.textContent = 'Visit Resource';
    link.style.color = '#0055a5';
    link.style.textDecoration = 'none';
    link.style.fontWeight = 'bold';

    card.appendChild(heading);
    card.appendChild(link);

    return card;
  }

  async function renderMyOfficials() {
    const container = document.getElementById('my-cards');
    container.innerHTML = '';

    if (!selectedState) {
      container.innerHTML = '<p>Please select a state to view your officials.</p>';
      return;
    }

    const [governors, ltGovernors, senators, house] = await Promise.all([
      loadData('Governors.json'),
      loadData('LtGovernors.json'),
      loadData('Senate.json'),
      loadData('House.json')
    ]);

    const stateOfficials = [
      ...governors.filter(o => o.state === selectedState),
      ...ltGovernors.filter(o => o.state === selectedState),
      ...senators.filter(o => o.state === selectedState),
      ...house.filter(o => o.state === selectedState)
    ];

    if (stateOfficials.length === 0) {
      container.innerHTML = '<p>No officials found for this state.</p>';
      return;
    }

    stateOfficials.forEach(official => {
      container.appendChild(createOfficialCard(official));
    });
  }

  async function renderCalendar() {
    const container = document.getElementById('calendar-container');
    container.innerHTML = '';

    if (!selectedState) {
      container.innerHTML = '<p>Please select a state to view election dates.</p>';
      return;
    }

    if (!window.stateElectionCalendar || !window.stateElectionCalendar[selectedState]) {
      container.innerHTML = '<p>No election information available for this state.</p>';
      return;
    }

    const events = window.stateElectionCalendar[selectedState];
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';

    events.forEach(event => {
      cardContainer.appendChild(createEventCard(event));
    });

    container.appendChild(cardContainer);
  }

  async function renderRegistration() {
    const container = document.getElementById('voting-container');
    container.innerHTML = '';

    if (!selectedState) {
      container.innerHTML = '<p>Please select a state to view voting information.</p>';
      return;
    }

    if (!window.stateVotingInfo || !window.stateVotingInfo[selectedState]) {
      container.innerHTML = '<p>No voting information available for this state.</p>';
      return;
    }

    const info = window.stateVotingInfo[selectedState];
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';

    const resources = [
      { title: 'Voter Registration', url: info.registration },
      { title: 'Check Voter Status', url: info.voterInfo },
      { title: 'Absentee Voting', url: info.absenteeInfo },
      { title: 'Find Polling Location', url: info.pollingLocations }
    ];

    resources.forEach(resource => {
      cardContainer.appendChild(createResourceCard(resource.title, resource.url));
    });

    container.appendChild(cardContainer);
  }

  async function renderRankings() {
    const governorsContainer = document.getElementById('rankings-governors');
    const ltGovernorsContainer = document.getElementById('rankings-ltgovernors');
    const senatorsContainer = document.getElementById('rankings-senators');
    const houseContainer = document.getElementById('rankings-house');

    governorsContainer.innerHTML = '<p>Loading...</p>';
    ltGovernorsContainer.innerHTML = '<p>Loading...</p>';
    senatorsContainer.innerHTML = '<p>Loading...</p>';
    houseContainer.innerHTML = '<p>Loading...</p>';

    const [governors, ltGovernors, senators, house] = await Promise.all([
      loadData('Governors.json'),
      loadData('LtGovernors.json'),
      loadData('Senate.json'),
      loadData('House.json')
    ]);

    const rankedGovernors = calculateRankings(governors);
    const rankedLtGovernors = calculateRankings(ltGovernors);
    const rankedSenators = calculateRankings(senators);
    const rankedHouse = calculateRankings(house);

    governorsContainer.innerHTML = '';
    rankedGovernors.forEach(official => {
      governorsContainer.appendChild(createOfficialCard(official, true));
    });

    ltGovernorsContainer.innerHTML = '';
    rankedLtGovernors.forEach(official => {
      ltGovernorsContainer.appendChild(createOfficialCard(official, true));
    });

    senatorsContainer.innerHTML = '';
    rankedSenators.forEach(official => {
      senatorsContainer.appendChild(createOfficialCard(official, true));
    });

    houseContainer.innerHTML = '';
    rankedHouse.forEach(official => {
      houseContainer.appendChild(createOfficialCard(official, true));
    });
  }

  function showTab(tabName) {
    document.querySelectorAll('section').forEach(section => {
      section.style.display = 'none';
    });

    const section = document.getElementById(tabName);
    if (section) {
      section.style.display = 'block';
      currentTab = tabName;

      if (tabName === 'my-officials') {
        renderMyOfficials();
      } else if (tabName === 'calendar') {
        renderCalendar();
      } else if (tabName === 'registration') {
        renderRegistration();
      } else if (tabName === 'rankings') {
        renderRankings();
      }
    }
  }

  function initStateSelect() {
    const select = document.getElementById('state-select');
    select.innerHTML = '<option value="">Choose a state</option>';

    US_STATES.forEach(state => {
      const option = document.createElement('option');
      option.value = state;
      option.textContent = state;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      selectedState = e.target.value;
      if (currentTab === 'my-officials') {
        renderMyOfficials();
      } else if (currentTab === 'calendar') {
        renderCalendar();
      } else if (currentTab === 'registration') {
        renderRegistration();
      }
    });
  }

  function initTabs() {
    document.querySelectorAll('#tabs button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.target.textContent.toLowerCase().replace(' ', '-');
        showTab(tabName);
      });
    });
  }

  function init() {
    initStateSelect();
    initTabs();
    showTab('my-officials');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.showTab = showTab;
})();
