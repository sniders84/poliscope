(() => {
  const FILE_MAP = {
    Governors: 'Governors.json',
    Senate: 'Senate.json',
    House: 'House.json',
    LtGovernors: 'LtGovernors.json'
  };

  const datasets = {};
  const datasetSelect = document.getElementById('datasetSelect');
  const grid = document.getElementById('grid');
  const expandBtn = document.getElementById('expandBtn');
  const calendarWrap = document.getElementById('calendarWrap');
  const registrationWrap = document.getElementById('registrationWrap');

  let fullGovernorList = [];

  window.showTab = function(name) {
    datasetSelect.value = name;
    renderTab(name);
  };

  async function loadDataset(name) {
    if (!FILE_MAP[name]) return [];
    if (datasets[name]) return datasets[name];

    try {
      const res = await fetch(FILE_MAP[name], { cache: 'no-store' });
      const json = await res.json();
      datasets[name] = Array.isArray(json) ? json : [];
      return datasets[name];
    } catch (err) {
      console.error(`Failed to load ${name}:`, err);
      return [];
    }
  }

  function createMiniCard(item, rank) {
    const card = document.createElement('div');
    card.className = 'mini-card';
    if (rank <= 10) card.classList.add('top');
    if (rank > fullGovernorList.length - 10) card.classList.add('bottom');

    card.innerHTML = `
      <div class="rank-badge">#${rank}</div>
      <div class="name">${item.name}</div>
      <div class="meta">${item.state} • ${item.party}</div>
      <div class="polling">
        👍 ${item.approvalPercent}% • 👎 ${item.disapprovalPercent}% • ❔ ${item.dkPercent}%
      </div>
    `;
    return card;
  }

  function sortGovernors(data) {
    return [...data].sort((a, b) => {
      if (b.approvalPercent !== a.approvalPercent)
        return b.approvalPercent - a.approvalPercent;
      if (a.disapprovalPercent !== b.disapprovalPercent)
        return a.disapprovalPercent - b.disapprovalPercent;
      return a.dkPercent - b.dkPercent;
    });
  }

  function renderRankings(data) {
    grid.innerHTML = '';
    fullGovernorList = sortGovernors(data);

    const top10 = fullGovernorList.slice(0, 10);
    const bottom10 = fullGovernorList.slice(-10);

    const topWrap = document.createElement('div');
    topWrap.className = 'rank-section';
    topWrap.innerHTML = `<h2>Top 10 Governors</h2>`;
    top10.forEach((item, i) => topWrap.appendChild(createMiniCard(item, i + 1)));

    const bottomWrap = document.createElement('div');
    bottomWrap.className = 'rank-section';
    bottomWrap.innerHTML = `<h2>Bottom 10 Governors</h2>`;
    bottom10.forEach((item, i) => bottomWrap.appendChild(createMiniCard(item, fullGovernorList.length - 9 + i)));

    grid.appendChild(topWrap);
    grid.appendChild(bottomWrap);

    expandBtn.classList.remove('hidden');
  }

  function expandFullRankings() {
    const fullWrap = document.createElement('div');
    fullWrap.className = 'rank-section';
    fullWrap.innerHTML = `<h2>Full Rankings</h2>`;
    fullGovernorList.forEach((item, i) => fullWrap.appendChild(createMiniCard(item, i + 1)));
    grid.appendChild(fullWrap);
    expandBtn.classList.add('hidden');
  }

  async function renderTab(name) {
    grid.innerHTML = '';
    expandBtn.classList.add('hidden');
    calendarWrap.classList.add('hidden');
    registrationWrap.classList.add('hidden');

    if (name === 'Governors') {
      const data = await loadDataset(name);
      renderRankings(data);
    } else if (name === 'Calendar') {
      calendarWrap.classList.remove('hidden');
    } else if (name === 'Registration') {
      registrationWrap.classList.remove('hidden');
    } else {
      const data = await loadDataset(name);
      grid.innerHTML = `<div class="message">Loaded ${data.length} entries for ${name}.</div>`;
    }
  }

  expandBtn.addEventListener('click', expandFullRankings);

  document.addEventListener('DOMContentLoaded', async () => {
    await renderTab(datasetSelect.value);
  });
})();
